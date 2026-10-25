---
name: xp-composition
description: The ultimate guide to slide layout, spacing, and components. Merged from 3 expert-level design skills and measured on 1,196 professional slides. Covers grid math, proximity rules, component libraries, and hard constraints.
---

# Composition, Layout & Spacing (The Golden Rules)

This skill is the **Design Constitution**. It merges the rules of Layout, Spacing, and Components. Read this before placing any shape.

## 1. HARD CONSTRAINTS (No Layout Hacking)
1. **ALWAYS USE THE GRID.** Use `layout_grid` to get exact widths. Do not guess coordinates.
2. **NO OVERLAPPING TEXT.** If text overlaps, the layout is broken. Use the grid to adjust manually.
3. **VERTICAL ALIGNMENT.** Text boxes taller than 1.5 inches MUST have `valign: "middle"`.
4. **NO COLLISION RESOLUTION.** `layout_collision(resolve=true)` is disabled. If it overlaps, rebuild the slide.

## 2. The Safe Area & Margins
Based on 1,196 slides:
- **Left/Right Margin:** 5% (0.67 in)
- **Top Margin:** 11.1% (0.83 in) — reserved for title/eyebrow. Do not put body text here.
- **Bottom Margin:** 3.6% (0.27 in) — reserved for footer/page number.
- **Content Coverage (`occ`):** Should be 10% – 30% of the slide area. 
- **Ink Coverage (`occ_ink`):** Should be ≤ 14%. If higher, you have too much text. Split the slide.

## 3. The Grid Math (N=4 is the standard)
Do not invent column widths. Use these measured values (based on 13.333" width):

| N (Columns) | Pitch (Total width per col + gap) | Col Width | Gutter (Gap) | Span (Total Content Width) | Outer Margin |
|---|---|---|---|---|---|
| **4** | **21.8%** | **16.9%** (2.25") | **4.9%** | 82.3% | 8.8% |
| **5** | 19.0% | 14.6% | 4.4% | 90.5% | 4.8% |
| **6** | 15.2% | 13.0% | 2.2% | 88.9% | 5.6% |
| **8** | 11.5% | 8.5% | 2.9% | 88.7% | 5.6% |

**Rule:** 
- If you need 3 cards, **use the N=4 grid** and leave one cell empty. Do not use a 3-column grid (it is unstable).
- If you need 2 columns, use `image-and-text` or `comparison` archetypes, not a card grid.

## 4. Spacing & The Proximity Rule
The gap *inside* a group must be smaller than the gap *between* groups.

- **Base Gap (1x):** 0.8% of slide height (≈ 0.06 in).
- **Inside a Group (label to body):** 1x Base (≈ 0.06 in).
- **Between Two Modules:** 4x Base (≈ 0.24 in or 3.5% of slide height).
- **Between Title and Content:** 4x - 6x Base (≈ 3% - 5% of height).
- **Ratio:** `gap_between / gap_inside` must be **≥ 4**. If it is 2 or lower, the viewer will group the wrong items together.

**Card Padding (Inset):**
- Do not use a fixed 0.2". Use `pad = min(0.8% × slide_width, 0.25 × card_width)`.
- All four sides of the card must have the exact same padding.

## 5. Component Library (Measured Sizes)

| Component | Size (inches / %) | Notes |
|---|---|---|
| **Title** | 40pt, w 28–40%, h 9–11% | y = 6–10% |
| **Subtitle** | 16pt, w 24–30%, h 2–4% | Right below title |
| **Card (Small, 6-up)** | 10.9% w × 47.2% h | For dense data grids |
| **Card (Medium, 4-up)** | **16.9% w × 30% h** | The standard card |
| **Card (Large)** | 32.6% w × 16.4% h | Panel cards |
| **KPI Value** | 24–30pt, w 8–12% | Centered in card |
| **Hero Value** | 40–48pt, w 20–40% | Only 1 per slide |
| **Body Text** | 10–12pt, w 88% of card | Line-spacing 1.3 |
| **Icon** | 3.2–4.5% w (square) | 96x96px source |
| **Divider Line** | 0.75pt (weight) | Only for grids/axes, never for grouping |
| **Card Border** | 1.5pt (weight) | For emphasis |
| **Shadow** | 94.3% of decks use it | Apply to all cards or none. Do not mix. |

## 6. Hierarchy & Reading Order
- **Hero:** 1 focal point per slide (Title, KPI, or Image).
- **Support:** 2–4 explanatory blocks.
- **Detail:** Captions, sources, labels.
- **Z-Bands:** Never put content below decoration.
bg: 0-9 | deco: 10-19 | content: 20-79 | data: 80-89 | ui: 90-99
- **Alignment:** Title/Center, Label/Body Left, KPI Center. Do not justify text. Do not align everything to the left.

## 7. Anti-patterns (What NOT to do)
- **Gutter = Margin:** Do not use the 5% page margin as the gap between columns.
- **Box in a Box:** Do not nest cards more than 2 levels deep.
- **Dead Corner:** Do not leave 3 empty corners and 1 heavy corner.
- **Shadow Mixing:** Do not use shadows on some cards and not others.
- **Line Grouping:** Do not use lines to separate groups. Use whitespace.
- **Watermark Leftovers:** Remove all template watermarks (e.g., "slideocean.net").
- **Text Overlap:** Never let text overlap. If it does, split the slide.

## 8. Quality Checklist (Before Export)
- [ ] Is the left margin equal to the right margin?
- [ ] Are all cards in the same row the same height?
- [ ] Is the gap between groups at least 4x the gap inside groups?
- [ ] Is the title separated from the content by at least 3% of slide height?
- [ ] Is `occ_ink` (text density) ≤ 14%?
- [ ] Does the slide have 2 to 7 distinct visual blocks?
- [ ] Are all icons the same size?
- [ ] Is `valign: "middle"` used for large titles?
## Read next
`xp-foundations` -> `xp-visual-language` -> `xp-object-intelligence`