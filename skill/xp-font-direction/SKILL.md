---
name: xp-font-direction
description: Used when choosing fonts, pairing fonts, changing brand font. Assigns
  display/body/data roles, VN coverage, license, fallback metrics.
---

# Font direction

## Process

1. Identify medium (projector/print/web) + language + tone.
2. `font_recommend(tone, language, medium)` -> 3–5 candidates.
3. `font_vn_coverage` with test string.
4. `font_pair_score` for display + body pair.
5. `font_metrics` to pick fallback with matching metrics.
6. `font_audit` after build.

## Role assignment

| Role | Requirement |
|---|---|
| Display | personality, bold weight, open aperture |
| Body | large x-height, open aperture, 18–24pt |
| Data | tabular figures, lining, distinguish 0/O, 1/l |
| Caption | same body, reduce size + opacity |
| Accent | 1 font, used for numbers/quotes |

## Pairing

- Serif display + sans body, or geometric + humanist.
- Don't pair 2 similar sans (Inter + Roboto).
- Max 2 families + 1 mono, 4 weights.
- Scale 1.25–1.333; title >= 1.8× body.

## Vietnamese

- Must have Latin Extended Additional (U+1EA0–U+1EF9).
- Test: `ẮẮ ỘỘ ữ ỹ ệ ợ ẩ ỗ ự`.
- Missing diacritics -> reject, no blind fallback.
- Suggested OFL: Be Vietnam Pro, Inter, Noto Sans, Source Sans 3, IBM Plex Sans.

## License

- Check embed rights (`font_embed`).
- No rights -> use web-safe fallback with matching metrics.
- Record license in `assets/fonts/LICENSE.json`.

## Fallback stack

`Brand -> Segoe UI -> Arial -> sans-serif` (Windows)
`Brand -> Helvetica Neue -> Arial -> sans-serif` (macOS)

## Read next

`xp-typography` -> `xp-legal` -> `xp-handoff`