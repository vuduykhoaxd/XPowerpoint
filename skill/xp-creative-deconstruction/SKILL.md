---
name: xp-creative-deconstruction
description: Used for unique effects: fragment 1 object into many, boolean fragment,
  slice grid/path, scatter, explode, halftone, mask reveal.
---

# Creative deconstruction

Mindset: **1 object -> N fragments -> each fragment is 1 animation/color/texture unit.**
Don't redraw manually; slice with tools to preserve original geometry.

## 15 techniques

| # | Technique | Tool | Use for |
|---|---|---|---|
| 1 | Boolean fragment | `shape_boolean(op:"fragment")` | logo, text, geometric bg |
| 2 | Grid slice | `object_slice_grid` | pixel reveal, shattered image |
| 3 | Path slice | `object_slice_path` | paper tear, light rays |
| 4 | Strip/blind | `object_slice_grid(rows:40)` | venetian, scanline |
| 5 | Peel/tear | `object_slice_path` + `object_transform` | page flip |
| 6 | Exploded view | `object_clone` + `object_scatter` | product, architecture |
| 7 | Scatter | `object_scatter` | confetti, particles |
| 8 | Layer offset | `object_clone_offset` | long shadow, riso |
| 9 | Cut-out + shadow | `asset_remove_bg` + `effect_shadow` | subject pop |
| 10 | Mask window | `effect_mask_window` | reveal, magnifier |
| 11 | Kinetic type | `text_split` / `text_to_vectors` | animated title |
| 12 | Cover reveal | `transition` + z-order | before/after |
| 13 | Broken grid | `object_slice_grid` + `layout_reflow` | disruption |
| 14 | Halftone | `object_fragment_dots` | print, data-art |
| 15 | Shatter motion | `animation_stagger` + `motion_path` | strong transition |

## Safety rules

1. Fragments in group `deco/<technique-name>`.
2. Each fragment has `sourceRef` to original object.
3. Total <= 60 fragments/slide; exceed -> `deco_group_bake`.
4. Always keep original in `edit-source` group (hidden + locked).
5. Fragments never carry critical content (content must remain in real text/shape).
6. Restore with `deco_restore`.

## Technique selection

- Emphasize 1 object -> cut-out + shadow or explode.
- Scene transition -> shatter or mask window.
- Texture/retro -> halftone, grain, layer offset.
- Impactful typography -> text_split, text_to_vectors (keep hidden text).

## Editability

Boolean/text-to-vector = high cost. Only for `deco/*` or display title;
body content always keeps native text.

## Read next

`xp-effects` -> `xp-motion` -> `xp-handoff`