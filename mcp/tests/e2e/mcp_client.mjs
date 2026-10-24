import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.resolve(here, "../../bin/server.mjs");

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [serverPath],
  env: { ...process.env, PYTHONIOENCODING: "utf-8" },
});
const client = new Client({ name: "xp-smoke", version: "2.0.0" }, { capabilities: {} });
await client.connect(transport);

let failures = 0;
const check = (cond, label) => {
  console.log((cond ? "  ok  " : "  FAIL ") + label);
  if (!cond) failures++;
};

const tools = await client.listTools();
check(tools.tools.length === 196, `listTools returns 196 (got ${tools.tools.length})`);
check(tools.tools.some((t) => t.name === "deck_new"), "deck_new exposed");

async function call(name, args = {}) {
  const r = await client.callTool({ name, arguments: args });
  const text = r.content?.find((c) => c.type === "text")?.text ?? "{}";
  const data = JSON.parse(text);
  if (!data.ok) throw new Error(`${name}: ${JSON.stringify(data.error)}`);
  return data.data;
}

const deck = await call("deck_new", {
  title: "MCP Client Deck",
  brief: { goal: "MCP handshake", slideCount: 1, language: "vi", output: ["pptx"], approved: true },
});
check(!!deck.deckId, "deck_new over MCP");

const slide = await call("slide_add", { deckId: deck.deckId, type: "statement", title: "Hello MCP" });
check(slide.total === 1, "slide_add over MCP");

const info = await call("deck_info", { deckId: deck.deckId });
check(info.slides.length === 1, "deck_info over MCP");

const res = await client.readResource({ uri: "xp://decks" });
check(!!res.contents?.[0]?.text, "xp://decks resource readable");

await client.close();
console.log(failures ? `\n${failures} failed` : "\nMCP client test OK");
process.exit(failures ? 1 : 0);
