---
name: xp-tools
description: MCP tool catalog by group, input/output contract, error codes and
  next_action. Read before calling unknown tool or when needing tool existence.
---

# Tools — calling contract

## Standard output

```json
{ "ok": true, "data": {}, "warnings": [], "next_action": null }
```

Error:

```json
{ "ok": false, "error": { "code": "E_GEOMETRY", "message": "...", "next_action": "layout_collision" } }
```

## Error codes

| Code | Meaning | next_action |
|---|---|---|
| `E_BRIEF` | brief not approved / missing slideCount | `intake_questions` |
| `E_SPEC` | spec violates schema | `validate_spec` |
| `E_GEOMETRY` | object off-slide / negative size | `layout_reflow` |
| `E_OVERFLOW` | text overflows box | `text_autofit` |
| `E_OVERLAP` | unintentional overlap | `layout_collision` |
| `E_CONTRAST` | contrast below threshold | `validate_contrast` |
| `E_FONT_MISSING` | font missing / missing VN diacritics | `font_fallback` |
| `E_LICENSE` | license unknown | `asset_license_check` |
| `E_COM_UNAVAILABLE` | PowerPoint not available | `render_slides` |
| `E_COM_TIMEOUT` | COM hang | retry 1 |
| `E_FILE_LOCKED` | file open | copy -> overwrite |
| `E_BUDGET` | > 400 objects/slide | `layout_break_plan` |
| `E_NOT_FOUND` | deckId/objectId not exist | `deck_info` |

## 17 tool groups

| Group | Count | File |
|---|---|---|
| deck | 12 | `mcp/src/tools/deck.ts` |
| slide | 12 | `slide.ts` |
| object | 21 | `object.ts` |
| text | 10 | `text.ts` |
| layout | 11 | `layout.ts` |
| theme | 8 | `theme.ts` |
| effects | 12 | `effects.ts` |
| motion | 14 | `motion.ts` |
| assets | 16 | `assets.ts` |
| fonts | 12 | `fonts.ts` |
| data | 10 | `data.ts` |
| quality | 12 | `quality.ts` |
| export | 11 | `export.ts` |
| deconstruct | 12 | `deconstruct.ts` |
| handoff | 10 | `handoff.ts` |
| intake | 4 | `deck.ts` (intake group) |
| oxml | 8 | `oxml.ts` |

## Parameter conventions

- `deckId`: required for deck tools (except `deck_new`, `deck_open`).
- Geometry: `{x,y,w,h}` in **inches**, origin top-left.
- Colors: `#RRGGBB`; alpha 0–100.
- `objectId`: by band, e.g. `content/card-01`.
- `target`: supports glob for motion (`content/*`).

## Before calling unknown tool

1. Read corresponding section in this file.
2. If tool returns `E_SPEC`, run `validate_spec` to see exact error.
3. Don't blind retry > 1 time; switch `next_action`.

## Read next

`xp-workflow` -> corresponding skill groups