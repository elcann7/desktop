import { useState, useRef, useCallback, memo } from "react";
import { motion } from "framer-motion";

export interface TimelineSliderProps {
  positionMs: number;
  durationMs: number;
  onSeek: (positionMs: number) => void;
  className?: string;
  trackClassName?: string;
  fillClassName?: string;
  size?: "xs" | "sm" | "md" | "lg";
  trackBg?: string;
  trackActiveBg?: string;
  fillColor?: string;
  showTime?: boolean;
  onScrub?: (positionMs: number) => void;
}

export function formatPlaybackTime(ms: number): string {
  if (!ms || ms < 0) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export const TimelineSlider = memo(function TimelineSlider({
  positionMs,
  durationMs,
  onSeek,
  className = "",
  trackClassName = "",
  fillClassName = "",
  size = "md",
  trackBg,
  trackActiveBg,
  fillColor,
  showTime = false,
  onScrub,
}: TimelineSliderProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [scrubPosition, setScrubPosition] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const latestPosRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);

  const duration = Math.max(0, durationMs);
  const durationRef = useRef(duration);
  durationRef.current = duration;

  const currentPosition =
    isDragging && scrubPosition !== null
      ? scrubPosition
      : Math.min(Math.max(0, positionMs), duration || Infinity);

  const progress =
    duration > 0 ? Math.min(1, Math.max(0, currentPosition / duration)) : 0;
  const percentage = progress * 100;

  const calculatePositionFromPointer = useCallback(
    (clientX: number): number => {
      const rect = trackRef.current?.getBoundingClientRect();
      const currentDuration = durationRef.current;
      if (!rect || rect.width === 0 || currentDuration <= 0) return latestPosRef.current;
      const ratio = Math.max(
        0,
        Math.min(1, (clientX - rect.left) / rect.width),
      );
      return Math.round(ratio * currentDuration);
    },
    [],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      e.preventDefault();
      setIsDragging(true);
      isDraggingRef.current = true;
      try {
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      } catch {}

      const initialPos = calculatePositionFromPointer(e.clientX);
      latestPosRef.current = initialPos;
      setScrubPosition(initialPos);
      onScrub?.(initialPos);

      const cleanup = () => {
        setIsDragging(false);
        isDraggingRef.current = false;
        setScrubPosition(null);
        try {
          (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
        } catch {}
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerCancel);
      };

      const onPointerMove = (ev: PointerEvent) => {
        if (!isDraggingRef.current) return;
        if (ev.clientX !== undefined && ev.clientX !== null && !isNaN(ev.clientX)) {
          const pos = calculatePositionFromPointer(ev.clientX);
          latestPosRef.current = pos;
          setScrubPosition(pos);
          onScrub?.(pos);
        }
      };

      const onPointerUp = (ev: PointerEvent) => {
        if (ev.clientX !== undefined && ev.clientX !== null && !isNaN(ev.clientX)) {
          const finalPos = calculatePositionFromPointer(ev.clientX);
          latestPosRef.current = finalPos;
        }
        cleanup();
        onSeek(latestPosRef.current);
      };

      const onPointerCancel = () => {
        cleanup();
        // On cancel / touch interruption, commit last dragged position, NEVER reset to 0!
        onSeek(latestPosRef.current);
      };

      window.addEventListener("pointermove", onPointerMove, { passive: false });
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerCancel);
    },
    [calculatePositionFromPointer, onScrub, onSeek],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (duration <= 0) return;
      const step = 5000; // 5 seconds
      if (e.key === "ArrowRight") {
        e.preventDefault();
        onSeek(Math.min(duration, currentPosition + step));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        onSeek(Math.max(0, currentPosition - step));
      } else if (e.key === "Home") {
        e.preventDefault();
        onSeek(0);
      } else if (e.key === "End") {
        e.preventDefault();
        onSeek(duration);
      }
    },
    [currentPosition, duration, onSeek],
  );

  const containerHeights = {
    xs: "h-[16px]",
    sm: "h-[20px]",
    md: "h-[24px]",
    lg: "h-[28px]",
  }[size];

  const baseTrackHeights = {
    xs: "h-[4px]",
    sm: "h-[5px]",
    md: "h-[6px]",
    lg: "h-[7px]",
  }[size];

  const scaleYFactor = {
    xs: 1.5,
    sm: 1.4,
    md: 1.35,
    lg: 1.3,
  }[size];

  const isActive = isHovered || isDragging;

  const defaultTrackBg = trackBg ?? "rgba(255, 255, 255, 0.16)";
  const defaultTrackActiveBg = trackActiveBg ?? "rgba(255, 255, 255, 0.30)";

  return (
    <div
      className={`group relative flex ${containerHeights} items-center select-none prevent-seek ${className}`}
      style={{ touchAction: "none" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {showTime && (
        <span className="text-[11px] tabular-nums text-text-tertiary w-[36px] text-right shrink-0 pr-[8px]">
          {formatPlaybackTime(currentPosition)}
        </span>
      )}

      <div
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={currentPosition}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        style={{ touchAction: "none" }}
        className="relative flex h-full flex-1 items-center cursor-pointer outline-none"
      >
        <motion.div
          ref={trackRef}
          initial={false}
          animate={{
            scaleY: isActive ? scaleYFactor : 1,
            backgroundColor: isActive ? defaultTrackActiveBg : defaultTrackBg,
          }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 30,
            mass: 0.8,
          }}
          className={`relative w-full rounded-full overflow-hidden origin-center ${baseTrackHeights} ${trackClassName}`}
        >
          <div
            className={`absolute inset-0 rounded-full transition-transform ease-out ${
              isDragging ? "duration-0" : "duration-100"
            } ${fillClassName || "bg-text-primary"}`}
            style={{
              transform: `translateX(${percentage - 100}%)`,
              ...(fillColor ? { backgroundColor: fillColor } : {}),
            }}
          />
        </motion.div>
      </div>

      {showTime && (
        <span className="text-[11px] tabular-nums text-text-tertiary w-[36px] shrink-0 pl-[8px]">
          {formatPlaybackTime(duration)}
        </span>
      )}
    </div>
  );
});

export default TimelineSlider;
