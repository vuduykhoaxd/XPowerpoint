import { sessions } from "../session.js";
import { z } from "zod";
import { existsSync, writeFileSync, copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import type { ToolDef } from "../types.js";
import { XPError } from "../errors.js";
import { S, sessionOf, okData, payload} from "./helpers.js";
import { runPython, master } from "../engine/com/bridge.js";
import { assetsDir } from "../utils/paths.js";
import { safeName } from "../utils/paths.js";

interface FontEntry { family: string; category: string; license: string; vn: boolean; weights: number[]; note?: string }

const CATALOG: FontEntry[] = [
  { family: "Be Vietnam Pro", category: "sans", license: "OFL", vn: true, weights: [400, 500, 600, 700] },
  { family: "Inter", category: "sans", license: "OFL", vn: true, weights: [400, 500, 600, 700] },
  { family: "Noto Sans", category: "sans", license: "OFL", vn: true, weights: [400, 500, 700] },
  { family: "Source Sans 3", category: "sans", license: "OFL", vn: true, weights: [400, 600, 700] },
  { family: "IBM Plex Sans", category: "sans", license: "OFL", vn: true, weights: [400, 500, 600, 700] },
  { family: "Montserrat", category: "sans", license: "OFL", vn: true, weights: [400, 600, 700] },
  { family: "Manrope", category: "sans", license: "OFL", vn: true, weights: [400, 600, 800] },
  { family: "Plus Jakarta Sans", category: "sans", license: "OFL", vn: true, weights: [400, 600, 800] },
  { family: "Lora", category: "serif", license: "OFL", vn: true, weights: [400, 600, 700] },
  { family: "Playfair Display", category: "serif", license: "OFL", vn: true, weights: [400, 600, 700] },
  { family: "Merriweather", category: "serif", license: "OFL", vn: true, weights: [400, 700] },
  { family: "IBM Plex Mono", category: "mono", license: "OFL", vn: false, weights: [400, 600] },
  { family: "JetBrains Mono", category: "mono", license: "OFL", vn: false, weights: [400, 700] },
  { family: "Segoe UI", category: "system", license: "commercial-ok", vn: true, weights: [400, 600, 700], note: "Windows system font; present on Windows only" },
  { family: "Arial", category: "system", license: "commercial-ok", vn: true, weights: [400, 700], note: "Windows system font" },
  { family: "Georgia", category: "system", license: "commercial-ok", vn: true, weights: [400, 700], note: "Windows system font" },
];

async function googleFontCss(family: string, weight = 400, subset = "vietnamese") {
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@${weight}&subset=${subset}&display=swap`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36" } });
  if (!res.ok) throw new XPError("E_NETWORK", `Google Fonts HTTP ${res.status} for ${family}`);
  return await res.text();
}

const fontsSearch = (): ToolDef => ({
  name: "font_search",
  description: "Search the curated font catalog (Vietnamese coverage, license).",
  inputSchema: S({ query: z.string().optional(), category: z.string().optional(), vnOnly: z.boolean().optional() }),
  handler: (args) => {
    const q = (args.query ?? "").toLowerCase();
    const fonts = CATALOG.filter((f) => (!q || f.family.toLowerCase().includes(q)) && (!args.category || f.category === args.category) && (!args.vnOnly || f.vn));
    return okData({ fonts, count: fonts.length });
  },
});

const fontsDownload = (): ToolDef => ({
  name: "font_download",
  description: "Download a Google Font file (woff2/ttf) into assets/fonts.",
  inputSchema: S({ family: z.string(), weight: z.number().optional(), subset: z.string().optional() }),
  handler: async (args) => {
    const css = await googleFontCss(args.family, args.weight ?? 400, args.subset ?? "vietnamese");
    const urls = [...css.matchAll(/url\((https:[^)]+)\)/g)].map((m) => m[1]);
    if (!urls.length) throw new XPError("E_NETWORK", "No font file URL in CSS");
    const url = urls[urls.length - 1];
    const res = await fetch(url);
    if (!res.ok) throw new XPError("E_NETWORK", `Font download HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const ext = url.endsWith(".woff2") ? ".woff2" : url.endsWith(".ttf") ? ".ttf" : ".woff2";
    const out = path.join(assetsDir("fonts"), `${safeName(args.family)}-${args.weight ?? 400}${ext}`);
    writeFileSync(out, buf);
    const entry = CATALOG.find((f) => f.family.toLowerCase() === args.family.toLowerCase());
    return okData({ path: out, bytes: buf.length, license: entry?.license ?? "unknown", note: entry?.note ?? null });
  },
});

