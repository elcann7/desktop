import { describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn(() => process.cwd()),
  },
  ipcMain: {
    on: vi.fn(),
    handle: vi.fn(),
  },
}));

import type { BrowserWindow } from "electron";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { LinerMcpManager } from "./mcp";

function createMockWindow(evalResult: any = "ok") {
  return {
    isDestroyed: vi.fn(() => false),
    webContents: {
      executeJavaScript: vi.fn(async (code: string) => {
        if (code.includes("controlPlayback")) return "Playback action executed";
        if (code.includes("searchTracks"))
          return [{ id: "yt_test", title: "Test Song", artist: "Test Artist" }];
        return evalResult;
      }),
    },
  } as unknown as BrowserWindow;
}

describe("LinerMcpManager", () => {
  it("starts the server and responds to healthcheck", async () => {
    const mockWin = createMockWindow();
    const manager = new LinerMcpManager(() => mockWin, {
      enabled: true,
      port: 0, // dynamic port
    });

    // Wait briefly for server listen
    await new Promise((r) => setTimeout(r, 100));

    expect(manager.isRunning).toBe(true);
    expect(manager.port).toBeGreaterThan(0);

    const res = await fetch(`http://127.0.0.1:${manager.port}/health`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; name: string };
    expect(body.status).toBe("ok");
    expect(body.name).toBe("liner-mcp");

    manager.destroy();
    expect(manager.isRunning).toBe(false);
  });

  it("updates and stores playback state", async () => {
    const mockWin = createMockWindow();
    const manager = new LinerMcpManager(() => mockWin, {
      enabled: true,
      port: 0,
    });

    manager.updateState({
      status: "playing",
      track: {
        id: "yt_123",
        title: "Test Track",
        artist: "Test Artist",
        durationMs: 200_000,
      },
      volume: 0.8,
    });

    await new Promise((r) => setTimeout(r, 50));
    manager.destroy();
  });

  it("stops and starts according to settings changes", async () => {
    const mockWin = createMockWindow();
    const manager = new LinerMcpManager(() => mockWin, {
      enabled: false,
    });

    expect(manager.isRunning).toBe(false);

    manager.updateSettings({ enabled: true, port: 0 });
    await new Promise((r) => setTimeout(r, 100));

    expect(manager.isRunning).toBe(true);

    manager.updateSettings({ enabled: false });
    expect(manager.isRunning).toBe(false);

    manager.destroy();
  });

  it("connects via standard MCP Client over SSE and executes tools", async () => {
    const mockWin = createMockWindow();
    const manager = new LinerMcpManager(() => mockWin, {
      enabled: true,
      port: 0,
    });

    await new Promise((r) => setTimeout(r, 150));
    expect(manager.isRunning).toBe(true);

    // Connect official MCP client via SSE
    const client = new Client(
      { name: "test-ai-client", version: "1.0.0" },
      { capabilities: {} },
    );
    const transport = new SSEClientTransport(
      new URL(`http://127.0.0.1:${manager.port}/sse`),
    );
    await client.connect(transport);

    // Check list of tools
    const tools = await client.listTools();
    expect(tools.tools.length).toBeGreaterThanOrEqual(8);
    const names = tools.tools.map((t) => t.name);
    expect(names).toContain("liner_get_playback_state");
    expect(names).toContain("liner_control_playback");
    expect(names).toContain("liner_search_tracks");
    expect(names).toContain("liner_play_track");
    expect(names).toContain("liner_create_playlist");

    // Test tool call: liner_get_playback_state
    manager.updateState({
      status: "playing",
      track: {
        id: "yt_toca",
        title: "Toca Toca",
        artist: "Fly Project",
        durationMs: 165_000,
      },
      volume: 0.9,
    });

    const stateRes: any = await client.callTool({
      name: "liner_get_playback_state",
      arguments: {},
    });
    expect(stateRes.content[0].text).toContain("Toca Toca");
    expect(stateRes.content[0].text).toContain("Fly Project");

    // Test tool call: liner_control_playback
    const controlRes: any = await client.callTool({
      name: "liner_control_playback",
      arguments: { action: "next" },
    });
    expect(controlRes.content[0].text).toContain("Playback action executed");

    // Test tool call: liner_search_tracks
    const searchRes: any = await client.callTool({
      name: "liner_search_tracks",
      arguments: { query: "Fly Project", limit: 3 },
    });
    expect(searchRes.content[0].text).toContain("Test Song");

    await client.close();
    manager.destroy();
  });
});
