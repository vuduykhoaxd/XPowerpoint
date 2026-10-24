import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../../..");
const pythonDir = path.join(root, "python");

function pythonBin() {
  return process.env.XP_PYTHON || (process.platform === "win32" ? "python" : "python3");
}

export function runPython(script: string, payload = {}, timeoutMs = 120000): Promise<any> {
  return new Promise((resolve) => {
    const file = path.join(pythonDir, script);
    if (!existsSync(file)) {
      resolve({ ok: false, code: "E_NOT_FOUND", message: `Python bridge missing: ${file}` });
      return;
    }
    const child = spawn(pythonBin(), [file], {
      cwd: root,
      env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" },
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      resolve({ ok: false, code: "E_COM_TIMEOUT", message: `Timeout after ${timeoutMs}ms: ${script}`, stderr });
    }, timeoutMs);
    child.stdout.on("data", (d) => (stdout += d.toString("utf8")));
    child.stderr.on("data", (d) => (stderr += d.toString("utf8")));
    child.on("error", (e) => {
      clearTimeout(timer);
      resolve({ ok: false, code: "E_COM_UNAVAILABLE", message: e.message });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      const trimmed = stdout.trim();
      if (!trimmed) {
        resolve({ ok: false, code: code === 0 ? "E_COM_UNAVAILABLE" : "E_COM_TIMEOUT", message: stderr || `exit ${code}`, stderr });
        return;
      }
      try {
        const lines = trimmed.split("\n").filter(Boolean);
        const lastLine = lines.pop();
        if (!lastLine) throw new Error("Empty output");
        const parsed = JSON.parse(lastLine);
        resolve({ ...parsed, stderr: stderr || undefined });
      } catch {
        resolve({ ok: false, code: "E_COM_UNAVAILABLE", message: "Invalid bridge output", raw: trimmed.slice(0, 2000), stderr });
      }
    });
    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

export async function comAvailable() {
  const r: any = await runPython("com_render.py", { action: "probe" }, 30000);
  return Boolean(r.ok && r.available);
}

export async function renderSlides(input: string, outDir: string, formats = ["pdf"], dpi = 150) {
  return runPython("com_render.py", { action: "render", input, outDir, formats, dpi }, 300000);
}

export async function exportVideo(input: string, outPath: string, secondsPerSlide = 3) {
  return runPython("com_render.py", { action: "video", input, outPath, secondsPerSlide }, 900000);
}

export async function applyMotion(input: string, slides: any[], outPath: string) {
  return runPython("com_motion.py", { action: "apply", input, slides, outPath }, 300000);
}

export async function readPptx(input: string) {
  return runPython("pptx_reader.py", { action: "read", input }, 180000);
}

export async function oxml(action: string, payload: any) {
  return runPython("oxml_tools.py", { action, ...payload }, 180000);
}

export async function master(action: string, payload: any) {
  return runPython("com_master.py", { action, ...payload }, 300000);
}
