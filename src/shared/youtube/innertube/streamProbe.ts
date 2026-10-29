import { InnertubeError } from "./innertubeClient";

const PROBE_OFFSET = 1_048_576 + 4096;
const REJECTED_PREFIX = "stream url rejected with";

/** googlevideo answered 403 to a stream url it handed out: the network is refused, not the track */
export function isStreamRefused(error: unknown): boolean {
  return (
    error instanceof InnertubeError &&
    error.status === 403 &&
    error.message.startsWith(REJECTED_PREFIX)
  );
}

export async function assertStreamReachable(
  url: string,
  contentLength: number | undefined,
  signal?: AbortSignal,
): Promise<void> {
  if (
    typeof window !== "undefined" &&
    !process.env.VITEST &&
    (!window.linerElectron || (window as any).Capacitor?.isNativePlatform())
  ) {
    return;
  }

  const probe = new URL(url);
  const offset =
    contentLength && contentLength > PROBE_OFFSET ? PROBE_OFFSET : 0;
  probe.searchParams.set("range", `${offset}-${offset}`);
  try {
    const response = await fetch(probe.toString(), { signal });
    await response.body?.cancel().catch(() => undefined);
    if (!response.ok)
      throw new InnertubeError(
        `${REJECTED_PREFIX} ${response.status}`,
        response.status,
      );
  } catch (err) {
    if (err instanceof InnertubeError) throw err;
    return;
  }
}
