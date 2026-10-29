import { create } from "zustand";
import { linerDb, audioCache } from "@/shared/storage";
import { resolvePlaybackStream } from "../engine/streamResolver";
import { downloadAudioBytes } from "@/shared/youtube/innertube/chunkedAudioDownload";
import type { Track } from "@/shared/types";
import { log } from "@/shared/utils/logger";

interface DownloadStoreState {
  downloadedTrackIds: Set<string>;
  downloadingTrackIds: Set<string>;
  playlistProgress: Record<string, { current: number; total: number }>;
  initDownloads: () => Promise<void>;
  isDownloaded: (trackId?: string) => boolean;
  isDownloading: (trackId?: string) => boolean;
  downloadTrack: (track: Track) => Promise<boolean>;
  deleteDownload: (trackId: string) => Promise<void>;
  downloadPlaylist: (tracks: Track[], playlistId: string) => Promise<void>;
}

export const useDownloadStore = create<DownloadStoreState>((set, get) => ({
  downloadedTrackIds: new Set<string>(),
  downloadingTrackIds: new Set<string>(),
  playlistProgress: {},

  initDownloads: async () => {
    try {
      const records = await linerDb.getOldestAudioRecords();
      const ids = new Set(records.map((r) => r.trackId));
      set({ downloadedTrackIds: ids });
    } catch {
      // IndexedDB might not be ready yet
    }
  },

  isDownloaded: (trackId?: string) => {
    if (!trackId) return false;
    return get().downloadedTrackIds.has(trackId);
  },

  isDownloading: (trackId?: string) => {
    if (!trackId) return false;
    return get().downloadingTrackIds.has(trackId);
  },

  downloadTrack: async (track: Track) => {
    if (!track.id) return false;
    const { downloadedTrackIds, downloadingTrackIds } = get();
    if (downloadedTrackIds.has(track.id)) return true;
    if (downloadingTrackIds.has(track.id)) return false;

    set((state) => ({
      downloadingTrackIds: new Set(state.downloadingTrackIds).add(track.id),
    }));

    try {
      const stream = await resolvePlaybackStream(track);
      let blob: Blob | null = stream.blob || null;

      if (!blob && stream.completed) {
        blob = await stream.completed;
      }

      if (!blob && stream.url) {
        const bytes = await downloadAudioBytes(stream.url, {
          contentLength: stream.contentLength,
        });
        if (bytes) {
          blob = new Blob([bytes], { type: stream.mimeType || "audio/webm" });
        }
      }

      if (!blob || blob.size === 0) {
        throw new Error("Failed to retrieve audio stream");
      }

      const mimeType = blob.type || stream.mimeType || "audio/webm";
      await audioCache.saveAudioBlob(track.id, blob, mimeType);
      await linerDb.putTrack(track);

      set((state) => {
        const newDownloaded = new Set(state.downloadedTrackIds);
        newDownloaded.add(track.id);
        const newDownloading = new Set(state.downloadingTrackIds);
        newDownloading.delete(track.id);
        return {
          downloadedTrackIds: newDownloaded,
          downloadingTrackIds: newDownloading,
        };
      });

      log("green", "download", `Downloaded "${track.title}" for offline playback (${Math.round(blob.size / 1024)} KB)`);
      return true;
    } catch (err) {
      log("yellow", "download", `Failed to download "${track.title}":`, err);
      set((state) => {
        const newDownloading = new Set(state.downloadingTrackIds);
        newDownloading.delete(track.id);
        return { downloadingTrackIds: newDownloading };
      });
      return false;
    }
  },

  deleteDownload: async (trackId: string) => {
    try {
      await audioCache.deleteAudio(trackId);
      await linerDb.deleteAudio(trackId);
      set((state) => {
        const newDownloaded = new Set(state.downloadedTrackIds);
        newDownloaded.delete(trackId);
        return { downloadedTrackIds: newDownloaded };
      });
      log("cyan", "download", `Removed offline download for ${trackId}`);
    } catch (err) {
      log("yellow", "download", `Error deleting download ${trackId}:`, err);
    }
  },

  downloadPlaylist: async (tracks: Track[], playlistId: string) => {
    if (!tracks || tracks.length === 0) return;
    const total = tracks.length;
    set((state) => ({
      playlistProgress: {
        ...state.playlistProgress,
        [playlistId]: { current: 0, total },
      },
    }));

    let count = 0;
    for (const track of tracks) {
      await get().downloadTrack(track);
      count += 1;
      set((state) => ({
        playlistProgress: {
          ...state.playlistProgress,
          [playlistId]: { current: count, total },
        },
      }));
    }

    setTimeout(() => {
      set((state) => {
        const next = { ...state.playlistProgress };
        delete next[playlistId];
        return { playlistProgress: next };
      });
    }, 2500);
  },
}));

// Initialize on import
if (typeof window !== "undefined") {
  void useDownloadStore.getState().initDownloads();
}
