import { toVideoId, searchRaw } from "@/shared/youtube";
import { findCatalogMatch } from "@/shared/media/matching";
import type { PlayableTrack } from "./playbackStream";

const matchedVideoIds = new Map<string, string>();
const failedVideoIds = new Set<string>();

export function clearYoutubeStandInCache(): void {
  matchedVideoIds.clear();
  failedVideoIds.clear();
}

export function reportFailedYoutubeStandIn(
  trackId: string,
  videoId: string,
): void {
  failedVideoIds.add(videoId);
  if (matchedVideoIds.get(trackId) === videoId) {
    matchedVideoIds.delete(trackId);
  }
}

export async function findYoutubeStandIn(
  track: PlayableTrack,
  signal?: AbortSignal,
): Promise<string | null> {
  const remembered = matchedVideoIds.get(track.id);
  if (remembered) {
    if (!failedVideoIds.has(remembered)) return remembered;
    matchedVideoIds.delete(track.id);
  }
  const artist = track.artists.trim();
  if (!track.title.trim()) return null;

  try {
    const outcome = await findCatalogMatch(
      {
        sourceId: track.id,
        title: track.title,
        artists: artist ? [artist] : [],
        ...(track.durationMs > 0 ? { durationMs: track.durationMs } : {}),
      },
      signal,
    );
    if (outcome.status === "approved") {
      const videoId = toVideoId(outcome.track.id);
      if (videoId && !failedVideoIds.has(videoId)) {
        matchedVideoIds.set(track.id, videoId);
        return videoId;
      }
    }
  } catch {
    // continue to searchRaw fallback
  }

  // Fallback: search YouTube directly and pick the first non-failed video result
  try {
    const query = artist ? `${track.title} ${artist}` : track.title;
    const results = await searchRaw(query, undefined, signal);
    for (const item of results) {
      if (item.type === "track") {
        const vid = toVideoId(item.id);
        if (vid && !failedVideoIds.has(vid)) {
          matchedVideoIds.set(track.id, vid);
          return vid;
        }
      }
    }
  } catch {
    // search failed or aborted
  }

  return null;
}
