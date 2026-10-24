import type { ToolResult } from "./types.js";

export type ErrorCode =
  | "E_BRIEF" | "E_SPEC" | "E_GEOMETRY" | "E_OVERFLOW" | "E_OVERLAP"
  | "E_CONTRAST" | "E_FONT_MISSING" | "E_LICENSE" | "E_COM_UNAVAILABLE"
  | "E_COM_TIMEOUT" | "E_FILE_LOCKED" | "E_BUDGET" | "E_NOT_FOUND"
  | "E_INVALID_INPUT" | "E_EXPORT" | "E_NETWORK" | "E_NOT_IMPLEMENTED"
  | "E_ENGINE" | "E_GATE" | "E_INTERNAL";

const NEXT: Record<ErrorCode, string | null> = {
  E_BRIEF: "intake_questions",
  E_SPEC: "validate_spec",
  E_GEOMETRY: "layout_reflow",
  E_OVERFLOW: "text_autofit",
  E_OVERLAP: "layout_collision",
  E_CONTRAST: "validate_contrast",
  E_FONT_MISSING: "font_fallback",
  E_LICENSE: "asset_license_check",
  E_COM_UNAVAILABLE: "render_slides",
  E_COM_TIMEOUT: null,
  E_FILE_LOCKED: null,
  E_BUDGET: "layout_break_plan",
  E_NOT_FOUND: "deck_info",
  E_INVALID_INPUT: "validate_spec",
  E_EXPORT: "export_pptx",
  E_NETWORK: "asset_search",
  E_NOT_IMPLEMENTED: null,
  E_ENGINE: "com_probe",
  E_GATE: "quality_report",
  E_INTERNAL: null,
};

export class XPError extends Error {
  code: ErrorCode;
  details?: any;
  nextAction: string | null;
  constructor(code: ErrorCode, message: string, details?: any) {
    super(message);
    this.code = code;
    this.details = details;
    this.nextAction = NEXT[code] ?? null;
  }
  toResult(): ToolResult {
    return {
      ok: false,
      error: { code: this.code, message: this.message, next_action: this.nextAction ?? undefined, details: this.details },
    };
  }
}

export function ok(data: any = {}, warnings: string[] = [], next_action: string | null = null): ToolResult {
  return { ok: true, data, warnings, next_action };
}

export function fail(code: ErrorCode, message: string, details?: any): ToolResult {
  return new XPError(code, message, details).toResult();
}

export function assert(condition: any, code: ErrorCode, message: string, details?: any): asserts condition {
  if (!condition) throw new XPError(code, message, details);
}
