import { TV_PROFILE } from "../innertube/playbackProfiles";
import { USER_AGENT_HEADER_OVERRIDE } from "../innertube/userAgentOverride";

const TV_PAGE_URL = "https://www.youtube.com/tv";
const BASE_SCRIPT_PATTERN = /\/s\/_\/kabuki\/_\/js\/[^'"\\]+?m=base/;
const CREDENTIALS_PATTERN =
  /clientId:"(?<clientId>[^"]+)",[^"]*?:"(?<clientSecret>[^"]+)"/;

const DEFAULT_CLIENT: TvOauthClient = {
  clientId:
    "861556708454-d6dlm3lh05idd8npek18k6be8ba3oc68.apps.googleusercontent.com",
  clientSecret: "SboVhoG9s0rNafixCSGGKXAT",
};

export interface TvOauthClient {
  clientId: string;
  clientSecret: string;
}

let cachedClient: Promise<TvOauthClient> | null = null;

async function fetchTvText(url: string, signal?: AbortSignal): Promise<string> {
  const response = await fetch(url, {
    headers: TV_PROFILE.userAgent
      ? { [USER_AGENT_HEADER_OVERRIDE]: TV_PROFILE.userAgent }
      : {},
    signal,
  });
  if (!response.ok) {
    throw new Error(`YouTube TV ${url} failed with HTTP ${response.status}.`);
  }
  return response.text();
}

export function parseBaseScriptUrl(tvPage: string): string | null {
  const path = tvPage.match(BASE_SCRIPT_PATTERN)?.[0];
  return path ? new URL(path, TV_PAGE_URL).toString() : null;
}

export function parseTvOauthClient(baseScript: string): TvOauthClient | null {
  const groups = baseScript.match(CREDENTIALS_PATTERN)?.groups;
  if (!groups?.clientId || !groups.clientSecret) return null;
  return { clientId: groups.clientId, clientSecret: groups.clientSecret };
}

async function loadTvOauthClient(signal?: AbortSignal): Promise<TvOauthClient> {
  try {
    const scriptUrl = parseBaseScriptUrl(await fetchTvText(TV_PAGE_URL, signal));
    if (!scriptUrl) return DEFAULT_CLIENT;
    const client = parseTvOauthClient(await fetchTvText(scriptUrl, signal));
    return client ?? DEFAULT_CLIENT;
  } catch {
    return DEFAULT_CLIENT;
  }
}

export function getTvOauthClient(signal?: AbortSignal): Promise<TvOauthClient> {
  cachedClient ??= loadTvOauthClient(signal).catch((error: unknown) => {
    cachedClient = null;
    throw error;
  });
  return cachedClient;
}
