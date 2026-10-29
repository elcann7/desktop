import { BotGuardClient } from "bgutils-js/botguard";
import { WebPoMinter } from "bgutils-js/webpo";
import { buildURL, GOOG_API_KEY } from "bgutils-js/utils";
import { log } from "@/shared/utils/logger";

const REQUEST_KEY = "O43z0dpjhgX20SCx4KAo";
const WEB_CLIENT_VERSION = "2.20250925.01.00";
const REFRESH_MARGIN_MS = 10 * 60 * 1000;
const DEFAULT_TTL_SECONDS = 6 * 60 * 60;

interface BotguardChallenge {
  program: string;
  globalName: string;
  interpreterUrl?: string;
  interpreterScript?: string;
}

interface RawChallenge {
  interpreterUrl?: {
    privateDoNotAccessOrElseTrustedResourceUrlWrappedValue?: string;
  };
  interpreterJavascript?: {
    privateDoNotAccessOrElseSafeScriptWrappedValue?: string;
  };
  program?: string;
  globalName?: string;
}

function readChallenge(raw: RawChallenge | undefined): BotguardChallenge {
  const interpreterUrl =
    raw?.interpreterUrl?.privateDoNotAccessOrElseTrustedResourceUrlWrappedValue;
  const interpreterScript =
    raw?.interpreterJavascript?.privateDoNotAccessOrElseSafeScriptWrappedValue;
  if (!raw?.program || !raw.globalName || !(interpreterUrl || interpreterScript))
    throw new Error("BotGuard challenge is missing");
  return {
    program: raw.program,
    globalName: raw.globalName,
    ...(interpreterUrl ? { interpreterUrl } : {}),
    ...(interpreterScript ? { interpreterScript } : {}),
  };
}

async function fetchWebChallenge(): Promise<BotguardChallenge> {
  const isWebDev =
    typeof window !== "undefined" &&
    !window.linerElectron &&
    !(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();

  const endpoint = isWebDev
    ? "/youtubei/v1/att/get?prettyPrint=false"
    : "https://www.youtube.com/youtubei/v1/att/get?prettyPrint=false";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      context: {
        client: {
          clientName: "WEB",
          clientVersion: WEB_CLIENT_VERSION,
          hl: "en",
          gl: "US",
        },
      },
      engagementType: "ENGAGEMENT_TYPE_UNBOUND",
    }),
  });
  if (!response.ok) throw new Error(`att/get returned ${response.status}`);
  const body = (await response.json()) as { bgChallenge?: RawChallenge };
  return readChallenge(body.bgChallenge);
}

async function loadInterpreter(challenge: BotguardChallenge): Promise<string> {
  if (challenge.interpreterScript) return challenge.interpreterScript;
  let url = challenge.interpreterUrl ?? "";
  if (url.startsWith("//")) url = `https:${url}`;

  const isWebDev =
    typeof window !== "undefined" &&
    !window.linerElectron &&
    !(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();

  if (isWebDev && url.includes("google.com/js/th/")) {
    url = url.replace(/https?:\/\/[^/]+\/js\/th\//, "/google-th/");
  }

  const response = await fetch(url);
  if (!response.ok) throw new Error(`interpreter download failed: ${response.status}`);
  return response.text();
}

async function generateWebIntegrityToken(botguardResponse: string): Promise<{ token: string; ttlSeconds?: number }> {
  let url = buildURL("GenerateIT", true);

  const isWebDev =
    typeof window !== "undefined" &&
    !window.linerElectron &&
    !(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();

  if (isWebDev && url.includes("youtube.com/api/jnn/")) {
    url = url.replace(/https?:\/\/[^/]+\/api\/jnn\//, "/api/jnn/");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json+protobuf",
      "x-goog-api-key": GOOG_API_KEY,
      "x-user-agent": "grpc-web-javascript/0.1",
    },
    body: JSON.stringify([REQUEST_KEY, botguardResponse]),
  });
  if (!response.ok) throw new Error(`GenerateIT returned ${response.status}`);
  const [token, ttlSeconds] = (await response.json()) as [string | null, number?];
  if (!token) throw new Error("GenerateIT returned no integrity token");
  return { token, ...(ttlSeconds ? { ttlSeconds } : {}) };
}

interface MinterEntry {
  minter: WebPoMinter;
  expiresAt: number;
}

let cachedEntry: MinterEntry | null = null;
let pendingMinter: Promise<MinterEntry> | null = null;

async function getBrowserMinter(): Promise<MinterEntry> {
  if (cachedEntry && Date.now() < cachedEntry.expiresAt) {
    return cachedEntry;
  }
  if (pendingMinter) return pendingMinter;

  pendingMinter = (async () => {
    const challenge = await fetchWebChallenge();
    const script = await loadInterpreter(challenge);
    new Function(script)();

    const botguard = await BotGuardClient.create({
      program: challenge.program,
      globalName: challenge.globalName,
      globalObject: typeof window !== "undefined" ? window : globalThis,
    });

    const webPoSignalOutput: Parameters<typeof WebPoMinter.create>[1] = [];
    const botguardResponse = await botguard.snapshot({ webPoSignalOutput });
    const { token, ttlSeconds } = await generateWebIntegrityToken(botguardResponse);

    const minter = await WebPoMinter.create(
      { integrityToken: token.replace(/\+/g, "-").replace(/\//g, "_") },
      webPoSignalOutput,
    );

    const ttlMs = (ttlSeconds && ttlSeconds > 0 ? ttlSeconds : DEFAULT_TTL_SECONDS) * 1000;
    const entry: MinterEntry = {
      minter,
      expiresAt: Date.now() + Math.max(ttlMs - REFRESH_MARGIN_MS, 60_000),
    };
    cachedEntry = entry;
    return entry;
  })()
    .catch((err) => {
      cachedEntry = null;
      throw err;
    })
    .finally(() => {
      pendingMinter = null;
    });

  return pendingMinter;
}

export async function mintBrowserPoToken(videoId: string): Promise<string> {
  try {
    const { minter } = await getBrowserMinter();
    const token = await minter.mintAsWebsafeString(videoId);
    log("cyan", "playback", `minted browser PoToken for ${videoId}`);
    return token;
  } catch (error) {
    cachedEntry = null;
    log("yellow", "playback", `browser PoToken minting failed: ${String(error)}`);
    throw error;
  }
}
