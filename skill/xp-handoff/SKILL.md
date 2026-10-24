---
name: xp-handoff
description: Used before delivering deck. 18 editability rules, 0–100 scoring,
  exports _editable + _flat, naming, grouping, notes.
---

# Handoff & editability

Beautiful but uneditable = defective product. Editability is a gate on par with aesthetics.

## 18 rules

1. Text is real text, not rasterized.
2. Native shape > SVG > raster; SVG only for icons/logos.
3. Colors/fonts bind theme tokens, no hardcode.
4. Chart is real chart + data sheet.
5. Table is real table.
6. Names by band: `content/card-01`, `data/kpi-revenue`.
7. Group <= 20 objects, nesting <= 2 levels.
8. Clean z-order, no invisible 0% shapes without purpose.
9. Gap between objects >= 0.05in.
10. Text box 10–15% wider than content, autofit off.
11. Use layout + placeholder for repeating sections.
12. Icon SVG remains recolorable.
13. Font embedded or fallback with equivalent metrics.
14. Notes document intent + considered variants.
15. Keep `spec.json` + `deck_rebuild`.
16. Structure-breaking effects in `deco/*` only.
17. PowerPoint-only features -> note version.
18. Export 2 versions: `_editable.pptx` + `_flat.pptx`.

## Editability score (gate >= 80)

| Criterion | Points |
|---|---|
| Native text | 20 |
| Theme bind | 15 |
| Native chart/table | 15 |
| Naming + grouping | 10 |
| Clean z-order | 10 |
| Font coverage + fallback | 10 |
| Spacing/clickability | 10 |
| Notes + spec | 10 |

## Process

`editability_audit` -> fix per report -> `handoff_cleanup` -> `handoff_package`.

## Report

Every point lost must state: objectId, reason, fix, auto-fixable?

## Read next

`xp-quality` -> `xp-effects` (balance section) -> `xp-legal`