const fontsInstall = (): ToolDef => ({
  name: "font_install",
  description: "Install a font file for the current user (Windows) and register it.",
  inputSchema: S({ path: z.string() }),
  handler: (args) => {
    if (!existsSync(args.path)) throw new XPError("E_NOT_FOUND", `Font not found: ${args.path}`);
    if (process.platform !== "win32") throw new XPError("E_COM_UNAVAILABLE", "font_install is Windows-only");
    const destDir = path.join(process.env.LOCALAPPDATA ?? "", "Microsoft", "Windows", "Fonts");
    mkdirSync(destDir, { recursive: true });
    const dest = path.join(destDir, path.basename(args.path));
    copyFileSync(args.path, dest);
    const name = path.basename(args.path);
    const reg = spawnSync("reg", ["add", "HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Fonts", "/v", name, "/t", "REG_SZ", "/d", dest, "/f"], { windowsHide: true });
    return okData({ installed: dest, registered: reg.status === 0 }, reg.status === 0 ? [] : ["Registry write failed; font copied but may need a PowerPoint restart."]);
  },
});

const fontsEmbed = (): ToolDef => ({
  name: "font_embed",
  description: "Embed fonts into a built pptx (COM). Writes <name>-embedded.pptx unless out is given.",
  inputSchema: S({ file: z.string(), out: z.string().optional() }),
  handler: async (args) => {
    const s = sessionOf({ sessions }, args);
    if (!existsSync(args.file)) throw new XPError("E_NOT_FOUND", `File not found: ${args.file}`);
    const r = await master("embedFonts", { input: args.file, out: args.out });
    if (!r.ok) throw new XPError("E_COM_UNAVAILABLE", r.message ?? "Font embedding requires PowerPoint COM", r);
    return okData({ file: r.file, embedded: true, engine: r, fonts: s.spec.tokens?.font ?? null });
  },
});

const fontsFallback = (): ToolDef => ({
  name: "font_fallback",
  description: "Return a safe fallback stack for a font family.",
  inputSchema: S({ family: z.string() }),
  handler: (args) => {
    const f = CATALOG.find((x) => x.family.toLowerCase() === args.family.toLowerCase());
    const cat = f?.category ?? "sans";
    const stack = cat === "serif" ? [args.family, "Georgia", "Times New Roman", "serif"] : cat === "mono" ? [args.family, "Consolas", "Courier New", "monospace"] : [args.family, "Segoe UI", "Arial", "sans-serif"];
    return okData({ family: args.family, stack, css: stack.map((x) => (x.includes(" ") ? `"${x}"` : x)).join(", ") });
  },
});

const fontsPair = (): ToolDef => ({
  name: "font_pair",
  description: "Suggest heading/body font pairings.",
  inputSchema: S({ style: z.string().optional(), vnOnly: z.boolean().optional() }),
  handler: (args) => {
    const pool = CATALOG.filter((f) => f.category !== "system" && (!args.vnOnly || f.vn));
    const sans = pool.filter((f) => f.category === "sans");
    const serif = pool.filter((f) => f.category === "serif");
    const pairs = [
      { heading: "Be Vietnam Pro", body: "Be Vietnam Pro", use: "Clean corporate, single family" },
      { heading: "Playfair Display", body: "Inter", use: "Editorial premium" },
      { heading: "Montserrat", body: "Source Sans 3", use: "Modern marketing" },
      { heading: "IBM Plex Sans", body: "IBM Plex Sans", use: "Technical/data" },
      { heading: "Lora", body: "Manrope", use: "Warm editorial" },
      { heading: "Manrope", body: "Inter", use: "Product/startup" },
    ].filter((p) => pool.some((f) => f.family === p.heading) && pool.some((f) => f.family === p.body));
    return okData({ pairs, sans: sans.map((f) => f.family), serif: serif.map((f) => f.family) });
  },
});

const fontsSubset = (): ToolDef => ({
  name: "font_subset",
  description: "Subset a font to Vietnamese + Latin (requires fonttools).",
  inputSchema: S({ path: z.string(), text: z.string().optional(), out: z.string().optional() }),
  handler: async (args) => {
    const text = args.text ?? "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ĂÂĐÊÔƠƯăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ";
    const ext = path.extname(args.path);
    const out = args.out ?? path.join(assetsDir("fonts"), safeName(path.basename(args.path, ext)) + "-subset" + ext);
    const r = await runPython("font_tools.py", { action: "subset", path: args.path, text, out }, 120000);
    if (!r.ok) throw new XPError("E_ENGINE", r.message ?? "Subset failed (pip install fonttools)", r);
    return okData(payload(r));
  },
});

