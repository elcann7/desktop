import { useCallback, useEffect, useState } from "react";
import { PlayFill, ShuffleLine, DeleteLine, Download2Line } from "@mingcute/react";
import { playerEngine } from "@/features/player";
import { useDownloadStore } from "@/features/player/store/downloadStore";
import { linerDb } from "@/shared/storage";
import type { Track } from "@/shared/types";
import { formatPlaybackTime } from "@/features/player/ui/TimelineSlider";

interface DownloadedTracksViewProps {
  searchQuery?: string;
}

export default function DownloadedTracksView({ searchQuery = "" }: DownloadedTracksViewProps) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const downloadedIds = useDownloadStore((s) => s.downloadedTrackIds);
  const deleteDownload = useDownloadStore((s) => s.deleteDownload);

  const loadTracks = useCallback(async () => {
    try {
      setIsLoading(true);
      const list = await linerDb.getAllDownloadedTracks();
      setTracks(list);
    } catch {
      setTracks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTracks();
  }, [loadTracks, downloadedIds.size]);

  const filteredTracks = tracks.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return t.title.toLowerCase().includes(q) || (t.artists && t.artists.toLowerCase().includes(q));
  });

  const handlePlayAll = () => {
    if (filteredTracks.length === 0) return;
    playerEngine.clearQueue();
    void playerEngine.playTrack(filteredTracks[0], filteredTracks, "Yüklənmiş Mahnılar");
  };

  const handleShuffle = () => {
    if (filteredTracks.length === 0) return;
    playerEngine.clearQueue();
    void playerEngine.playShuffled(filteredTracks, "Yüklənmiş Mahnılar");
  };

  const handlePlayTrack = (track: Track) => {
    playerEngine.clearQueue();
    void playerEngine.playTrack(track, filteredTracks, "Yüklənmiş Mahnılar");
  };

  const handleDelete = async (e: React.MouseEvent, trackId: string) => {
    e.stopPropagation();
    await deleteDownload(trackId);
    setTracks((prev) => prev.filter((t) => t.id !== trackId));
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 py-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-[56px] w-full animate-pulse rounded-lg bg-white/5" />
        ))}
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className="flex min-h-[340px] flex-col items-center justify-center gap-4 text-center px-4">
        <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
          <Download2Line size={32} />
        </div>
        <div className="flex flex-col gap-1.5 max-w-[360px]">
          <h3 className="text-[18px] font-semibold text-text-primary">Heç bir mahnı yüklənməyib</h3>
          <p className="text-[13px] text-text-secondary leading-relaxed">
            İstənilən albom və ya mahnını offline rejimdə internetsiz dinləmək üçün yükləmə düyməsini sıxın.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Hero Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-teal-900/20 to-transparent border border-emerald-500/20">
        <div className="flex items-center gap-3.5">
          <div className="h-14 w-14 shrink-0 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-950/50">
            <Download2Line size={28} />
          </div>
          <div>
            <h2 className="text-[18px] font-bold text-white tracking-tight">Yüklənmiş Mahnılar</h2>
            <p className="text-[13px] text-emerald-300/90 font-medium">
              {filteredTracks.length} mahnı · İnternetsiz offline dinləyin
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handlePlayAll}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black font-semibold text-[13.5px] transition-transform cursor-pointer shadow-md"
          >
            <PlayFill size={16} />
            <span>Hamısını oxut</span>
          </button>
          <button
            type="button"
            onClick={handleShuffle}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-white/10 hover:bg-white/15 active:scale-95 text-white font-medium text-[13.5px] transition-transform cursor-pointer"
          >
            <ShuffleLine size={16} />
            <span>Qarışdır</span>
          </button>
        </div>
      </div>

      {/* Tracks List */}
      <div className="flex flex-col divide-y divide-white/5">
        {filteredTracks.map((track, idx) => (
          <div
            key={track.id}
            onClick={() => handlePlayTrack(track)}
            className="group flex items-center justify-between gap-3 p-2.5 rounded-lg hover:bg-white/5 active:bg-white/10 transition-colors cursor-pointer select-none"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-5 text-center text-[12px] text-text-tertiary font-mono">
                {idx + 1}
              </span>
              <div className="relative h-11 w-11 shrink-0 rounded-md overflow-hidden bg-white/10">
                {track.coverUrl ? (
                  <img
                    src={track.coverUrl}
                    alt=""
                    draggable={false}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-text-tertiary">
                    <Download2Line size={18} />
                  </div>
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="truncate text-[14px] font-medium text-text-primary group-hover:text-emerald-400 transition-colors">
                  {track.title}
                </span>
                <span className="truncate text-[12px] text-text-secondary">
                  {track.artists || "Bilinməyən ifaçı"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-[12px] text-text-tertiary tabular-nums">
                {formatPlaybackTime(track.durationMs)}
              </span>
              <button
                type="button"
                title="Yüklənənlərdən sil"
                aria-label="Sil"
                onClick={(e) => handleDelete(e, track.id)}
                className="p-1.5 rounded-full text-text-tertiary hover:text-red-400 hover:bg-red-500/10 active:scale-95 transition-all cursor-pointer"
              >
                <DeleteLine size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
