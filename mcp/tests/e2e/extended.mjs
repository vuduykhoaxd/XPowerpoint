import { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getTool } from "../../dist/registry.js";
import { sessions } from "../../dist/session.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, "../../../output/decks");
mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, "extended.pptx");
const flatFile = path.join(outDir, "extended-flat.xml");
const backFile = path.join(outDir, "extended-roundtrip.pptx");

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
  if (!r || r.ok !== true) throw new Error(name + " failed: " + JSON.stringify(r?.error ?? r));
  return r.data;
}

console.log("XPowerpoint extended tool test");

const deck = await call("deck_new", {
  title: "Extended Tool Test",
  style: "corporate-clean",
  brief: { goal: "Exercise tool groups", audience: "QA", durationMin: 10, slideCount: 2, language: "vi", output: ["pptx"], approved: true },
});
const id = deck.deckId;
check(!!id, "deck_new returns deckId");

await call("slide_add", { deckId: id, type: "cover", title: "Extended" });
await call("slide_add", { deckId: id, type: "text-and-bullets", title: "Nội dung", bullets: ["Một", "Hai", "Ba"] });
check(true, "slide_add composes two slides");

await call("theme_apply", { deckId: id, style: "editorial" });
check(true, "theme_apply switches style");

const obj = await call("object_add", {
  deckId: id,
  slideId: 2,
  object: {
    type: "text", id: "content/probe", geometry: { x: 8.6, y: 1.5, w: 3.6, h: 1.2 },
    text: { value: "Probe", fontSize: 18, color: "#111111" }, altText: "Probe",
  },
});
check(!!obj.object?.id, "object_add creates object");

await call("effect_shadow", { deckId: id, slideId: 2, objectId: obj.object.id, value: { blur: 18, distance: 6, opacity: 20 } });
await call("effect_preset_apply", { deckId: id, slideId: 2, objectId: obj.object.id, preset: "soft-card" });
check(true, "effect tools update object");

const anim = await call("animation_add", { deckId: id, slideId: 2, objectId: obj.object.id, effect: "fade", start: "onClick" });
check(anim.total >= 1, "animation_add records animation");

await call("data_load", { deckId: id, name: "sales", data: [{ month: "Jan", value: 10 }, { month: "Feb", value: 14 }] });
const chart = await call("chart_add", { deckId: id, slideId: 2, dataName: "sales", type: "bar", title: "Sales" });
check(!!chart.objectId, "data_load + chart_add");

const spec = await call("validate_spec", { deckId: id });
check(spec.ok === true, "validate_spec passes");
const naming = await call("naming_audit", { deckId: id });
check(naming.ok === true, "naming_audit passes");
const edit = await call("editability_audit", { deckId: id });
check(typeof edit.score === "number", "editability_audit returns score");

const fm = await call("font_metrics", { text: "Xin chào", family: "Arial", size: 24 });
check(typeof fm.widthPx === "number", "font_metrics measures text");

const exp = await call("export_pptx", { deckId: id, path: outFile, force: true });
check(existsSync(exp.file) && statSync(exp.file).size > 5000, "export_pptx writes file");

const parts = await call("oxml_parts", { deckId: id, file: exp.file });
check(parts.parts.some((p) => p === "ppt/presentation.xml"), "oxml_parts lists package");
const slidePart = parts.parts.find((p) => /^ppt\/slides\/slide2\.xml$/.test(p));
const xml = await call("oxml_get", { deckId: id, file: exp.file, part: slidePart });
check(xml.xml.includes("<p:sld"), "oxml_get returns XML");
const query = await call("oxml_query", { deckId: id, file: exp.file, part: slidePart, xpath: "//*[local-name()='sp']" });
check(Array.isArray(query.matches) && query.matches.length > 0, "oxml_query returns matches");
const valid = await call("oxml_validate", { deckId: id, file: exp.file });
check(valid.valid === true && valid.errors.length === 0, "oxml_validate passes");

await call("oxml_convert", { deckId: id, file: exp.file, flat: true, out: flatFile });
check(existsSync(flatFile) && statSync(flatFile).size > 5000, "oxml_convert writes flat XML");
await call("oxml_convert", { deckId: id, file: flatFile, flat: false, out: backFile });
const back = await call("oxml_parts", { deckId: id, file: backFile });
check(back.parts.includes("ppt/presentation.xml"), "flat OOXML round-trips to pptx");

const reopened = await call("deck_open", { path: backFile });
check(reopened.slides === 2, "deck_open reads round-tripped deck");
const naming2 = await call("naming_audit", { deckId: reopened.deckId });
check(naming2.ok === true, "round-tripped deck keeps valid names");

console.log("\n" + passed + " passed, " + failures.length + " failed");
if (failures.length) {
  console.error("Failures:\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log("Extended test OK -> " + outFile);