const fontsAudit = (): ToolDef => ({
  name: "font_audit",
  description: "Audit all fonts used in the deck: catalog status, Vietnamese coverage, fallback.",
  inputSchema: S({}),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const used = new Map<string, number>();
    for (const sl of s.spec.slides) for (const o of sl.objects) if (o.text?.fontFamily) used.set(o.text.fontFamily, (used.get(o.text.fontFamily) ?? 0) + 1);
    const fonts = [...used.entries()].map(([family, count]) => {
      const entry = CATALOG.find((f) => f.family.toLowerCase() === family.toLowerCase());
      return { family, count, known: Boolean(entry), license: entry?.license ?? "unknown", vnCoverage: entry?.vn ?? null, risk: !entry ? "unknown-font" : !entry.vn ? "vn-coverage-unverified" : null };
    });
    return okData({ fonts, unknown: fonts.filter((f) => !f.known).length });
  },
});

const fontsRecommend = (): ToolDef => ({
  name: "font_recommend",
  description: "Recommend fonts by tone, language and medium.",
  inputSchema: S({ tone: z.string().optional(), language: z.string().optional(), medium: z.string().optional() }),
  handler: (args) => {
    const tone = (args.tone ?? "corporate").toLowerCase();
    const map: Record<string, string[]> = {
      corporate: ["Be Vietnam Pro", "IBM Plex Sans", "Source Sans 3"],
      editorial: ["Lora", "Playfair Display", "Merriweather"],
      tech: ["Inter", "IBM Plex Sans", "JetBrains Mono"],
      premium: ["Playfair Display", "Lora", "Montserrat"],
      playful: ["Plus Jakarta Sans", "Manrope", "Montserrat"],
      minimal: ["Inter", "Manrope", "IBM Plex Sans"],
    };
    const picks = (map[tone] ?? map.corporate).map((family) => CATALOG.find((f) => f.family === family)).filter(Boolean);
    return okData({ tone, language: args.language ?? "vi", picks, note: "All picks have Vietnamese glyph coverage (except mono)." });
  },
});

const fontsVnCoverage = (): ToolDef => ({
  name: "font_vn_coverage",
  description: "Check Vietnamese glyph coverage for a font family or file.",
  inputSchema: S({ family: z.string().optional(), path: z.string().optional() }),
  handler: async (args) => {
    const text = "ĂÂĐÊÔƠƯăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ";
    if (args.path) {
      const r = await runPython("font_tools.py", { action: "coverage", path: args.path, text }, 60000);
      if (r.ok) return okData(payload(r));
    }
    const entry = CATALOG.find((f) => f.family.toLowerCase() === (args.family ?? "").toLowerCase());
    if (!entry) return okData({ family: args.family, coverage: "unknown", missing: null }, ["Font not in catalog; verify with the actual file."]);
    return okData({ family: entry.family, coverage: entry.vn ? "full" : "partial", missing: entry.vn ? [] : ["Vietnamese diacritics unverified"] });
  },
});

const fontsMetrics = (): ToolDef => ({
  name: "font_metrics",
  description: "Measure text width/height in a font (Pillow if available, else estimate).",
  inputSchema: S({ text: z.string(), family: z.string().optional(), size: z.number().optional(), path: z.string().optional() }),
  handler: async (args) => {
    const r = await runPython("font_tools.py", { action: "metrics", text: args.text, family: args.family ?? "Segoe UI", size: args.size ?? 18, path: args.path }, 60000);
    if (r.ok) return okData(payload(r));
    return okData({ estimated: true, widthIn: args.text.length * (args.size ?? 18) * 0.52 / 72, note: "Pillow/fontTools unavailable; estimate only" });
  },
});

const fontsPairScore = (): ToolDef => ({
  name: "font_pair_score",
  description: "Score a heading/body font pairing.",
  inputSchema: S({ heading: z.string(), body: z.string() }),
  handler: (args) => {
    const h = CATALOG.find((f) => f.family.toLowerCase() === args.heading.toLowerCase());
    const b = CATALOG.find((f) => f.family.toLowerCase() === args.body.toLowerCase());
    let score = 50;
    const notes: string[] = [];
    if (h && b) {
      if (h.category !== b.category) { score += 20; notes.push("Contrasting categories"); }
      else { score += 8; notes.push("Same category: use weight contrast"); }
      if (h.vn && b.vn) { score += 20; notes.push("Both cover Vietnamese"); }
      if (h.license === "OFL" && b.license === "OFL") { score += 10; notes.push("Both OFL"); }
    } else { score -= 20; notes.push("Unknown font in catalog"); }
    return okData({ heading: args.heading, body: args.body, score: Math.max(0, Math.min(100, score)), notes });
  },
});

export const fontTools: ToolDef[] = [
  fontsSearch(), fontsDownload(), fontsInstall(), fontsEmbed(), fontsFallback(), fontsPair(),
  fontsSubset(), fontsAudit(), fontsRecommend(), fontsVnCoverage(), fontsMetrics(), fontsPairScore(),
];
