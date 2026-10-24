import { sessions } from "../session.js";
import { z } from "zod";
import { existsSync, readFileSync } from "node:fs";
import type { ObjectSpec, ToolDef } from "../types.js";
import { XPError } from "../errors.js";
import { S, sessionOf, slideOf, objectOf, normalizeObject, addSlideObject, okData } from "./helpers.js";

function parseCsv(text: string): { header: string[]; rows: any[][] } {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const header = rows.shift() ?? [];
  const body = rows.filter((r) => r.some((x) => x.trim() !== "")).map((r) => r.map((v) => {
    const n = Number(v.replace(/,/g, ""));
    return v.trim() !== "" && !Number.isNaN(n) && /^-?[\d.,]+$/.test(v.trim()) ? n : v;
  }));
  return { header, rows: body };
}

function dataSources(s: any) { s.spec.dataSources ??= {}; return s.spec.dataSources; }

const dataLoad = (): ToolDef => ({
  name: "data_load",
  description: "Load CSV, JSON, inline data, or URL into the deck's data store.",
  inputSchema: S({ name: z.string().optional(), path: z.string().optional(), url: z.string().optional(), data: z.any().optional(), format: z.string().optional(), csv: z.string().optional() }),
  handler: async (args) => {
    const s = sessionOf({ sessions }, args);
    const name = args.name ?? "data";
    let parsed: any;
    if (args.csv) parsed = parseCsv(args.csv);
    else if (args.data) parsed = args.data;
    else if (args.path) {
      if (!existsSync(args.path)) throw new XPError("E_NOT_FOUND", `File not found: ${args.path}`);
      const text = readFileSync(args.path, "utf8");
      if ((args.format ?? args.path.split(".").pop()) === "csv") parsed = parseCsv(text);
      else parsed = JSON.parse(text);
    } else if (args.url) {
      const res = await fetch(args.url);
      if (!res.ok) throw new XPError("E_NETWORK", `HTTP ${res.status}`);
      const text = await res.text();
      parsed = (args.format ?? "csv") === "json" ? JSON.parse(text) : parseCsv(text);
    } else throw new XPError("E_INVALID_INPUT", "Provide csv, data, path or url");
    const rows = Array.isArray(parsed) ? parsed : parsed.rows ?? [];
    const header = parsed.header ?? (Array.isArray(rows[0]) ? rows[0].map((_: any, i: number) => `c${i + 1}`) : Object.keys(rows[0] ?? {}));
    sessions.mutate(s, () => { dataSources(s)[name] = { name, header, rows, source: args.path ?? args.url ?? "inline", loadedAt: new Date().toISOString() }; });
    return okData({ name, header, rows: rows.length, preview: rows.slice(0, 5) });
  },
});

function tableOf(store: any): { header: string[]; rows: any[][] } {
  if (!store) throw new XPError("E_NOT_FOUND", "Data source not loaded");
  if (store.header && store.rows) return { header: store.header, rows: store.rows.map((r: any) => Array.isArray(r) ? r : store.header.map((h: string) => r[h])) };
  return { header: Object.keys(store[0] ?? {}), rows: store.map((r: any) => Object.values(r)) };
}

