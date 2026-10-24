import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import type { DeckSpec } from "../types.js";
import { checkAllOverflow } from "./overflow.js";
import { checkAllOverlap } from "./overlap.js";
import { checkAllContrast } from "./contrast.js";
import { checkConsistency, occupancyOf, safeAreaOf } from "./consistency.js";
import { checkAccessibility, checkNaming } from "./accessibility.js";
import { editabilityAudit } from "./editability.js";

export function fullReport(deck: DeckSpec, gate = 80) {
  const overflow = checkAllOverflow(deck);
  const overlap = checkAllOverlap(deck);
  const contrast = checkAllContrast(deck);
  const consistency = checkConsistency(deck);
  const a11y = checkAccessibility(deck);
  const naming = checkNaming(deck);
  const editability = editabilityAudit(deck, gate);
  const violations = [...overflow, ...overlap, ...contrast, ...consistency, ...a11y.violations, ...naming];
  const blockers = violations.filter((v) => v.severity === "blocker");
  const gates = [
    { id: "G4", name: "Layout overflow", pass: overflow.length === 0, score: overflow.length, threshold: 0, details: { count: overflow.length } },
    { id: "G4b", name: "Layout overlap", pass: overlap.length === 0, score: overlap.length, threshold: 0, details: { count: overlap.length } },
    { id: "G5", name: "Contrast", pass: contrast.length === 0, score: contrast.length, threshold: 0, details: { count: contrast.length } },
    { id: "G6", name: "Accessibility alt text", pass: a11y.missing === 0, score: a11y.coverage, threshold: 1, details: { coverage: a11y.coverage, missing: a11y.missing } },
    { id: "G9", name: "Editability", pass: editability.pass, score: editability.score, threshold: gate, details: editability.criteria },
  ];
  return {
    ok: blockers.length === 0 && gates.every((g) => g.pass),
    deckId: null,
    generatedAt: new Date().toISOString(),
    gates, blockers, violations,
    summary: {
      slides: deck.slides.length,
      objects: deck.slides.reduce((n, s) => n + s.objects.length, 0),
      occupancy: deck.slides.map((s) => ({ slideId: s.id, occupancy: Number(occupancyOf(deck, s).toFixed(3)) })),
      safeArea: safeAreaOf(deck),
    },
    editability,
  };
}

export function writeReport(report: any, dir: string, name = "qa-report.json") {
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, name);
  writeFileSync(file, JSON.stringify(report, null, 2), "utf8");
  return file;
}

export function summarize(report: any) {
  return {
    ok: report.ok,
    gates: report.gates.map((g: any) => ({ id: g.id, pass: g.pass, score: g.score, threshold: g.threshold })),
    blockers: report.blockers.length,
    warnings: report.violations.filter((v: any) => v.severity !== "blocker").length,
    editability: report.editability?.score,
    summary: report.summary,
  };
}
