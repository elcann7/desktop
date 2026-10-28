import { useEffect } from "react";
import { playerEngine } from "@/features/player/engine/playerEngine";
import { usePlayerStore } from "@/features/player/store/playerStore";
import { api, toClientTrack } from "@/shared/api";
import { toVolumeGain, toVolumeLevel } from "@/features/player/engine/volume";
import { notifyLibraryChanged } from "@/features/library/hooks/usePlaylists";
import { searchRaw } from "@/shared/youtube";
import type { Track } from "@/shared/types";

export function useMcpSync() {
  useEffect(() => {
    const syncState = () => {
      const state = usePlayerStore.getState();
      const currentTrack = state.currentTrack;

      window.linerElectron?.mcpUpdateState?.({
        status: state.status,
        track: currentTrack
          ? {
              id: currentTrack.id,
              title: currentTrack.title,
              artist: currentTrack.artists,
              album: currentTrack.album?.title,
              coverUrl: currentTrack.coverUrl,
              durationMs: state.durationMs,
            }
          : null,
        positionMs: state.positionMs,
        durationMs: state.durationMs,
        volume: Math.round(toVolumeLevel(state.volume) * 100) / 100,
        shuffle: state.shuffle,
        repeat: state.repeat,
      });
    };

    syncState();
    return usePlayerStore.subscribe(syncState);
  }, []);

  useEffect(() => {
    window.__LINER_MCP__ = {
      controlPlayback: async (action: string, value?: unknown) => {
        switch (action) {
          case "play":
            await playerEngine.resume();
            return "Playback resumed";
          case "pause":
            playerEngine.pause();
            return "Playback paused";
          case "toggle":
            await playerEngine.togglePlayPause();
            return "Playback toggled";
          case "next":
            await playerEngine.skipNext();
            return "Skipped to next track";
          case "previous":
            await playerEngine.skipPrevious();
            return "Skipped to previous track";
          case "seek":
            if (typeof value === "number") {
              playerEngine.seek(value);
              return `Seeked to ${value}ms`;
            }
            break;
          case "volume":
            if (typeof value === "number") {
              const clamped = Math.max(0, Math.min(1, value));
              playerEngine.setVolume(toVolumeGain(clamped));
              return `Volume set to ${Math.round(clamped * 100)}%`;
            }
            break;
          case "shuffle":
            playerEngine.setShuffle(Boolean(value));
            return `Shuffle set to ${Boolean(value)}`;
          case "repeat":
            if (value === "off" || value === "all" || value === "one") {
              playerEngine.setRepeat(value);
              return `Repeat mode set to ${value}`;
            }
            break;
        }
        return `Action ${action} executed`;
      },

      searchTracks: async (query: string, limit = 10) => {
        if (query.startsWith("__ACTION__:")) {
          try {
            const parsed = JSON.parse(query.slice("__ACTION__:".length));
            if (parsed.type === "renamePlaylist") {
              await api.updatePlaylist(parsed.id, {
                title: parsed.title,
                description: parsed.description,
              });
              window.dispatchEvent(new Event("library:changed"));
              return [
                {
                  id: parsed.id,
                  title: parsed.title,
                  artist: "RENAME_OK",
                  durationMs: 0,
                },
              ];
            }
          } catch (error: any) {
            console.error("[mcp] Action error:", error);
            return [
              {
                id: "error",
                title: String(error?.message || error),
                artist: "ERROR",
                durationMs: 0,
              },
            ];
          }
        }
        try {
          const raw = await searchRaw(query, "track");
          const tracks = raw
            .filter(
              (item): item is Extract<typeof item, { type: "track" }> =>
                item.type === "track",
            )
            .slice(0, limit)
            .map((item) => {
              const client = toClientTrack(item);
              return {
                id: client.id,
                title: client.title,
                artist: client.artists,
                album: client.album?.title,
                durationMs: client.durationMs,
                coverUrl: client.coverUrl,
              };
            });
          return tracks;
        } catch (error) {
          console.error("[mcp] Search failed:", error);
          return [];
        }
      },

      playTrack: async (input: { query?: string; trackId?: string }) => {
        let trackToPlay: Track | null = null;

        if (input.trackId) {
          const raw = await searchRaw(input.trackId, "track");
          const match = raw.find(
            (item) => item.type === "track" && item.id === input.trackId,
          );
          if (match && match.type === "track") {
            trackToPlay = toClientTrack(match);
          }
        }

        if (!trackToPlay && input.query) {
          const raw = await searchRaw(input.query, "track");
          const match = raw.find((item) => item.type === "track");
          if (match && match.type === "track") {
            trackToPlay = toClientTrack(match);
          }
        }

        if (!trackToPlay) {
          return "No track found matching request";
        }

        await playerEngine.playTrack(trackToPlay, [trackToPlay]);
        return `Playing "${trackToPlay.title}" by ${trackToPlay.artists}`;
      },

      queueTrack: async (input: { query?: string; trackId?: string }) => {
        let trackToQueue: Track | null = null;

        if (input.query) {
          const raw = await searchRaw(input.query, "track");
          const match = raw.find((item) => item.type === "track");
          if (match && match.type === "track") {
            trackToQueue = toClientTrack(match);
          }
        }

        if (!trackToQueue) {
          return "No track found to queue";
        }

        const state = usePlayerStore.getState();
        state.setQueue([...state.queue, trackToQueue]);
        return `Queued "${trackToQueue.title}"`;
      },

      listPlaylists: async () => {
        try {
          const res = await api.listPlaylists();
          return res.items.map((p) => ({
            id: p.id,
            title: p.title,
            description: p.description,
            trackCount: p.trackCount,
            updatedAt: p.updatedAt,
          }));
        } catch (error) {
          console.error("[mcp] listPlaylists failed:", error);
          return [];
        }
      },

      getPlaylist: async (playlistId: string) => {
        try {
          const res = await api.getUserPlaylist(playlistId);
          return {
            id: res.playlist.id,
            title: res.playlist.title,
            description: res.playlist.description,
            trackCount: res.items.length,
            tracks: res.items.map((item) => {
              const client = toClientTrack(item.track);
              return {
                itemId: item.id,
                trackId: client.id,
                title: client.title,
                artist: client.artists,
                durationMs: client.durationMs,
              };
            }),
          };
        } catch (error) {
          console.error("[mcp] getPlaylist failed:", error);
          throw error;
        }
      },

      createPlaylist: async (
        title: string,
        description?: string,
        trackIds: string[] = [],
      ) => {
        try {
          const playlist = await api.createPlaylist({
            title,
            description,
            isPublic: true,
          });

          for (const trackId of trackIds) {
            try {
              await api.addPlaylistTrack(playlist.id, trackId);
            } catch {}
          }

          notifyLibraryChanged();

          return {
            status: "success",
            id: playlist.id,
            title: playlist.title,
            addedTracks: trackIds.length,
          };
        } catch (error) {
          console.error("[mcp] createPlaylist failed:", error);
          throw error;
        }
      },

      addToPlaylist: async (playlistId: string, trackId: string) => {
        try {
          const res = await api.addPlaylistTrack(playlistId, trackId);
          notifyLibraryChanged();
          return { status: "success", playlistId, trackId, itemId: res.id };
        } catch (error) {
          console.error("[mcp] addToPlaylist failed:", error);
          throw error;
        }
      },

      removeFromPlaylist: async (playlistId: string, itemId: string) => {
        try {
          await api.removePlaylistItem(playlistId, itemId);
          notifyLibraryChanged();
          return { status: "success", playlistId, itemId };
        } catch (error) {
          console.error("[mcp] removeFromPlaylist failed:", error);
          throw error;
        }
      },
    };

    return () => {
      delete window.__LINER_MCP__;
    };
  }, []);
}
