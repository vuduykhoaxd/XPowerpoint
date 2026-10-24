import { existsSync, readFileSync } from "node:fs";
import { hashOf } from "../utils/cache.js";

export interface DiffResult {
  ok: boolean;
  diffPercent: number;
  available: boolean;
  message?: string;
  a?: string;
  b?: string;
}

export async function visualDiff(a: string, b: string): Promise<DiffResult> {
  if (!existsSync(a) || !existsSync(b)) {
    return { ok: false, diffPercent: 100, available: false, message: "Baseline or render missing", a, b };
  }
  const ha = hashOf(readFileSync(a));
  const hb = hashOf(readFileSync(b));
  if (ha === hb) return { ok: true, diffPercent: 0, available: true, a, b };
  try {
    const { runPython } = await import("../engine/com/bridge.js");
    const r = await runPython("image_diff.py", { a, b, action: "diff" }, 120000);
    if (r.ok) return { ok: (r.diffPercent ?? 100) < 2, diffPercent: r.diffPercent, available: true, a, b };
    return { ok: false, diffPercent: 100, available: false, message: r.message ?? "Python/PIL unavailable", a, b };
  } catch (e: any) {
    return { ok: false, diffPercent: 100, available: false, message: e?.message ?? "diff failed", a, b };
  }
}
