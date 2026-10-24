---
name: xp-slide-types
description: Router for 24 slide archetypes. Read when choosing slide type, know
  anatomy, grid, object budget, suggested motion. Each type has own file in types/.
---

# Slide types — 24 archetype

## Quick pick table

| Type | When to use | Tier | Objects |
|---|---|---|---|
| cover | opening | T1 | 3–8 |
| agenda | >= 8 slides | T2 | 6–15 |
| section-divider | section transition | T1 | 3–8 |
| statement | 1 key sentence | T1 | 2–6 |
| hero-metric | 1 important number | T2 | 5–12 |
| kpi-dashboard | 4–8 KPIs | T3 | 25–60 |
| card-grid | 3–6 parallel points | T2 | 8–25 |
| comparison | 2–3 options | T2 | 10–25 |
| matrix-2x2 | 2-axis classification | T2 | 10–25 |
| process | 3–6 sequential steps | T2 | 10–30 |
| timeline | time milestones | T3 | 20–50 |
| roadmap | quarterly plan | T3 | 20–60 |
| funnel | conversion funnel | T2 | 8–20 |
| hierarchy | org/tree | T3 | 15–40 |
| text-and-bullets | pure content | T2 | 6–15 |
| image-and-text | image + explanation | T2 | 6–15 |
| full-bleed-image | full-screen image | T1 | 3–8 |
| quote | quotation | T1 | 3–7 |
| data-table | detailed table | T4/T5 | 20–400 |
| chart-focus | 1 chart + insight | T3 | 15–40 |
| diagram-system | complex diagram | T4 | 40–150 |
| map | geographic map | T3 | 20–60 |
| before-after | before/after compare | T2 | 10–25 |
| conclusion-cta | close + action | T2 | 6–15 |

## Selection rules

1. Identify **1 message** of the slide.
2. Pick narrowest archetype that contains that message.
3. If exceeds object budget -> split slide, don't stuff.
4. Don't use 2 "heavy" archetypes back-to-back.

## Object budget

| Tier | Objects/slide | Motion |
|---|---|---|
| T1 | 3–8 | 1 transition |
| T2 | 8–25 | transition + stagger |
| T3 | 25–60 | + reveal by cluster |
| T4 | 60–150 | + motion path, morph |
| T5 | 150+ | fade by series |

Hard limit 400/slide. Soft 150.

## Each type file structure

`purpose` · `when / when not` · `anatomy` · `grid` · `object list` · `params`
· `limits` · `motion` · `anti-pattern`.

## Read next

`types/cover.md` -> `types/chart-focus.md` -> `types/diagram-system.md`