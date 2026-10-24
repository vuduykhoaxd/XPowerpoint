import { sessions } from "../session.js";
import { z } from "zod";
import { existsSync, readFileSync, writeFileSync, copyFileSync, readdirSync, statSync, unlinkSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import type { ToolDef } from "../types.js";
import { XPError } from "../errors.js";
import { S, sessionOf, okData, payload} from "./helpers.js";
import { webSearch, researchTopic, openverseSearch } from "../research/search.js";
import { checkLicense, normalizeLicense, attributionOf } from "../research/license.js";
import { runPython } from "../engine/com/bridge.js";
import { assetsDir, ensureDir, safeName } from "../utils/paths.js";
import { hashOf, cachePathFor } from "../utils/cache.js";

const UA = "XPowerpoint/0.1 (+asset tool)";

function assetId(hash: string) { return "asset/" + hash; }

function registerAsset(s: any, input: any) {
  const buf = existsSync(input.path) ? readFileSync(input.path) : Buffer.alloc(0);
  const hash = input.hash ?? hashOf(buf.length ? buf : input.path);
  const id = input.id ?? assetId(hash);
  s.spec.assets ??= [];
  const existing = s.spec.assets.find((a: any) => a.id === id);
  if (existing) return { asset: existing, deduped: true };
  const asset = {
    id, type: input.type ?? "image", path: input.path, sourceUrl: input.sourceUrl ?? null,
    license: normalizeLicense(input.license, input.sourceUrl ?? ""), licenseRaw: input.license ?? null,
    author: input.author ?? null, title: input.title ?? null, source: input.source ?? null,
    width: input.width ?? null, height: input.height ?? null, hash,
    attribution: input.attribution ?? attributionOf(input),
    focal: input.focal ?? { x: 0.5, y: 0.5 }, addedAt: new Date().toISOString(),
  };
  s.spec.assets.push(asset);
  return { asset, deduped: false };
}

async function download(url: string, nameHint?: string) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new XPError("E_NETWORK", `Download failed HTTP ${res.status}: ${url}`);
  const ct = res.headers.get("content-type") ?? "";
  if (!/^(image|video|audio|font)\//.test(ct) && !/octet-stream/.test(ct)) throw new XPError("E_INVALID_INPUT", `Unsupported content-type: ${ct}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > 80 * 1024 * 1024) throw new XPError("E_INVALID_INPUT", "File exceeds 80MB limit");
  const ext = /svg/.test(ct) ? ".svg" : /png/.test(ct) ? ".png" : /jpe?g/.test(ct) ? ".jpg" : /webp/.test(ct) ? ".webp" : /gif/.test(ct) ? ".gif" : /mp4/.test(ct) ? ".mp4" : /woff2/.test(ct) ? ".woff2" : path.extname(new URL(url).pathname) || ".bin";
  const hash = hashOf(buf);
  const file = path.join(assetsDir("downloaded"), `${hash}${ext}`);
  if (!existsSync(file)) writeFileSync(file, buf);
  return { file, ext, buf, contentType: ct, hash, name: nameHint ?? path.basename(new URL(url).pathname) };
}

const assetsWebSearch = (): ToolDef => ({
  name: "web_search",
  description: "Search the web for facts/sources (DuckDuckGo).",
  inputSchema: S({ query: z.string(), limit: z.number().optional() }),
  handler: async (args) => {
    const r = await webSearch(args.query, args.limit ?? 8);
    return okData(r, r.warning ? [r.warning] : []);
  },
});

const assetsResearchTopic = (): ToolDef => ({
  name: "research_topic",
  description: "Research a topic: Wikipedia summary + web results.",
  inputSchema: S({ topic: z.string(), limit: z.number().optional() }),
  handler: async (args) => {
    const r = await researchTopic(args.topic, args.limit ?? 8);
    return okData(r, r.warning ? [r.warning] : [], "web_search");
  },
});

const assetsAssetSearch = (): ToolDef => ({
  name: "asset_search",
  description: "Search openly licensed images (Openverse). Icons must come from a licensed icon set.",
  inputSchema: S({ query: z.string(), limit: z.number().optional(), commercialOnly: z.boolean().optional() }),
  handler: async (args) => {
    const r = await openverseSearch(args.query, "image", args.limit ?? 12);
    if (!r.ok) throw new XPError("E_NETWORK", (r as any).warning ?? "Search failed");
    const results = r.results.map((a: any) => {
      const lic = checkLicense(a.license, args.commercialOnly !== false, a.source);
      return { ...a, licenseCheck: lic, blocked: !lic.commercialUse };
    });
    return okData({ results, count: results.length, icons: [] }, ["Icon search is not available offline; use a bundled licensed icon set (Lucide/Material) and record its license."]);
  },
});

const assetsDownload = (): ToolDef => ({
  name: "asset_download",
  description: "Download a remote asset, record license, register it in the deck.",
  inputSchema: S({ url: z.string(), license: z.string().optional(), author: z.string().optional(), title: z.string().optional(), source: z.string().optional() }),
  handler: async (args) => {
    const s = sessionOf({ sessions }, args);
    const d = await download(args.url);
    const reg = registerAsset(s, { path: d.file, sourceUrl: args.url, license: args.license, author: args.author, title: args.title, source: args.source ?? new URL(args.url).hostname, hash: d.hash });
    return okData({ ...reg, contentType: d.contentType }, reg.asset.license === "unknown" ? ["License unknown: blocked for commercial use until confirmed."] : []);
  },
});

const assetsImportUrl = (): ToolDef => ({
  name: "asset_import_url",
  description: "Alias of asset_download for public URLs.",
  inputSchema: S({ url: z.string(), license: z.string().optional(), author: z.string().optional(), title: z.string().optional() }),
  handler: async (args) => {
    const s = sessionOf({ sessions }, args);
    const d = await download(args.url);
    const reg = registerAsset(s, { path: d.file, sourceUrl: args.url, license: args.license, author: args.author, title: args.title, source: new URL(args.url).hostname, hash: d.hash });
    return okData(reg);
  },
});

const assetsLicenseCheck = (): ToolDef => ({
  name: "asset_license_check",
  description: "Check commercial use / attribution for an asset or a license string.",
  inputSchema: S({ assetId: z.string().optional(), license: z.string().optional(), commercial: z.boolean().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const asset = args.assetId ? s.spec.assets?.find((a: any) => a.id === args.assetId) : null;
    if (args.assetId && !asset) throw new XPError("E_NOT_FOUND", `Asset not found: ${args.assetId}`);
    const lic = args.license ?? asset?.license;
    const check = checkLicense(lic, args.commercial !== false, asset?.sourceUrl ?? "");
    return okData({ assetId: args.assetId ?? null, ...check, attribution: asset ? attributionOf(asset) : "" });
  },
});

const assetsMetadata = (): ToolDef => ({
  name: "asset_metadata",
  description: "Read asset metadata and real image dimensions.",
  inputSchema: S({ assetId: z.string().optional(), path: z.string().optional() }),
  handler: async (args) => {
    const s = sessionOf({ sessions }, args);
    const asset = args.assetId ? s.spec.assets?.find((a: any) => a.id === args.assetId) : null;
    const p = args.path ?? asset?.path;
    if (!p) throw new XPError("E_INVALID_INPUT", "Provide assetId or path");
    if (!existsSync(p)) throw new XPError("E_NOT_FOUND", `File not found: ${p}`);
    let meta: any = { sizeBytes: statSync(p).size };
    const r = await runPython("image_tools.py", { action: "metadata", path: p }, 30000);
    if (r.ok) meta = { ...meta, ...(r.metadata ?? payload(r)) };
    return okData({ asset: asset ?? null, path: p, ...meta });
  },
});

const assetsProcessImage = (): ToolDef => ({
  name: "asset_process_image",
  description: "Resize, crop, convert, or compress an image (Pillow).",
  inputSchema: S({ path: z.string(), width: z.number().optional(), height: z.number().optional(), fit: z.string().optional(), format: z.string().optional(), quality: z.number().optional(), out: z.string().optional() }),
  handler: async (args) => {
    const s = sessionOf({ sessions }, args);
    const r = await runPython("image_tools.py", { action: "process", path: args.path, width: args.width, height: args.height, fit: args.fit ?? "cover", format: args.format, quality: args.quality ?? 85, out: args.out }, 120000);
    if (!r.ok) throw new XPError("E_ENGINE", r.message ?? "Image processing failed", r);
    const reg = registerAsset(s, { path: r.path, type: "image", license: "commercial-ok", title: path.basename(r.path) });
    return okData({ ...payload(r), asset: reg.asset });
  },
});

const assetsCropFocal = (): ToolDef => ({
  name: "asset_crop_focal",
  description: "Store a focal point and compute a cover crop box for a target aspect.",
  inputSchema: S({ assetId: z.string(), focalX: z.number().optional(), focalY: z.number().optional(), aspect: z.number().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const asset = s.spec.assets?.find((a: any) => a.id === args.assetId);
    if (!asset) throw new XPError("E_NOT_FOUND", `Asset not found: ${args.assetId}`);
    const W = asset.width ?? 16, H = asset.height ?? 9;
    const aspect = args.aspect ?? 16 / 9;
    const fx = args.focalX ?? 0.5, fy = args.focalY ?? 0.5;
    let cw = W, ch = W / aspect;
    if (ch > H) { ch = H; cw = H * aspect; }
    const x = Math.max(0, Math.min(W - cw, fx * W - cw / 2));
    const y = Math.max(0, Math.min(H - ch, fy * H - ch / 2));
    sessions.mutate(s, () => { asset.focal = { x: fx, y: fy }; asset.crop = { x, y, w: cw, h: ch, aspect }; });
    return okData({ assetId: asset.id, focal: asset.focal, crop: asset.crop });
  },
});

const assetsRemoveBg = (): ToolDef => ({
  name: "asset_remove_bg",
  description: "Remove a flat background (white/flood fill) and register the cutout.",
  inputSchema: S({ assetId: z.string().optional(), path: z.string().optional(), tolerance: z.number().optional() }),
  handler: async (args) => {
    const s = sessionOf({ sessions }, args);
    const asset = args.assetId ? s.spec.assets?.find((a: any) => a.id === args.assetId) : null;
    const p = args.path ?? asset?.path;
    if (!p) throw new XPError("E_INVALID_INPUT", "Provide assetId or path");
    const r = await runPython("image_tools.py", { action: "remove_bg", path: p, tolerance: args.tolerance ?? 18 }, 120000);
    if (!r.ok) throw new XPError("E_ENGINE", r.message ?? "Background removal failed", r);
    const reg = registerAsset(s, { path: r.path, type: "image", license: asset?.license ?? "unknown", sourceUrl: asset?.sourceUrl, author: asset?.author });
    return okData({ path: r.path, asset: reg.asset });
  },
});

const assetsSvgNormalize = (): ToolDef => ({
  name: "asset_svg_normalize",
  description: "Normalize an SVG: add viewBox, remove fixed size, make fills currentColor-compatible.",
  inputSchema: S({ path: z.string(), currentColor: z.boolean().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    if (!existsSync(args.path)) throw new XPError("E_NOT_FOUND", `File not found: ${args.path}`);
    let svg = readFileSync(args.path, "utf8");
    if (!/xmlns=/.test(svg)) svg = svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
    if (!/viewBox=/.test(svg)) {
      const w = Number(svg.match(/\bwidth="([\d.]+)/)?.[1] ?? 24);
      const h = Number(svg.match(/\bheight="([\d.]+)/)?.[1] ?? 24);
      svg = svg.replace("<svg", `<svg viewBox="0 0 ${w} ${h}"`);
    }
    if (args.currentColor) svg = svg.replace(/fill="(?!none)[^"]*"/g, 'fill="currentColor"').replace(/stroke="(?!none)[^"]*"/g, 'stroke="currentColor"');
    const out = path.join(assetsDir("icons"), safeName(path.basename(args.path, ".svg")) + "-norm.svg");
    writeFileSync(out, svg, "utf8");
    const reg = registerAsset(s, { path: out, type: "icon", license: "unknown" });
    return okData({ path: out, asset: reg.asset }, ["Record the icon set license (Lucide ISC, Material Apache-2.0)."]);
  },
});

const assetsRecolor = (): ToolDef => ({
  name: "asset_recolor",
  description: "Recolor an SVG (fills/strokes) or record a duotone for a raster.",
  inputSchema: S({ path: z.string(), color: z.string(), secondary: z.string().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    if (!existsSync(args.path)) throw new XPError("E_NOT_FOUND", `File not found: ${args.path}`);
    if (!args.path.toLowerCase().endsWith(".svg")) throw new XPError("E_INVALID_INPUT", "Recolor supports SVG; use effects_duotone for raster");
    let svg = readFileSync(args.path, "utf8");
    svg = svg.replace(/(fill|stroke)="(?!none)[^"]*"/g, `$1="${args.color}"`);
    const out = path.join(assetsDir("icons"), safeName(path.basename(args.path, ".svg")) + "-recolor.svg");
    writeFileSync(out, svg, "utf8");
    const reg = registerAsset(s, { path: out, type: "icon", license: "unknown" });
    return okData({ path: out, asset: reg.asset });
  },
});

const assetsCacheManage = (): ToolDef => ({
  name: "asset_cache_manage",
  description: "Cache stats or clear downloaded assets and search cache.",
  inputSchema: S({ action: z.enum(["stats", "clear"]).optional() }),
  handler: (args) => {
    const dirs = [assetsDir("cache"), assetsDir("downloaded")];
    if (args.action === "clear") {
      let removed = 0;
      for (const d of dirs) for (const f of readdirSync(d)) { try { unlinkSync(path.join(d, f)); removed++; } catch { /* ignore */ } }
      return okData({ removed });
    }
    return okData({
      cache: dirs.map((d) => ({ dir: d, files: readdirSync(d).length, bytes: readdirSync(d).reduce((n, f) => n + (statSync(path.join(d, f)).size || 0), 0) })),
    });
  },
});

const assetsBrowserCapture = (): ToolDef => ({
  name: "browser_capture",
  description: "Capture a webpage screenshot with headless Chrome/Edge.",
  inputSchema: S({ url: z.string(), width: z.number().optional(), height: z.number().optional(), fullPage: z.boolean().optional() }),
  handler: async (args) => {
    const s = sessionOf({ sessions }, args);
    const candidates = [
      process.env.CHROME_PATH,
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    ].filter(Boolean) as string[];
    const bin = candidates.find((p) => existsSync(p));
    if (!bin) throw new XPError("E_COM_UNAVAILABLE", "Chrome/Edge not found for headless capture");
    const out = path.join(assetsDir("captures"), safeName(new URL(args.url).hostname + "-" + Date.now()) + ".png");
    ensureDir(path.dirname(out));
    const r = spawnSync(bin, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-sandbox", `--window-size=${args.width ?? 1600},${args.height ?? 900}`, `--screenshot=${out}`, args.url], { timeout: 60000 });
    if (!existsSync(out)) throw new XPError("E_ENGINE", "Capture failed", { stderr: r.stderr?.toString().slice(0, 800) });
    const reg = registerAsset(s, { path: out, type: "image", license: "unknown", sourceUrl: args.url, title: "Web capture" });
    return okData({ path: out, asset: reg.asset }, ["Web captures may contain third-party copyrighted content."]);
  },
});

const assetsUpload = (): ToolDef => ({
  name: "asset_upload",
  description: "Register a local file as a deck asset.",
  inputSchema: S({ path: z.string(), license: z.string().optional(), author: z.string().optional(), title: z.string().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    if (!existsSync(args.path)) throw new XPError("E_NOT_FOUND", `File not found: ${args.path}`);
    const ext = path.extname(args.path);
    const hash = hashOf(readFileSync(args.path));
    const dest = path.join(assetsDir("uploaded"), `${hash}${ext}`);
    if (!existsSync(dest)) copyFileSync(args.path, dest);
    const reg = registerAsset(s, { path: dest, license: args.license, author: args.author, title: args.title ?? path.basename(args.path), hash });
    return okData(reg);
  },
});

const assetsDedupe = (): ToolDef => ({
  name: "asset_dedupe",
  description: "Remove duplicate assets by hash.",
  inputSchema: S({}),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const seen = new Set<string>();
    const removed: string[] = [];
    s.spec.assets ??= [];
    sessions.mutate(s, () => {
      s.spec.assets = s.spec.assets!.filter((a: any) => {
        if (seen.has(a.hash ?? a.path)) { removed.push(a.id); return false; }
        seen.add(a.hash ?? a.path);
        return true;
      });
    });
    return okData({ removed, assets: s.spec.assets.length });
  },
});

export const assetTools: ToolDef[] = [
  assetsWebSearch(), assetsResearchTopic(), assetsAssetSearch(), assetsDownload(), assetsImportUrl(), assetsLicenseCheck(),
  assetsMetadata(), assetsProcessImage(), assetsCropFocal(), assetsRemoveBg(), assetsSvgNormalize(), assetsRecolor(),
  assetsCacheManage(), assetsBrowserCapture(), assetsUpload(), assetsDedupe(),
];
