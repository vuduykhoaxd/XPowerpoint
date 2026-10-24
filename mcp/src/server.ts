import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { allTools, getTool, toolCount, toolNames } from "./registry.js";
import { sessions } from "./session.js";
import type { ToolContext, ToolResult } from "./types.js";
import { XPError, fail } from "./errors.js";

const server = new McpServer({ name: "xpowerpoint", version: "1.0.0" });
const ctx: ToolContext = { sessions };

function toolResult(result: ToolResult) {
  return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
}

async function handler(name: string, args: any): Promise<ToolResult> {
  const tool = getTool(name);
  if (!tool) return fail("E_NOT_FOUND", `Tool not found: ${name}`, { available: toolNames() });
  try {
    return await tool.handler(args, ctx);
  } catch (e: any) {
    if (e instanceof XPError) return e.toResult();
    console.error("[tool error]", name, e);
    return fail("E_INTERNAL", e?.message ?? String(e));
  }
}

for (const tool of allTools) {
  const schema = tool.inputSchema as any;
  const desc = tool.description ?? "";
  try {
    const srv = server as any;
    if (typeof srv.registerTool === "function") {
      srv.registerTool(tool.name, { title: tool.title ?? tool.name, description: desc, inputSchema: schema }, async (args: any) => toolResult(await handler(tool.name, args)));
    } else if (typeof srv.tool === "function") {
      srv.tool(tool.name, desc, schema, async (args: any) => toolResult(await handler(tool.name, args)));
    } else {
      console.warn("[server] neither registerTool nor tool available, skipping", tool.name);
    }
  } catch (e) {
    console.warn("[server] register failed", tool.name, e);
  }
}

server.resource("xp://decks", new ResourceTemplate("xp://decks", { list: undefined }), async () => {
  return { contents: [{ uri: "xp://decks", mimeType: "application/json", text: JSON.stringify(sessions.list()) }] };
});

server.resource("xp://deck/{deckId}", new ResourceTemplate("xp://deck/{deckId}", { list: undefined }), async (uri: any) => {
  const deckId = String(uri.path ?? "").split("/").pop();
  const s = sessions.get(deckId);
  return { contents: [{ uri: `xp://deck/${deckId}`, mimeType: "application/json", text: JSON.stringify(s.spec) }] };
});

async function main() {
  console.error(`XPowerpoint MCP server starting (${toolCount} tools)...`);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Connected via stdio");
}

main().catch((e) => {
  console.error("Server fatal:", e);
  process.exit(1);
});

export { server };
