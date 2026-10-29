import { asArray, asRecord } from "@/shared/utils/json";

export interface AudioFormat {
  itag: number;
  url: string;
  mimeType: string;
  bitrate: number;
  contentLength?: number;
  signatureCipher?: string;
}

export interface ResolvedAudioStream {
  url: string;
  mimeType: string;
  codec: "opus" | "aac";
  bitrate: number;
  itag: number;
  expiresAt: string | null;
  contentLength?: number;
}

const PREFERRED_ITAGS = [251, 140, 250, 249, 139];

function toAudioFormat(raw: unknown): AudioFormat | null {
  const format = asRecord(raw);
  if (!format) return null;
  const { itag, mimeType } = format;
  const url = typeof format.url === "string" ? format.url : "";
  const signatureCipher =
    typeof format.signatureCipher === "string"
      ? format.signatureCipher
      : undefined;
  if (
    typeof itag !== "number" ||
    typeof mimeType !== "string" ||
    (!url && !signatureCipher)
  )
    return null;
  if (!mimeType.startsWith("audio/")) return null;
  const bitrate =
    typeof format.bitrate === "number"
      ? format.bitrate
      : Number(format.averageBitrate) || 0;
  const contentLength = Number(format.contentLength);
  return {
    itag,
    url,
    mimeType,
    bitrate,
    ...(Number.isFinite(contentLength) && contentLength > 0
      ? { contentLength }
      : {}),
    ...(signatureCipher ? { signatureCipher } : {}),
  };
}

export function extractAudioFormats(playerResponse: unknown): AudioFormat[] {
  const streamingData = asRecord(asRecord(playerResponse)?.streamingData);
  return asArray(streamingData?.adaptiveFormats)
    .map(toAudioFormat)
    .filter((format): format is AudioFormat => Boolean(format));
}

export function detectPreferredCodec(): "opus" | "aac" {
  if (typeof navigator !== "undefined" && typeof window !== "undefined" && !process.env.VITEST) {
    // If running in Apple WebKit / iOS Safari / iPhone / iPad, always prefer AAC (itag 140)
    const isApple =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (/Macintosh/.test(navigator.userAgent) && !window.linerElectron && (navigator.maxTouchPoints ?? 0) > 1);
    if (isApple) {
      return "aac";
    }
    const audio = document.createElement("audio");
    if (typeof audio.canPlayType === "function") {
      const canPlayWebm = audio.canPlayType('audio/webm; codecs="opus"');
      if (!canPlayWebm) {
        return "aac";
      }
    }
  }
  return "opus";
}

export function selectBestAudioFormat(
  formats: AudioFormat[],
  preferredCodec?: "opus" | "aac",
): AudioFormat | null {
  if (formats.length === 0) return null;
  const codec = preferredCodec ?? detectPreferredCodec();
  const order =
    codec === "aac" ? [140, 139, 251, 250, 249] : PREFERRED_ITAGS;
  for (const itag of order) {
    const match = formats.find((format) => format.itag === itag);
    if (match) return match;
  }
  return [...formats].sort((a, b) => b.bitrate - a.bitrate)[0] ?? null;
}

function expiryFromUrl(url: string): string | null {
  try {
    const expire = Number(new URL(url).searchParams.get("expire"));
    return Number.isFinite(expire) && expire > 0
      ? new Date(expire * 1000).toISOString()
      : null;
  } catch {
    return null;
  }
}

export function toResolvedStream(format: AudioFormat): ResolvedAudioStream {
  const isOpus =
    format.mimeType.includes("opus") || format.mimeType.includes("webm");
  return {
    url: format.url,
    mimeType: format.mimeType.split(";")[0]?.trim() || "audio/webm",
    codec: isOpus ? "opus" : "aac",
    bitrate: format.bitrate || 160_000,
    itag: format.itag,
    expiresAt: expiryFromUrl(format.url),
    ...(format.contentLength ? { contentLength: format.contentLength } : {}),
  };
}

export function requiresBotCheck(playerResponse: unknown): boolean {
  return (
    asRecord(asRecord(playerResponse)?.playabilityStatus)?.status ===
    "LOGIN_REQUIRED"
  );
}

export function playabilityError(playerResponse: unknown): string | null {
  const status = asRecord(asRecord(playerResponse)?.playabilityStatus);
  if (!status || status.status === "OK") return null;
  return typeof status.reason === "string" && status.reason
    ? status.reason
    : `Playability status ${String(status.status)}`;
}