const dataTransform = (): ToolDef => ({
  name: "data_transform",
  description: "Filter, sort, select columns, limit and aggregate a data source.",
  inputSchema: S({ name: z.string(), select: z.array(z.string()).optional(), filter: z.object({}).passthrough().optional(), sortBy: z.string().optional(), desc: z.boolean().optional(), limit: z.number().optional(), aggregate: z.object({}).passthrough().optional(), out: z.string().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const src = dataSources(s)[args.name];
    let { header, rows } = tableOf(src);
    let idx = header.map((_, i) => i);
    if (args.select?.length) idx = args.select.map((c: string) => header.indexOf(c)).filter((i: number) => i >= 0);
    if (args.filter) {
      rows = rows.filter((r) => Object.entries(args.filter!).every(([k, v]) => {
        const i = header.indexOf(k);
        return i >= 0 && String(r[i]) === String(v);
      }));
    }
    if (args.sortBy) {
      const i = header.indexOf(args.sortBy);
      rows = [...rows].sort((a, b) => {
        const av = a[i], bv = b[i];
        const n = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
        return args.desc ? -n : n;
      });
    }
    if (args.limit) rows = rows.slice(0, args.limit);
    const outHeader = idx.map((i) => header[i]);
    const outRows = rows.map((r) => idx.map((i) => r[i]));
    const outName = args.out ?? `${args.name}-t`;
    sessions.mutate(s, () => { dataSources(s)[outName] = { name: outName, header: outHeader, rows: outRows, source: args.name, transform: args }; });
    return okData({ name: outName, header: outHeader, rows: outRows.length, preview: outRows.slice(0, 5) });
  },
});

const dataPreview = (): ToolDef => ({
  name: "data_preview",
  description: "Preview a data source.",
  inputSchema: S({ name: z.string(), limit: z.number().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const src = dataSources(s)[args.name];
    const { header, rows } = tableOf(src);
    return okData({ name: args.name, header, rows: rows.length, preview: rows.slice(0, args.limit ?? 10), source: src?.source ?? null });
  },
});

const chartAdd = (): ToolDef => ({
  name: "chart_add",
  description: "Add a native chart from a data source or explicit labels/series.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), dataName: z.string().optional(), type: z.string().optional(), labels: z.array(z.string()).optional(), series: z.array(z.object({}).passthrough()).optional(), title: z.string().optional(), geometry: z.object({}).passthrough().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    let labels = args.labels ?? [];
    let series = args.series ?? [];
    if (args.dataName) {
      const { header, rows } = tableOf(dataSources(s)[args.dataName]);
      labels = rows.map((r) => String(r[0]));
      series = header.slice(1).map((h, i) => ({ name: h, values: rows.map((r) => Number(r[i + 1]) || 0) }));
    }
    if (!series.length) throw new XPError("E_INVALID_INPUT", "Provide dataName or series");
    const geo = args.geometry ?? { x: 0.8, y: 1.5, w: 8, h: 5 };
    const obj = normalizeObject(slide, {
      type: "chart", band: "data", role: "chart", geometry: geo,
      chart: { type: args.type ?? "column", title: args.title, labels, series },
      altText: args.title ?? `Chart: ${series.map((x: any) => x.name).join(", ")}`,
    });
    sessions.mutate(s, () => addSlideObject(s, slide, obj));
    return okData({ objectId: obj.id, chart: obj.chart, dataName: args.dataName ?? null });
  },
});

const chartUpdate = (): ToolDef => ({
  name: "chart_update",
  description: "Update chart type, labels, series, or title.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), objectId: z.string(), patch: z.object({}).passthrough() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const obj = objectOf(slide, args.objectId);
    if (obj.type !== "chart") throw new XPError("E_INVALID_INPUT", "Object is not a chart");
    sessions.mutate(s, () => { obj.chart = { ...(obj.chart ?? {}), ...args.patch }; });
    return okData({ objectId: obj.id, chart: obj.chart });
  },
});

const chartStyle = (): ToolDef => ({
  name: "chart_style",
  description: "Style chart colors, legend, data labels, gridlines, and fonts.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), objectId: z.string(), style: z.object({}).passthrough() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const obj = objectOf(slide, args.objectId);
    if (obj.type !== "chart") throw new XPError("E_INVALID_INPUT", "Object is not a chart");
    sessions.mutate(s, () => { obj.chart = { ...(obj.chart ?? {}), options: { ...(obj.chart?.options ?? {}), ...args.style } }; });
    return okData({ objectId: obj.id, options: obj.chart?.options });
  },
});

