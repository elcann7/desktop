import readline from "node:readline";

const SERVER_URL = process.env.LINER_MCP_URL || "http://127.0.0.1:4545";

async function main() {
  const sseRes = await fetch(`${SERVER_URL}/sse`, {
    headers: { Accept: "text/event-stream" },
  });

  if (!sseRes.ok || !sseRes.body) {
    console.error(
      `[bridge] Failed to connect to Liner MCP server at ${SERVER_URL}/sse: ${sseRes.statusText}`,
    );
    process.exit(1);
  }

  const reader = sseRes.body.getReader();
  const decoder = new TextDecoder();
  let messageUrl = "";
  let buffer = "";

  // Background loop to read SSE events from Liner and output to process.stdout
  (async () => {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
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
            process.stdout.write(data + "\n");
          }
        }
      }
    }
  })().catch((err) => {
    console.error("[bridge] SSE connection error:", err);
    process.exit(1);
  });

  // Read lines from process.stdin (from Antigravity/Claude) and POST to Liner
  const rl = readline.createInterface({
    input: process.stdin,
    terminal: false,
  });
  for await (const line of rl) {
    if (!line.trim()) continue;
    // Wait until messageUrl is received from SSE handshake
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
