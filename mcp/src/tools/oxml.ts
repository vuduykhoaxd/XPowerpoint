import { sessions } from "../session.js";
import { z } from "zod";
import type { ToolDef } from "../types.js";
import { XPError } from "../errors.js";
import path from "node:path";
import { S, sessionOf, okData } from "./helpers.js";
import { runPython, oxml } from "../engine/com/bridge.js";

const oxmlParts = (): ToolDef => ({
  name: "oxml_parts",
  description: "List all OOXML parts in the deck (slides, layouts, masters, theme, etc.).",
  inputSchema: S({ file: z.string().optional() }),
  handler: async (args) => {
    const s = sessionOf({ sessions }, args);
    const raw = args.file ?? s.filePath;
    if (!raw) throw new XPError("E_INVALID_INPUT", "Provide file or build first");
    const file = path.resolve(raw);
    const r = await oxml("parts", { input: file });
    if (!r.ok) throw new XPError("E_COM_UNAVAILABLE", r.message ?? "OOXML read requires python-lxml", r);
    return okData({ parts: r.parts ?? [] });
  },
});

const oxmlGet = (): ToolDef => ({
  name: "oxml_get",
  description: "Read raw XML of a specific part.",
  inputSchema: S({ file: z.string().optional(), part: z.string() }),
  handler: async (args) => {
    const s = sessionOf({ sessions }, args);
    const raw = args.file ?? s.filePath;
    if (!raw) throw new XPError("E_INVALID_INPUT", "Provide file or build first");
    const file = path.resolve(raw);
    const r = await oxml("get", { input: file, part: args.part });
    if (!r.ok) throw new XPError("E_COM_UNAVAILABLE", r.message ?? "OOXML read failed", r);
    return okData({ part: args.part, xml: r.xml });
  },
});

const oxmlPatch = (): ToolDef => ({
  name: "oxml_patch",
  description: "Patch XML of a part with a string replace or XPath set (lxml).",
  inputSchema: S({ file: z.string().optional(), part: z.string(), xpath: z.string().optional(), find: z.string().optional(), replace: z.string().optional(), out: z.string().optional() }),
  handler: async (args) => {
    const s = sessionOf({ sessions }, args);
    const raw = args.file ?? s.filePath;
    if (!raw) throw new XPError("E_INVALID_INPUT", "Provide file or build first");
    const file = path.resolve(raw);
    const r = await oxml("patch", { input: file, part: args.part, xpath: args.xpath, find: args.find, replace: args.replace, out: args.out });
    if (!r.ok) throw new XPError("E_COM_UNAVAILABLE", r.message ?? "OOXML patch failed", r);
    return okData({ part: args.part, out: r.out ?? args.out ?? file });
  },
});

const oxmlInject = (): ToolDef => ({
  name: "oxml_inject",
  description: "Inject a raw XML snippet into a part (e.g., add custom animation, picture lock).",
  inputSchema: S({ file: z.string().optional(), part: z.string(), xml: z.string(), before: z.string().optional(), after: z.string().optional(), out: z.string().optional() }),
  handler: async (args) => {
    const s = sessionOf({ sessions }, args);
    const raw = args.file ?? s.filePath;
    if (!raw) throw new XPError("E_INVALID_INPUT", "Provide file or build first");
    const file = path.resolve(raw);
    const r = await oxml("inject", { input: file, part: args.part, xml: args.xml, before: args.before, after: args.after, out: args.out });
    if (!r.ok) throw new XPError("E_COM_UNAVAILABLE", r.message ?? "OOXML inject failed", r);
    return okData({ part: args.part, out: r.out ?? args.out ?? file });
  },
});

const oxmlValidate = (): ToolDef => ({
  name: "oxml_validate",
  description: "Validate OOXML well-formedness and schema conformance (optional).",
  inputSchema: S({ file: z.string().optional() }),
  handler: async (args) => {
    const s = sessionOf({ sessions }, args);
    const raw = args.file ?? s.filePath;
    if (!raw) throw new XPError("E_INVALID_INPUT", "Provide file or build first");
    const file = path.resolve(raw);
    const r = await oxml("validate", { input: file });
    if (!r.ok) throw new XPError("E_COM_UNAVAILABLE", r.message ?? "OOXML validation failed", r);
    return okData({ valid: Boolean(r.valid), parts: r.parts ?? 0, errors: r.errors ?? [] });
  },
});

const oxmlRels = (): ToolDef => ({
  name: "oxml_rels",
  description: "List relationships for a part (images, hyperlinks, charts).",
  inputSchema: S({ file: z.string().optional(), part: z.string() }),
  handler: async (args) => {
    const s = sessionOf({ sessions }, args);
    const raw = args.file ?? s.filePath;
    if (!raw) throw new XPError("E_INVALID_INPUT", "Provide file or build first");
    const file = path.resolve(raw);
    const r = await oxml("rels", { input: file, part: args.part });
    if (!r.ok) throw new XPError("E_COM_UNAVAILABLE", r.message ?? "OOXML rels failed", r);
    return okData({ part: args.part, relationships: r.relationships ?? [] });
  },
});

const oxmlQuery = (): ToolDef => ({
  name: "oxml_query",
  description: "Run an XPath query on a part and return matched nodes as XML strings.",
  inputSchema: S({ file: z.string().optional(), part: z.string(), xpath: z.string() }),
  handler: async (args) => {
    const s = sessionOf({ sessions }, args);
    const raw = args.file ?? s.filePath;
    if (!raw) throw new XPError("E_INVALID_INPUT", "Provide file or build first");
    const file = path.resolve(raw);
    const r = await oxml("query", { input: file, part: args.part, xpath: args.xpath });
    if (!r.ok) throw new XPError("E_COM_UNAVAILABLE", r.message ?? "OOXML query failed", r);
    return okData({ part: args.part, xpath: args.xpath, matches: r.matches ?? [] });
  },
});

const oxmlConvert = (): ToolDef => ({
  name: "oxml_convert",
  description: "Convert deck to flat OOXML (flat XML) or back.",
  inputSchema: S({ file: z.string().optional(), flat: z.boolean().optional(), out: z.string().optional() }),
  handler: async (args) => {
    const s = sessionOf({ sessions }, args);
    const raw = args.file ?? s.filePath;
    if (!raw) throw new XPError("E_INVALID_INPUT", "Provide file or build first");
    const file = path.resolve(raw);
    const r = await oxml("convert", { input: file, flat: args.flat ?? true, out: args.out });
    if (!r.ok) throw new XPError("E_COM_UNAVAILABLE", r.message ?? "OOXML convert failed", r);
    return okData({ out: r.out ?? args.out, flat: args.flat });
  },
});

export const oxmlTools: ToolDef[] = [
  oxmlParts(), oxmlGet(), oxmlPatch(), oxmlInject(), oxmlValidate(), oxmlRels(), oxmlQuery(), oxmlConvert(),
];