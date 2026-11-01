import { memo, useMemo } from "react";
import { findHighlightRanges } from "@/shared/utils/trackSearch";

interface HighlightedTextProps {
  text: string;
  query?: string;
}

/** Text with the parts matching `query` softly marked (search results). */
function HighlightedText({ text, query }: HighlightedTextProps) {
  const safeText = typeof text === "string" ? text : String(text ?? "");
  const ranges = useMemo(
    () => (query && safeText ? findHighlightRanges(safeText, query) : []),
    [safeText, query],
  );
  if (ranges.length === 0) return <>{safeText}</>;

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  ranges.forEach(([start, end], i) => {
    if (start > cursor) parts.push(safeText.slice(cursor, start));
    parts.push(
      <mark
        key={i}
        className="rounded-[3px] bg-text-primary/[0.16] text-inherit [box-decoration-break:clone]"
      >
        {safeText.slice(start, end)}
      </mark>,
    );
    cursor = end;
  });
  if (cursor < safeText.length) parts.push(safeText.slice(cursor));
  return <>{parts}</>;
}

export default memo(HighlightedText);
