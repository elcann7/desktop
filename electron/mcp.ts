import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import type { BrowserWindow } from "electron";
import { app, ipcMain } from "electron";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";

export const BRIDGE_SCRIPT_CONTENT = `import readline from "node:readline";

const SERVER_URL = process.env.LINER_MCP_URL || "http://127.0.0.1:4545";

async function main() {
  const sseRes = await fetch(\`\${SERVER_URL}/sse\`, {
    headers: { Accept: "text/event-stream" },
  });

  if (!sseRes.ok || !sseRes.body) {
    console.error(
      \`[bridge] Failed to connect to Liner MCP server at \${SERVER_URL}/sse: \${sseRes.statusText}\`,
    );
    process.exit(1);
  }

  const reader = sseRes.body.getReader();
  const decoder = new TextDecoder();
  let messageUrl = "";
  let buffer = "";

  (async () => {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\\n");
      buffer = lines.pop() ?? "";

      let currentEvent = "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("event:")) {
          currentEvent = trimmed.slice(6).trim();
        } else if (trimmed.startsWith("data:")) {
          const data = trimmed.slice(5).trim();
          if (currentEvent === "endpoint" || !messageUrl) {
            messageUrl = new URL(data, SERVER_URL).toString();
          } else if (currentEvent === "message") {
            process.stdout.write(data + "\\n");
          }
        }
      }
    }
  })().catch((err) => {
    console.error("[bridge] SSE connection error:", err);
    process.exit(1);
  });

  const rl = readline.createInterface({
    input: process.stdin,
    terminal: false,
  });
  for await (const line of rl) {
    if (!line.trim()) continue;
    let retries = 0;
    while (!messageUrl && retries < 50) {
      await new Promise((r) => setTimeout(r, 20));
      retries++;
    }
    if (!messageUrl) {
      console.error("[bridge] Handshake timeout");
      continue;
    }

    try {
      await fetch(messageUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: line,
      });
    } catch (err) {
      console.error("[bridge] POST message error:", err);
    }
  }
}

main().catch((err) => {
  console.error("[bridge] Fatal error:", err);
  process.exit(1);
});
`;

export interface McpSettings {
  enabled: boolean;
  port: number;
}

export const DEFAULT_MCP_SETTINGS: McpSettings = {
  enabled: true,
  port: 4545,
};

export interface McpTrackInfo {
  id: string;
  title: string;
  artist: string;
  album?: string;
  coverUrl?: string;
  durationMs: number;
}

export interface McpPlaybackState {
  status: "playing" | "paused" | "loading" | "buffering" | "idle" | "error";
  track: McpTrackInfo | null;
  positionMs: number;
  durationMs: number;
  volume: number;
  shuffle: boolean;
  repeat: "off" | "all" | "one";
}

export class LinerMcpManager {
  private server: http.Server | null = null;
  private mcpServer: McpServer | null = null;
  private transports = new Map<string, SSEServerTransport>();
  private settings: McpSettings = { ...DEFAULT_MCP_SETTINGS };
  private state: McpPlaybackState = {
    status: "idle",
    track: null,
    positionMs: 0,
    durationMs: 0,
    volume: 1,
    shuffle: false,
    repeat: "off",
  };
  private isDestroyed = false;
  private actualPort: number | null = null;

  constructor(
    private readonly getWindow: () => BrowserWindow | null,
    initialSettings?: Partial<McpSettings>,
  ) {
    if (initialSettings) {
      this.settings = { ...this.settings, ...initialSettings };
    }
    this.registerIpcHandlers();
    if (this.settings.enabled) {
      this.start();
    }
  }

  get isRunning(): boolean {
    return Boolean(this.server?.listening);
  }

  get port(): number | null {
    return this.actualPort;
  }

  updateState(patch: Partial<McpPlaybackState>): void {
    this.state = { ...this.state, ...patch };
  }

  updateSettings(patch: Partial<McpSettings>): void {
    const prevEnabled = this.settings.enabled;
    const prevPort = this.settings.port;
    this.settings = { ...this.settings, ...patch };

    if (
      prevEnabled !== this.settings.enabled ||
      prevPort !== this.settings.port
    ) {
      this.stop();
      if (this.settings.enabled && !this.isDestroyed) {
        this.start();
      }
    }
  }

  private registerIpcHandlers(): void {
    if (!ipcMain?.on || !ipcMain?.handle) return;

    ipcMain.on(
      "mcp:update-state",
      (_event, state: Partial<McpPlaybackState>) => {
        this.updateState(state);
      },
    );

    ipcMain.on("mcp:update-settings", (_event, patch: Partial<McpSettings>) => {
      this.updateSettings(patch);
    });

    ipcMain.handle("mcp:get-status", () => {
      const bridgePath = this.ensureBridgeScript();
      return {
        running: this.isRunning,
        port: this.port,
        enabled: this.settings.enabled,
        bridgePath,
      };
    });
  }

