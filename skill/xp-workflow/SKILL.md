---
name: xp-workflow
description: Used for all create, edit, audit deck tasks. Defines 11-step pipeline,
  mandatory gates, fixed order, and recovery when gates fail.
---

# Workflow — pipeline & gate

## Pipeline (fixed order)

```
[0] intake          -> brief.approved=true + slideCount confirmed
[1] spec            -> validate_spec
[2] research        -> every data claim has source
[3] assets          -> license known, size adequate
[4] build           -> objects by band + z-index
[5] layout_measure  -> overflow=0, overlap=0 (except intentional)
[6] validate        -> contrast, typography, consistency, a11y
[7] motion          -> transition + animation valid
[8] render          -> PNG 150dpi
[9] visual_diff     -> diff < 2%
[10] export         -> pptx/pdf/png/mp4
```

## Gates

| Gate | Pass condition | Tool |
|---|---|---|
| G0 Brief | `approved:true`, `slideCount>0` | `brief_get` |
| G1 Spec | schema valid, 0 structural errors | `validate_spec` |
| G2 Source | 100% data claims have source | `research_topic` |
| G3 Asset | license != unknown | `asset_license_check` |
| G4 Layout | overflow 0, overlap 0 | `validate_layout` |
| G5 Design | contrast >= 4.5, body >= 14pt | `validate_contrast`, `validate_typography` |
| G6 A11y | alt text 100% non-decorative objects | `validate_accessibility` |
| G7 Motion | no orphan animations | `motion_preview` |
| G8 Visual | render diff < 2% | `visual_diff` |
| G9 Handoff | editability >= 80 | `editability_audit` |

Fail any gate -> **fix that gate**, do not jump to export.

## Build order within 1 slide

1. Background.
2. `deco/*` (decorative, z 10–19).
3. `content/*` (z 20–79).
4. `data/*` (z 80–89).
5. `ui/*` (z 90–99) — page numbers, source, logo.

## Failure recovery

| Fail | Action |
|---|---|
| overflow | `text_autofit` -> `layout_reflow` -> `layout_break_plan` |
| overlap | `layout_collision` -> move by grid |
| contrast | change color token, not content |
| missing font | `font_fallback`, keep metrics |
| COM hang | kill POWERPNT, retry 1, fallback LibreOffice |
| render drift | fix DPI/zoom, disable HW accel |

## Do not do
 
- Build before brief is locked.
- Export when gate [5]–[9] fail.
- Local fix that breaks neighbors (must re-run solver).
- Promise animation/MP4 when `E_COM_UNAVAILABLE`.

## Read next

`xp-intake` -> `xp-quality` -> `xp-handoff`
