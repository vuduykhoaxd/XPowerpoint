---
name: xp-repair
description: Used when user provides existing deck for audit/edit: overflow, overlap,
  grid shift, missing font, hardcoded color, image-fixed text. Keep brand intact.
---

# Repair

## Audit before repair

1. `deck_open`
2. `deck_info` — size, theme, fonts, slide count
3. `render_slides` — actual render
4. `validate_layout`, `validate_contrast`, `validate_typography`
5. `editability_audit`, `native_check`, `theme_bind_audit`
6. `validate_licenses`

## Report

Each issue: slide, objectId, type, severity (blocker/major/minor), fix method,
auto-fixable or not.

## Repair order

1. **Don't break brand**: keep original master/layout/theme.
2. Blocker: overflow, overlap covering text, contrast fail.
3. Major: missing font, grid shift, image-fixed text.
4. Minor: spacing, row alignment, naming.

## Strategy

| Situation | How |
|---|---|
| Simple deck, few slides | direct edit |
| Many system errors | `theme_extract` -> `deck_rebuild` from spec |
| Entirely image-fixed | OCR + manual rebuild, report cost |
| Master broken | `com_master` / `oxml_patch` with backup |
| Unknown source | don't restructure, just add new slide |

## Cannot do

- Change brand color/font when user does not allow.
- Delete slide without asking.
- Flatten entire deck without reporting.

## Backup

Before any edit: copy `*.bak.pptx` + save original `spec.json`.

## Tool

`repair_auto` -> manual fix -> re-run gate -> `export_handout`.

## Read next

`xp-quality` -> `xp-handoff` -> `xp-environment`