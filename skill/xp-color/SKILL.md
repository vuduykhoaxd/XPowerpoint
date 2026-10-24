---
name: xp-color
description: Used for every slide. Color roles, 60-30-10 palette, WCAG contrast,
  tint/shade, semantic colors, dark mode.
---

# Color

## Roles (do not pick colors by intuition)

| Role | Token | Used for |
|---|---|---|
| bg | `color.bg` | slide background |
| surface | `color.surface` | card, panel |
| textPrimary | `color.text` | title, body |
| textSecondary | `color.muted` | caption, source |
| accent | `color.accent` | CTA, highlight, 1 accent point |
| accentAlt | `color.accent2` | series 2, classification |
| success / warning / danger | `color.ok/warn/bad` | status |
| line | `color.line` | border, divider |

## Palette

- 60% background, 30% text/surface, 10% accent.
- Max 5 main colors + 3 semantic.
- Accent only 1 standout color; does not compete with data.
- Use tint/shade of same hue instead of adding new hues.

## Contrast (WCAG)

| Type | Minimum |
|---|---|
| Body text | 4.5:1 |
| Large text (>= 24px / 18.66 bold) | 3:1 |
| UI border/icon | 3:1 |
| Text on image | 4.5:1 + overlay 35–60% |

Formula: `(L1+0.05)/(L2+0.05)`, L per linear sRGB.
Tool: `validate_contrast`.

## Semantic

- success `#1E8E5A`, warning `#C77700`, danger `#C0392B` (re-verify contrast).
- Do not use red/green as sole classification pair (colorblind) -> add shape/label.

## Dark mode

- Background `#0B1220`–`#111827`, surface 4–8% lighter.
- Text not pure white (#F5F7FA).
- Accent increased 10–15% brightness vs light mode.

## Theme binding

Colors must bind to tokens (`theme_apply`, `tokens_set`).
Hardcoding color outside token = fail `theme_bind_audit`.

## Anti-pattern

- Multi-color vibrant gradients.
- Accent for everything.
- Gray #999 on white for body.
- White text on image without overlay.
- 6+ data colors without legend.

## Read next

`xp-composition` -> `xp-backgrounds` -> `xp-effects`