import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { allTools, getTool, toolCount, toolNames } from "./registry.js";
import { sessions } from "./session.js";
import type { ToolContext, ToolResult, ElicitParams, ElicitResult } from "./types.js";
import { XPError, fail } from "./errors.js";

const server = new McpServer({ name: "xpowerpoint", version: "2.1.0" });

function toolResult(result: ToolResult) {
  return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
}

/**
 * Gọi MCP elicitation nếu SDK & client hỗ trợ.
 * Trả null nếu không khả dụng.
 */
async function tryElicit(params: ElicitParams): Promise<ElicitResult | null> {
  const srv: any = server.server;
  if (typeof srv?.elicitInput !== "function") return null;
  try {
    const r = await srv.elicitInput(params);
    if (!r) return null;
    return {
      action: r.action ?? "cancel",
      content: r.content ?? r.params ?? undefined,
    };
  } catch (e) {
    console.warn("[elicit] failed:", (e as any)?.message ?? e);
    return null;
  }
}

/**
 * Gate: kiểm tra brief và hỏi bổ sung trước khi build.
 * Nếu client không hỗ trợ elicit, ghi assumption để pipeline vẫn chạy.
 * Sau khi thu thập đủ, tự động approve brief.
 */
async function intakeGate(session: any, ctx: ToolContext): Promise<string[]> {
  const notes: string[] = [];
  const brief: any = session?.spec?.brief ?? {};
  const elicit = ctx.elicit ?? tryElicit;

  const ask: { field: string; question: string; schema: any }[] = [];

  if (!brief.topic) ask.push({
    field: "topic",
    question: "Bạn muốn tạo PPTX về chủ đề gì? (càng cụ thể càng tốt)",
    schema: {
      type: "object",
      properties: { topic: { type: "string", description: "Chủ đề của bài thuyết trình" } },
      required: ["topic"],
    },
  });

  if (brief.useEffects === undefined) ask.push({
    field: "useEffects",
    question: "Bạn có muốn thêm hiệu ứng (transition/animation) không?",
    schema: {
      type: "object",
      properties: {
        useEffects: {
          type: "boolean",
          description: "true = có animation (cần PowerPoint/COM), false = slide tĩnh",
        },
      },
      required: ["useEffects"],
    },
  });

  if (!brief.slideCount) ask.push({
    field: "slideCount",
    question: "Bạn cần khoảng bao nhiêu slide?",
    schema: {
      type: "object",
      properties: { slideCount: { type: "number", description: "Số slide (ước tính)" } },
      required: ["slideCount"],
    },
  });

  for (const item of ask) {
    const result = await elicit({ message: item.question, requestedSchema: item.schema });
    if (result?.action === "accept" && result.content?.[item.field] !== undefined) {
      session.spec.brief = { ...(session.spec.brief ?? {}), [item.field]: result.content[item.field] };
      notes.push(`set ${item.field} from user`);
    } else {
      // Fallback assumption để không chặn pipeline
      const fallback = item.field === "useEffects"
        ? false
        : item.field === "slideCount"
        ? 10
        : "Untitled deck";
      session.spec.brief = {
        ...(session.spec.brief ?? {}),
        [item.field]: fallback,
        assumptions: [...(session.spec.brief?.assumptions ?? []), `auto:${item.field}`],
      };
      notes.push(`fallback ${item.field}=${JSON.stringify(fallback)}`);
    }
  }

  // ===== TỰ ĐỘNG APPROVE BRIEF =====
  const finalBrief: any = session.spec.brief ?? {};
  if (finalBrief.topic && finalBrief.slideCount > 0 && finalBrief.useEffects !== undefined) {
    session.spec.brief = { ...finalBrief, approved: true };
    notes.push("auto-approved brief after intake");
  } else {
    notes.push(
      `brief incomplete: topic=${!!finalBrief.topic}, slideCount=${finalBrief.slideCount}, useEffects=${finalBrief.useEffects}`,
    );
  }
  // ===== END AUTO-APPROVE =====

  return notes;
}

async function handler(name: string, args: any): Promise<ToolResult> {
  const tool = getTool(name);
  if (!tool) return fail("E_NOT_FOUND", `Tool not found: ${name}`, { available: toolNames() });

  const ctx: ToolContext = {
    sessions,
    elicit: tryElicit,
  };

  // ===== INTAKE GATE =====
  // Chạy gate cho mọi tool cần brief đã approved.
  // Chỉ elicit nếu brief chưa approve (tránh hỏi lại nhiều lần).
  const GATED_TOOLS = new Set([
    "slide_add",
    "slide_add_batch",
    "slide_update",
    "slide_clone",
    "deck_save",
    "deck_save_as",
    "deck_export",
    "deck_handoff",
  ]);
  if (GATED_TOOLS.has(name)) {
    const deckId = (args as any)?.deckId;
    if (deckId) {
      try {
        const session = sessions.get(deckId);
        if (session) {
          const brief: any = session.spec.brief ?? {};
          if (!brief.approved) {
            const notes = await intakeGate(session, ctx);
            if (notes.length) console.error("[intakeGate]", notes.join(", "));
          }
        }
      } catch (e) {
        console.warn("[intakeGate] error:", (e as any)?.message ?? e);
      }
    }
  }
  // ===== END GATE =====

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
      srv.registerTool(
        tool.name,
        { title: tool.title ?? tool.name, description: desc, inputSchema: schema },
        async (args: any) => toolResult(await handler(tool.name, args)),
      );
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