  ensureBridgeScript(): string {
    try {
      const dir = app?.getPath ? app.getPath("userData") : process.cwd();
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const bridgePath = path.join(dir, "mcp-bridge.mjs");
      if (!fs.existsSync(bridgePath)) {
        fs.writeFileSync(bridgePath, BRIDGE_SCRIPT_CONTENT, "utf-8");
      }
      return bridgePath;
    } catch (error) {
      console.error("[mcp] Failed to ensure bridge script:", error);
      return "";
    }
  }

  start(): void {
    if (this.isDestroyed || this.server) return;

    this.mcpServer = this.createMcpServer();

    this.server = http.createServer(async (req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization",
      );

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      const host = req.headers.host || `127.0.0.1:${this.settings.port}`;
      const url = new URL(req.url || "/", `http://${host}`);

      if (url.pathname === "/sse" && req.method === "GET") {
        try {
          const transport = new SSEServerTransport("/messages", res);
          const serverForClient = this.createMcpServer();
          this.transports.set(transport.sessionId, transport);
          transport.onclose = () => {
            this.transports.delete(transport.sessionId);
          };
          await serverForClient.connect(transport);
        } catch (err) {
          console.error("[mcp] SSE connection error:", err);
          if (!res.headersSent) {
            res.writeHead(500).end("Failed to establish SSE transport");
          }
        }
        return;
      }

      if (url.pathname === "/messages" && req.method === "POST") {
        const sessionId = url.searchParams.get("sessionId");
        if (!sessionId) {
          res.writeHead(400).end("Missing sessionId");
          return;
        }
        const transport = this.transports.get(sessionId);
        if (!transport) {
          res.writeHead(404).end("Session not found");
          return;
        }
        try {
          await transport.handlePostMessage(req, res);
        } catch (err) {
          console.error("[mcp] Error handling message:", err);
          if (!res.headersSent) {
            res.writeHead(500).end("Internal message handler error");
          }
        }
        return;
      }

      // Healthcheck and discovery info
      if (url.pathname === "/" || url.pathname === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            status: "ok",
            name: "liner-mcp",
            version: "1.0.0",
            sseEndpoint: `http://127.0.0.1:${this.actualPort}/sse`,
            messageEndpoint: `http://127.0.0.1:${this.actualPort}/messages`,
          }),
        );
        return;
      }

      res.writeHead(404).end("Not found");
    });

    this.server.on("error", (err: NodeJS.ErrnoException) => {
      console.warn("[mcp] Server error:", err.message);
      this.actualPort = null;
    });

    this.server.listen(this.settings.port, "127.0.0.1", () => {
      const address = this.server?.address();
      if (address && typeof address === "object") {
        this.actualPort = address.port;
        console.log(
          `[mcp] Server listening on http://127.0.0.1:${this.actualPort}/sse`,
        );
      }
    });
  }

  stop(): void {
    if (this.server) {
      for (const transport of this.transports.values()) {
        try {
          transport.close();
        } catch {}
      }
      this.transports.clear();
      this.server.close();
      this.server = null;
      this.actualPort = null;
    }
    this.mcpServer = null;
  }

  destroy(): void {
    this.isDestroyed = true;
    this.stop();
  }

  private createMcpServer(): McpServer {
    const server = new McpServer({
      name: "liner-music-player",
      version: "1.0.0",
    });

    server.tool(
      "liner_get_playback_state",
      "Get the current playback state of Liner music player including current song, artist, status, volume, and playback progress.",
      {},
      async () => {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(this.state, null, 2),
            },
          ],
        };
      },
    );

    server.tool(
      "liner_control_playback",
      "Control music playback in Liner: play, pause, toggle, next track, previous track, seek position, set volume, toggle shuffle, or change repeat mode.",
      {
        action: z
          .enum([
            "play",
            "pause",
            "toggle",
            "next",
            "previous",
            "seek",
            "volume",
            "shuffle",
            "repeat",
          ])
          .describe("Action to perform on the player"),
        value: z
          .union([z.number(), z.string(), z.boolean()])
          .optional()
          .describe(
            "Optional argument: number for seek (ms) or volume (0.0 to 1.0); boolean for shuffle; 'off'|'all'|'one' for repeat",
          ),
      },
      async ({ action, value }) => {
        const response = await this.executeInRenderer(
          `window.__LINER_MCP__?.controlPlayback(${JSON.stringify(action)}, ${JSON.stringify(value)})`,
        );
        return {
          content: [
            {
              type: "text",
              text: String(
                response ?? `Playback action '${action}' dispatched`,
              ),
            },
          ],
        };
      },
    );

    server.tool(
      "liner_search_tracks",
      "Search the YouTube Music catalog through Liner for tracks, albums, or artists.",
      {
        query: z
          .string()
          .describe("Search keywords, song title, or artist name"),
        limit: z
          .number()
          .optional()
          .describe("Maximum number of results to return (default 10)"),
      },
      async ({ query, limit = 10 }) => {
        const results = await this.executeInRenderer(
          `window.__LINER_MCP__?.searchTracks(${JSON.stringify(query)}, ${limit})`,
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(results ?? [], null, 2),
            },
          ],
        };
      },
    );

    server.tool(
      "liner_play_track",
      "Play a specific track in Liner by trackId, or search for a title/artist and play the best match immediately.",
      {
        query: z
          .string()
          .optional()
          .describe("Song title or artist to search and play"),
        trackId: z.string().optional().describe("Exact track ID to play"),
      },
      async ({ query, trackId }) => {
        const result = await this.executeInRenderer(
          `window.__LINER_MCP__?.playTrack(${JSON.stringify({ query, trackId })})`,
        );
        return {
          content: [
            {
              type: "text",
              text: String(result ?? "Track play initiated"),
            },
          ],
        };
      },
    );

    server.tool(
      "liner_queue_track",
      "Add a track to the playback queue by trackId or search query.",
      {
        query: z
          .string()
          .optional()
          .describe("Song title or artist to search and queue"),
        trackId: z.string().optional().describe("Exact track ID to queue"),
      },
      async ({ query, trackId }) => {
        const result = await this.executeInRenderer(
          `window.__LINER_MCP__?.queueTrack(${JSON.stringify({ query, trackId })})`,
        );
        return {
          content: [
            {
              type: "text",
              text: String(result ?? "Track added to queue"),
            },
          ],
        };
      },
    );

    server.tool(
      "liner_list_playlists",
      "List all user playlists in Liner library.",
      {},
      async () => {
        const playlists = await this.executeInRenderer(
          `window.__LINER_MCP__?.listPlaylists()`,
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(playlists ?? [], null, 2),
            },
          ],
        };
      },
    );

    server.tool(
      "liner_get_playlist",
      "Get the tracks and details of a specific user playlist.",
      {
        playlistId: z.string().describe("Target playlist ID"),
      },
      async ({ playlistId }) => {
        const playlist = await this.executeInRenderer(
          `window.__LINER_MCP__?.getPlaylist(${JSON.stringify(playlistId)})`,
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(playlist ?? {}, null, 2),
            },
          ],
        };
      },
    );

    server.tool(
      "liner_create_playlist",
      "Create a new playlist in Liner library with a title, optional description, and optional track IDs.",
      {
        title: z.string().describe("Title for the new playlist"),
        description: z
          .string()
          .optional()
          .describe("Optional description for the playlist"),
        trackIds: z
          .array(z.string())
          .optional()
          .describe("Optional track IDs to populate the playlist"),
      },
      async ({ title, description, trackIds }) => {
        const result = await this.executeInRenderer(
          `window.__LINER_MCP__?.createPlaylist(${JSON.stringify(title)}, ${JSON.stringify(description)}, ${JSON.stringify(trackIds || [])})`,
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result ?? { status: "created", title }),
            },
          ],
        };
      },
    );

    server.tool(
      "liner_add_to_playlist",
      "Add a song to an existing user playlist in Liner.",
      {
        playlistId: z.string().describe("Target playlist ID"),
        trackId: z.string().describe("Track ID to add to the playlist"),
      },
      async ({ playlistId, trackId }) => {
        const result = await this.executeInRenderer(
          `window.__LINER_MCP__?.addToPlaylist(${JSON.stringify(playlistId)}, ${JSON.stringify(trackId)})`,
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                result ?? { status: "added", playlistId, trackId },
              ),
            },
          ],
        };
      },
    );

    server.tool(
      "liner_remove_from_playlist",
      "Remove a song from an existing user playlist in Liner.",
      {
        playlistId: z.string().describe("Target playlist ID"),
        itemId: z.string().describe("Playlist item ID to remove"),
      },
      async ({ playlistId, itemId }) => {
        const result = await this.executeInRenderer(
          `window.__LINER_MCP__?.removeFromPlaylist(${JSON.stringify(playlistId)}, ${JSON.stringify(itemId)})`,
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                result ?? { status: "removed", playlistId, itemId },
              ),
            },
          ],
        };
      },
    );

    return server;
  }

  private async executeInRenderer<T>(code: string): Promise<T | null> {
    const win = this.getWindow();
    if (!win || win.isDestroyed()) {
      throw new Error("Liner window is currently unavailable");
    }
    try {
      return await win.webContents.executeJavaScript(code);
    } catch (error) {
      console.error("[mcp] executeInRenderer failed:", error);
      throw error;
    }
  }
}
