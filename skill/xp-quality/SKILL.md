---
name: xp-quality
description: Used before export. Measures overflow/overlap/contrast/typography/a11y,
  render, visual diff, numeric acceptance criteria.
---

# Quality — measure & acceptance

## Gates

| Item | Threshold | Tool |
|---|---|---|
| Safe margin | >= 0.4in | `validate_layout` |
| Occupancy | 45–75% (full-bleed 80–100) | `layout_measure` |
| Body font | >= 14pt (projector >= 18) | `validate_typography` |
| Title/body | >= 1.8× | `validate_typography` |
| Contrast | >= 4.5:1 (large >= 3:1) | `validate_contrast` |
| Overflow | 0 | `validate_layout` |
| Overlap | 0 (except intentional) | `validate_layout` |
| Bullet | <= 6 lines, <= 2 levels | `validate_typography` |
| Chart | title + unit + source + highlight | `validate_consistency` |
| Alt text | 100% non-decorative | `validate_accessibility` |
| Render diff | < 2% | `visual_diff` |
| License | 100% known + attribution | `validate_licenses` |
| Editability | >= 80 | `editability_audit` |
| Native | 0 rasterized text/chart/table | `native_check` |
| Theme bind | 0 hardcoded | `theme_bind_audit` |
| Font VN | 100% chars render correct | `font_audit` |
| Naming | 100% per band | `naming_audit` |
| Fragments | <= 60/slide + edit-source | `editability_audit` |

## Process

1. `validate_spec`
2. `layout_measure`
3. `validate_layout`
4. `validate_contrast`, `validate_typography`
5. `validate_consistency`, `validate_accessibility`, `validate_brand`
6. `render_slides` (150dpi)
7. `visual_diff` with baseline
8. `validate_licenses`
9. `editability_audit`

Fail -> `repair_auto` or manual fix at that gate, then re-run from that step.

## Measure, don't guess

- Text metric: actual font metrics, not char count.
- Overlap: real bounding box from spec/render.
- Contrast: final color after effect/overlay.

## Acceptance

Deck only "done" when all gates pass and JSON report exists in
`output/reports/`.

## Read next

`xp-handoff` -> `xp-repair` -> `xp-legal`