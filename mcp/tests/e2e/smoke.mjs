import { existsSync, statSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getTool, toolCount } from "../../dist/registry.js";
import { sessions } from "../../dist/session.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const outFile = path.resolve(here, "../../../output/decks/smoke.pptx");
mkdirSync(path.dirname(outFile), { recursive: true });

const ctx = { sessions };
let passed = 0;
const failures = [];

function check(cond, label) {
  if (cond) { passed++; console.log("  ok  " + label); }
  else { failures.push(label); console.error("  FAIL " + label); }
}

async function call(name, args = {}) {
  const tool = getTool(name);
  if (!tool) throw new Error("missing tool: " + name);
  const r = await tool.handler({ ...args }, ctx);
  if (!r || r.ok !== true) throw new Error(`${name} failed: ${JSON.stringify(r?.error ?? r)}`);
  return r.data;
}

async function expectFail(name, args, code) {
  const tool = getTool(name);
  try {
    const r = await tool.handler({ ...args }, ctx);
    check(r?.ok === false && (!code || r.error?.code === code), `${name} rejects (${code ?? "any"})`);
    return r;
  } catch (e) {
    check(e?.code === code, `${name} rejects (${code ?? "any"})`);
    return { ok: false, error: { code: e?.code, message: e?.message } };
  }
}

console.log(`XPowerpoint smoke test — ${toolCount} tools registered`);

const deck = await call("deck_new", {
  title: "Smoke Test Deck",
  style: "corporate-clean",
  brief: {
    goal: "Verify end-to-end deck build",
    audience: "internal QA",
    durationMin: 10,
    slideCount: 3,
    language: "vi",
    output: ["pptx"],
    brand: "XPowerpoint",
    approved: true,
  },
});
check(!!deck.deckId, "deck_new returns deckId");
check(deck.slides === 0, "deck_new starts with 0 slides");

const brief = await call("brief_get", { deckId: deck.deckId });
check(brief.approved === true, "brief approved");
check(brief.brief.slideCount === 3, "brief slideCount=3");

await call("slide_add", { deckId: deck.deckId, type: "cover", title: "XPowerpoint Smoke Test" });
await call("slide_add", {
  deckId: deck.deckId,
  type: "text-and-bullets",
  title: "What We Verify",
  params: { items: ["Brief gate blocks unapproved builds", "24 archetypes compose on a 12-column grid", "Export writes an editable PPTX", "Quality gates run before export"] },
});
await call("slide_add", {
  deckId: deck.deckId,
  type: "kpi-dashboard",
  title: "Quality Snapshot",
  params: { items: [{ value: "196", label: "MCP tools" }, { value: "24", label: "Slide archetypes" }, { value: "0", label: "Blockers (target)" }] },
});

const info = await call("deck_info", { deckId: deck.deckId });
check(info.slides.length === 3, "deck_info shows 3 slides");

const spec = await call("validate_spec", { deckId: deck.deckId });
check(spec.ok === true, "validate_spec passes");

const tokens = await call("tokens_get", { deckId: deck.deckId });
check(!!tokens.color && !!tokens.font, "tokens_get returns tokens");

const textObj = sessions.get(deck.deckId).spec.slides[1].objects.find((o) => o.type === "text");
const metrics = await call("text_metrics", { deckId: deck.deckId, objectId: textObj.id });
check(metrics.lines >= 1, "text_metrics measures text");

const qa = await call("qa_report", { deckId: deck.deckId });
check(!!qa.report && !!qa.gates, "qa_report returns a report");

const exported = await call("export_pptx", { deckId: deck.deckId, path: outFile, force: true });
check(existsSync(outFile), "export_pptx writes file");
check(statSync(outFile).size > 10000, "exported pptx is non-trivial");
check(exported.slides === 3, "exported slide count is 3");

const reopened = await call("deck_open", { path: outFile });
check(reopened.slides === 3, "deck_open reads exported pptx");

const gated = await call("deck_new", { title: "Unapproved Deck" });
await expectFail("slide_add", { deckId: gated.deckId, type: "cover", title: "Should fail" }, "E_BRIEF");

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.error("Failures:\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log("Smoke test OK -> " + outFile);
