import { useEffect, useState } from "react";
import { MusicNote, PlaybackSpeed } from "@solar-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import { useCoverReady, CoverImage } from "@/features/covers";
import { cn } from "@/shared/lib";
import { usePlayerStore } from "../store/playerStore";
import { VolumePicker } from "./VolumePicker";
import { FullscreenTrackInfo } from "./FullscreenTrackInfo";
import { FullscreenTimeline } from "./FullscreenTimeline";
import { FullscreenTransportControls } from "./FullscreenTransportControls";
import { SpeedPitchPicker } from "./SpeedPitchPicker";
import {
  BASE_COLUMN_WIDTH,
  fullscreenColumnScale,
} from "../lib/fullscreenScale";
import { useWindowState } from "@/features/navigation/hooks/useWindowState";

function useFullscreenColumnScale(): number {
  const { isEdgeToEdge } = useWindowState();
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!isEdgeToEdge) {
      setScale(1);
      return;
    }
    const update = () =>
      setScale(fullscreenColumnScale(window.innerWidth, window.innerHeight));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [isEdgeToEdge]);

  return scale;
}

interface PlayerUiElementsProps {
  onDuration?: (duration: number) => void;
  onClose?: () => void;
}

export function PlayerUiElements({ onClose }: PlayerUiElementsProps) {
  const [speedOpen, setSpeedOpen] = useState(false);
  const track = usePlayerStore((s) => s.currentTrack);
  const playbackRate = usePlayerStore((s) => s.playbackRate ?? 1);
  const pitchSemitones = usePlayerStore((s) => s.pitchSemitones ?? 0);
  const isReverbEnabled = usePlayerStore((s) => s.isReverbEnabled ?? false);
  const coverUrl = track?.coverUrl || "";
  const isCoverLoaded = useCoverReady(coverUrl);
  const scale = useFullscreenColumnScale();
  const scaled = scale > 1;

  return (
    <div
      className={cn(
        "flex w-full max-w-[340px] md:max-w-none flex-col items-stretch",
        !scaled && "w-[min(340px,86vw,calc(100vh-280px))] md:w-[min(340px,32vw,calc(100vh-340px))]",
      )}
      style={
        scaled ? { width: Math.round(BASE_COLUMN_WIDTH * scale) } : undefined
      }
    >
      <div className="relative">
        <div
          data-ambient-hole
          className={cn(
            "relative aspect-square w-full shrink-0 overflow-hidden rounded-xl bg-black/20",
            coverUrl && !isCoverLoaded && "animate-pulse",
          )}
        >
          <AnimatePresence initial={false}>
            <motion.div
              key={track?.id || coverUrl || "empty"}
              initial={{ opacity: 0, filter: "blur(8px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, filter: "blur(8px)" }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute inset-0"
            >
              {coverUrl ? (
                <CoverImage
                  key={coverUrl}
                  src={coverUrl}
                  alt={track?.title || ""}
                  fill
                  sizes={`${Math.round(BASE_COLUMN_WIDTH * scale)}px`}
                  priority
                  unoptimized
                  className="rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-white/5 text-white/40">
                  <MusicNote size={64} />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-[24px]">
        <FullscreenTrackInfo onClose={onClose} />
      </div>

      <div className="mt-[22px]">
        <FullscreenTimeline />
      </div>

      <div className="mt-[20px]">
        <FullscreenTransportControls />
      </div>

      <div className="mt-[20px] flex items-center justify-between gap-3 px-1">
        <button
          type="button"
          onClick={() => setSpeedOpen((prev) => !prev)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/20 text-white text-[12px] font-medium transition-all backdrop-blur-md cursor-pointer ${
            Math.abs(playbackRate - 1) > 0.01 || Math.abs(pitchSemitones) > 0.1 || isReverbEnabled
              ? "bg-amber-500/30 border-amber-400/60 text-amber-300 font-semibold shadow-lg"
              : "bg-white/10 hover:bg-white/20"
          }`}
        >
          <PlaybackSpeed size={16} weight="Bold" />
          <span>
            {Math.abs(playbackRate - 1) > 0.01
              ? `x${playbackRate.toFixed(2)}`
              : isReverbEnabled
                ? "Reverb"
                : "Speed / Pitch"}
          </span>
        </button>

        <VolumePicker
          className="w-[45%]"
          size="sm"
          iconSize={20}
          iconClassName="text-white opacity-80 hover:opacity-100"
        />
      </div>

      <AnimatePresence>
        {speedOpen && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-x-4 bottom-8 z-[100] max-w-[340px] mx-auto rounded-[20px] p-4 bg-[#141416]/95 border border-white/15 backdrop-blur-3xl shadow-2xl text-left"
          >
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
              <span className="text-[14px] font-semibold text-white">Speed, Pitch & Reverb</span>
              <button
                type="button"
                onClick={() => setSpeedOpen(false)}
                className="text-[12px] text-white/70 hover:text-white px-2.5 py-1 rounded-md bg-white/10 border-0 cursor-pointer"
              >
                Done
              </button>
            </div>
            <SpeedPitchPicker onClose={() => setSpeedOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default PlayerUiElements;
