import { memo } from "react";
import { Download2Line, CheckCircleFill } from "@mingcute/react";
import { useDownloadStore } from "../store/downloadStore";
import type { Track } from "@/shared/types";

export interface PlaylistDownloadButtonProps {
  tracks: Track[];
  playlistId: string;
  className?: string;
}

export const PlaylistDownloadButton = memo(function PlaylistDownloadButton({
  tracks,
  playlistId,
  className = "",
}: PlaylistDownloadButtonProps) {
  const downloadPlaylist = useDownloadStore((s) => s.downloadPlaylist);
  const progress = useDownloadStore((s) => s.playlistProgress[playlistId]);
  const downloadedTrackIds = useDownloadStore((s) => s.downloadedTrackIds);

  const total = tracks.length;
  const downloadedCount = tracks.filter((t) =>
    downloadedTrackIds.has(t.id),
  ).length;
  const isFullyDownloaded = total > 0 && downloadedCount === total;
  const isDownloading = Boolean(progress);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDownloading) return;
    void downloadPlaylist(tracks, playlistId);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDownloading || total === 0}
      title="Download entire playlist / album"
      aria-label="Download all"
      className={`!h-[32px] !rounded-[9px] !border-0 !text-[13px] px-[14px] flex items-center justify-center gap-[7px] shrink-0 font-medium transition-colors cursor-pointer select-none bg-black/[0.05] dark:bg-white/[0.1] hover:bg-black/[0.08] dark:hover:bg-white/[0.15] text-text-primary ${className}`}
    >
      {isDownloading ? (
        <>
          <span className="inline-block size-[14px] rounded-full border-2 border-emerald-400 border-t-transparent animate-spin shrink-0" />
          <span className="text-emerald-400 font-semibold text-[12px]">
            {progress.current}/{progress.total}
          </span>
        </>
      ) : isFullyDownloaded ? (
        <>
          <CheckCircleFill size={16} className="text-emerald-400 shrink-0" />
          <span className="text-emerald-400 font-semibold">Downloaded</span>
        </>
      ) : (
        <>
          <Download2Line size={16} className="shrink-0 text-text-secondary" />
          <span>Download</span>
        </>
      )}
    </button>
  );
});

export default PlaylistDownloadButton;
