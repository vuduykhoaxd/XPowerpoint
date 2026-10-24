---
name: xpowerpoint
description: Full-control PowerPoint generation suite. Use when creating or editing
  a presentation from 8 objects/slide up to 150+ objects/slide, including transitions,
  animations, media, charts, diagrams, fonts, internet assets, OOXML surgery, and
  an editable/flat handoff. Router skill: read this first, then load only the
  sub-skill routed below.
---

# XPowerpoint — router

Three strictly separated layers:

```
Skill (knowledge) -> MCP (tools) -> Engine (execution)
```

- `skill/` — knowledge, progressive disclosure. Read only what you need.
- `mcp/` — MCP server, 196 tools, validate -> dispatch -> JSON summary.
- `python/` — COM / python-pptx / OOXML bridge for Windows.

## Non-negotiables

1. **No brief, no build.** Before the first slide: intake, then `brief_confirm`
   with `approved:true` and an explicit `slideCount`.
2. **Ask for slide count.** If the user did not state it, ask. Never guess silently.
   Use `minutes * 1.5 + 2` then adjust.
3. **Ground truth comes from measurement**, not estimation. Text metrics, COM
   bounds, render diff — never invent geometry at export time.
4. **Gates are hard.** Do not export with layout violations, contrast failures,
   unknown licenses, or editability < 80.
5. **Content must stay editable.** Text as text, charts as charts, tables as tables.
   Destructive craft lives in `deco/*` groups only.
6. **Everything gets a name, a band, and alt text.** No anonymous shapes.
7. Tools return compact JSON: `{ ok, data, warnings[], next_action }`.

## Standard pipeline

```
intake -> brief -> research -> assets -> spec -> build -> measure -> validate
       -> motion -> render -> visual verify -> export -> deliver
```

Gate table: see `skill/xp-workflow/SKILL.md` §Gates.

## Routing table

| Intent | Read |
|---|---|
| Start any task | `skill/xp-intake/SKILL.md` |
| Pipeline, gates, recovery | `skill/xp-workflow/SKILL.md` |
| COM / fonts / paths / Office errors | `skill/xp-environment/SKILL.md` |
| Tool contracts | `skill/xp-tools/SKILL.md` |
| Grid, margins, occupancy | `skill/xp-foundations/SKILL.md` |
| Type scale, VN typography | `skill/xp-typography/SKILL.md` |
| Palette, contrast, roles | `skill/xp-color/SKILL.md` |
| Hierarchy, z-bands | `skill/xp-composition/SKILL.md` |
| Pick a visual style | `skill/xp-visual-language/SKILL.md` |
| Backgrounds | `skill/xp-backgrounds/SKILL.md` |
| Story arc, pacing | `skill/xp-narrative/SKILL.md` |
| Titles, microcopy | `skill/xp-copywriting/SKILL.md` |
| Cover/agenda/section/appendix | `skill/xp-decks/SKILL.md` |
| Pick slide archetype | `skill/xp-slide-types/SKILL.md` |
| Which chart, annotations | `skill/xp-data-storytelling/SKILL.md` |
| Chart construction | `skill/xp-charts/SKILL.md` |
| Tables, heatmaps | `skill/xp-tables/SKILL.md` |
| Diagrams | `skill/xp-diagrams/SKILL.md` |
| Photos, crop, masks | `skill/xp-imagery/SKILL.md` |
| Icons, SVG | `skill/xp-illustration/SKILL.md` |
| Fragments, slices, explode | `skill/xp-creative-deconstruction/SKILL.md` |
| Font choice | `skill/xp-font-direction/SKILL.md` |
| Constraints, solver, reflow | `skill/xp-object-intelligence/SKILL.md` |
| Editability, handoff | `skill/xp-handoff/SKILL.md` |
| Shadows, glass, 3D | `skill/xp-effects/SKILL.md` |
| Transitions, animation | `skill/xp-motion/SKILL.md` |
| Video, audio | `skill/xp-media/SKILL.md` |
| Measure, accept | `skill/xp-quality/SKILL.md` |
| Licenses | `skill/xp-legal/SKILL.md` |
| Audit an existing deck | `skill/xp-repair/SKILL.md` |
| Record learnings | `skill/xp-evolve/SKILL.md` |

Slide archetypes: `skill/xp-slide-types/types/*.md` (24 files).

## Stop conditions

- No `slideCount` or `approved:false` -> **do not build**.
- Gate [5]–[9] failing -> **do not export**.
- COM unavailable -> never promise animation, morph, MP4, or 3D.
- License `unknown` -> never insert the asset into a commercial deck.
- Fragment budget > 60/slide -> bake or split.
- Editability < 80 -> run `handoff_cleanup` or report the gap.

## Default (only after confirmation)

10–12 slides, 16:9, Vietnamese, corporate-clean, editable, `pptx + pdf`,
assumptions stated in the brief.

## Read next

`README.md` -> `skill/xp-workflow/SKILL.md` -> `skill/xp-intake/SKILL.md`