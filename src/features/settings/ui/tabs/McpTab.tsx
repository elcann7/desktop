import { useState, useEffect } from "react";
import { ToggleSwitch } from "@/shared/ui";
import { showToast } from "@/shared/ui/Toast";
import { SettingRow, SettingSection } from "../controls";

export function McpTab({ searchQuery }: { searchQuery?: string }) {
  const [enabled, setEnabled] = useState(true);
  const [port, setPort] = useState(4545);
  const [running, setRunning] = useState(false);
  const [bridgePath, setBridgePath] = useState<string>("");
  const [clientType, setClientType] = useState<"antigravity" | "cursor">(
    "antigravity",
  );

  useEffect(() => {
    window.linerElectron?.getMcpStatus?.().then((status) => {
      setEnabled(status.enabled);
      setRunning(status.running);
      if (status.port) setPort(status.port);
      if (status.bridgePath) setBridgePath(status.bridgePath);
    });
  }, []);

  const handleToggle = (next: boolean) => {
    setEnabled(next);
    window.linerElectron?.mcpUpdateSettings?.({ enabled: next });
    setRunning(next);
  };

  const sseUrl = `http://127.0.0.1:${port}/sse`;

  const stdioConfig = {
    mcpServers: {
      liner: {
        command: "node",
        args: [bridgePath || "<appData>/mcp-bridge.mjs"],
      },
    },
  };

  const sseConfig = {
    mcpServers: {
      liner: {
        url: sseUrl,
      },
    },
  };

  const copyConfig = (type: "antigravity" | "cursor") => {
    const config = type === "antigravity" ? stdioConfig : sseConfig;
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    showToast("MCP Config", "checkmark", {
      description: `Copied ${type === "antigravity" ? "Antigravity/Claude" : "Cursor"} config to clipboard`,
    });
  };

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="relative overflow-hidden rounded-[20px] bg-bg-surface p-5 shadow-surface dark:bg-white/[0.04]">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-text-primary">
              MCP Server
            </span>
            <span className="text-xs text-text-tertiary">
              {running ? `Active & listening on ${sseUrl}` : "Server stopped"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                running ? "bg-emerald-500 animate-pulse" : "bg-zinc-500"
              }`}
            />
            <span className="text-xs font-medium text-text-secondary">
              {running ? "Online" : "Offline"}
            </span>
          </div>
        </div>
      </div>

      <SettingSection>
        <SettingRow
          title="Enable MCP Server"
          description="Allow AI assistants (Antigravity, Claude, Cursor) to manage playlists and control playback."
          searchQuery={searchQuery}
          control={<ToggleSwitch checked={enabled} onChange={handleToggle} />}
        />
      </SettingSection>

      <SettingSection label="Client Setup">
        <div className="flex flex-col gap-3 p-4 rounded-[16px] bg-bg-surface/50 dark:bg-white/[0.03]">
          <div className="flex gap-2 p-1 rounded-[12px] bg-black/5 dark:bg-black/20 self-start">
            <button
              type="button"
              onClick={() => setClientType("antigravity")}
              className={`px-3 py-1.5 text-xs font-medium rounded-[9px] transition-colors ${
                clientType === "antigravity"
                  ? "bg-accent text-white shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Antigravity & Claude Desktop (Stdio)
            </button>
            <button
              type="button"
              onClick={() => setClientType("cursor")}
              className={`px-3 py-1.5 text-xs font-medium rounded-[9px] transition-colors ${
                clientType === "cursor"
                  ? "bg-accent text-white shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Cursor & Web (Direct SSE)
            </button>
          </div>

          <div className="text-xs text-text-secondary">
            {clientType === "antigravity"
              ? "Paste this into your Antigravity (mcp_config.json) or Claude Desktop config:"
              : "Paste this into Cursor or direct SSE clients:"}
          </div>

          <pre className="p-3 rounded-[12px] bg-black/10 dark:bg-black/30 font-mono text-xs overflow-x-auto text-text-primary">
            {JSON.stringify(
              clientType === "antigravity" ? stdioConfig : sseConfig,
              null,
              2,
            )}
          </pre>

          <button
            type="button"
            onClick={() => copyConfig(clientType)}
            className="self-start px-4 py-2 text-xs font-medium rounded-[10px] bg-accent text-white hover:opacity-90 transition-opacity"
          >
            Copy{" "}
            {clientType === "antigravity" ? "Antigravity / Claude" : "Cursor"}{" "}
            Config
          </button>
        </div>
      </SettingSection>
    </div>
  );
}