const chartAnnotation = (): ToolDef => ({
  name: "chart_annotation",
  description: "Attach a callout annotation to a chart.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), objectId: z.string(), text: z.string(), at: z.object({}).passthrough().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const obj = objectOf(slide, args.objectId);
    if (obj.type !== "chart") throw new XPError("E_INVALID_INPUT", "Object is not a chart");
    const at = args.at ?? { x: obj.geometry.x + obj.geometry.w * 0.6, y: obj.geometry.y - 0.1 };
    const note = normalizeObject(slide, {
      type: "text", band: "data", role: "annotation", geometry: { x: at.x, y: at.y, w: 2.4, h: 0.5 },
      text: { value: args.text, fontSize: 11, color: s.spec.tokens?.color?.text ?? "#111111", align: "left" },
      altText: args.text, sourceRef: obj.id,
    });
    sessions.mutate(s, () => addSlideObject(s, slide, note));
    return okData({ annotationId: note.id, chartId: obj.id });
  },
});

const tableAdd = (): ToolDef => ({
  name: "table_add",
  description: "Add a native table from a data source or explicit rows.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), dataName: z.string().optional(), rows: z.array(z.array(z.any())).optional(), header: z.boolean().optional(), geometry: z.object({}).passthrough().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    let rows = args.rows;
    if (!rows && args.dataName) {
      const { header, rows: body } = tableOf(dataSources(s)[args.dataName]);
      rows = [header, ...body];
    }
    if (!rows?.length) throw new XPError("E_INVALID_INPUT", "Provide dataName or rows");
    const geo = args.geometry ?? { x: 0.8, y: 1.5, w: 11.5, h: Math.min(5.5, 0.4 + rows.length * 0.38) };
    const obj = normalizeObject(slide, {
      type: "table", band: "data", role: "table", geometry: geo,
      table: { rows, header: args.header !== false, zebra: true, options: { fontSize: 11 } },
      altText: `Table with ${rows.length} rows and ${rows[0]?.length ?? 0} columns`,
    });
    sessions.mutate(s, () => addSlideObject(s, slide, obj));
    return okData({ objectId: obj.id, rows: rows.length, cols: rows[0]?.length ?? 0 });
  },
});

const tableStyle = (): ToolDef => ({
  name: "table_style",
  description: "Style table header, zebra, font size, column widths, alignment.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), objectId: z.string(), style: z.object({}).passthrough() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const obj = objectOf(slide, args.objectId);
    if (obj.type !== "table") throw new XPError("E_INVALID_INPUT", "Object is not a table");
    sessions.mutate(s, () => { obj.table = { ...(obj.table ?? {}), ...args.style, options: { ...(obj.table?.options ?? {}), ...(args.style.options ?? {}) } }; });
    return okData({ objectId: obj.id, table: obj.table });
  },
});

const tableConditional = (): ToolDef => ({
  name: "table_conditional",
  description: "Apply conditional cell formatting (rules on column/operator/value).",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), objectId: z.string(), rules: z.array(z.object({}).passthrough()) }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const obj = objectOf(slide, args.objectId);
    if (obj.type !== "table") throw new XPError("E_INVALID_INPUT", "Object is not a table");
    const rows: any[][] = obj.table?.rows ?? [];
    const cells: any[] = [];
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < rows[r].length; c++) {
        const v = Number(rows[r][c]);
        for (const rule of args.rules) {
          if (rule.col != null && rule.col !== c) continue;
          const hit = rule.op === ">" ? v > rule.value : rule.op === "<" ? v < rule.value : rule.op === ">=" ? v >= rule.value : rule.op === "<=" ? v <= rule.value : rule.op === "==" ? String(rows[r][c]) === String(rule.value) : false;
          if (hit) cells.push({ row: r, col: c, fill: rule.fill ?? null, color: rule.color ?? null, bold: rule.bold ?? false });
        }
      }
    }
    sessions.mutate(s, () => { obj.table = { ...(obj.table ?? {}), cellStyles: cells }; });
    return okData({ objectId: obj.id, cells: cells.length });
  },
});

export const dataTools: ToolDef[] = [
  dataLoad(), dataTransform(), dataPreview(), chartAdd(), chartUpdate(), chartStyle(), chartAnnotation(), tableAdd(), tableStyle(), tableConditional(),
];
