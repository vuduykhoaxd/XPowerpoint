import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, existsSync, readdirSync, unlinkSync, statSync } from "node:fs";

const here = path.dirname(fileURLToPath(import.meta.url));

export function projectRoot(): string {
  return path.resolve(here, "../../..");
}

export function outDir(sub = ""): string {
  const dir = path.join(projectRoot(), "output", sub);
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function assetsDir(sub = ""): string {
  const dir = path.join(projectRoot(), "assets", sub);
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function safeName(name: string, fallback = "deck"): string {
  const cleaned = (name || fallback)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return cleaned || fallback;
}

export function longPath(p: string): string {
  if (process.platform !== "win32") return p;
  const abs = path.resolve(p);
  if (abs.startsWith("\\\\?\\")) return abs;
  return abs.length >= 250 ? "\\\\?\\" + abs : abs;
}

export function ensureDir(p: string) {
  mkdirSync(longPath(p), { recursive: true });
  return p;
}

export function fileSizeMB(p: string): number {
  try { return statSync(longPath(p)).size / (1024 * 1024); } catch { return 0; }
}

export function cleanupDir(dir: string, maxAgeMs = 24 * 3600 * 1000) {
  if (!existsSync(dir)) return 0;
  let n = 0;
  const now = Date.now();
  for (const f of readdirSync(dir)) {
    const p = path.join(dir, f);
    try {
      if (now - statSync(p).mtimeMs > maxAgeMs) { unlinkSync(p); n++; }
    } catch { /* ignore */ }
  }
  return n;
}
