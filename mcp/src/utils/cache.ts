import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { assetsDir } from "./paths.js";

const CACHE_FILE = () => path.join(assetsDir("cache"), "cache.json");

type CacheMap = Record<string, any>;

function load(): CacheMap {
  try { return JSON.parse(readFileSync(CACHE_FILE(), "utf8")); } catch { return {}; }
}

function save(map: CacheMap) {
  writeFileSync(CACHE_FILE(), JSON.stringify(map, null, 2), "utf8");
}

export function hashOf(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 16);
}

export function cacheGet(key: string) {
  const v = load()[key];
  if (v && v.expiresAt && v.expiresAt < Date.now()) return null;
  return v?.value ?? null;
}

export function cacheSet(key: string, value: any, ttlMs = 24 * 3600 * 1000) {
  const map = load();
  map[key] = { value, expiresAt: Date.now() + ttlMs };
  save(map);
  return value;
}

export function cachePathFor(url: string, ext = ""): string {
  return path.join(assetsDir("downloaded"), `${hashOf(url)}${ext}`);
}

export function exists(p: string) { return existsSync(p); }
