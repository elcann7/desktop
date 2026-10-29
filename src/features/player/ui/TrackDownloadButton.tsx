import { memo } from "react";
import { Download2Line, CheckCircleFill } from "@mingcute/react";
import { useDownloadStore } from "../store/downloadStore";
import type { Track } from "@/shared/types";

export interface TrackDownloadButtonProps {
  track: { id: string; title: string; artists?: string; coverUrl?: string; durationMs?: number };
  className?: string;
  size?: number;
}

export const TrackDownloadButton = memo(function TrackDownloadButton({
  track,
  className = "",
  size = 18,
}: TrackDownloadButtonProps) {
  const isDownloaded = useDownloadStore((s) => s.isDownloaded(track.id));
  const isDownloading = useDownloadStore((s) => s.isDownloading(track.id));
  const downloadTrack = useDownloadStore((s) => s.downloadTrack);
  const deleteDownload = useDownloadStore((s) => s.deleteDownload);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isDownloading) return;
    if (isDownloaded) {
      void deleteDownload(track.id);
    } else {
      void downloadTrack(track as any);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={
        isDownloading
          ? "Downloading..."
          : isDownloaded
            ? "Downloaded (click to remove)"
            : "Download for offline listening"
      }
      aria-label="Download"
      className={`shrink-0 inline-flex items-center justify-center p-1 rounded-full transition-transform active:scale-90 bg-transparent border-0 cursor-pointer ${className}`}
    >
      {isDownloading ? (
        <span
          className="inline-block rounded-full border-2 border-emerald-400 border-t-transparent animate-spin"
          style={{ width: size - 2, height: size - 2 }}
        />
      ) : isDownloaded ? (
        <CheckCircleFill size={size} className="text-emerald-400 shrink-0" />
      ) : (
        <Download2Line
          size={size}
          className="text-text-tertiary hover:text-text-primary transition-colors shrink-0"
        />
      )}
    </button>
  );
});

export default TrackDownloadButton;
