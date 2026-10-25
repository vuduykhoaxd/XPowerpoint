---
name: xpowerpoint
description: Full-control PowerPoint generation suite. Use when creating or editing a presentation from 8 objects/slide up to 150+ objects/slide, including transitions, animations, media, charts, diagrams, fonts, internet assets, OOXML surgery, and an editable/flat handoff. Router skill: read this first, then load only the sub-skill routed below. Always elicits missing topic, slide count, and effect preference before building. Enforces animation when useEffects=true and COM is available.
---

# XPowerpoint — router

Three strictly separated layers:
Skill (knowledge) -> MCP (tools) -> Engine (execution)

- `skill/` — knowledge, progressive disclosure. Read only what you need.
- `mcp/` — MCP server, 196 tools, validate -> dispatch -> JSON summary.
- `python/` — COM / python-pptx / OOXML bridge for Windows.

## CRITICAL RULES FOR AI AGENTS (READ THIS FIRST)

1. **NO LAYOUT HACKING.** Do NOT use `layout_collision(resolve=true)` or `repair_auto` as a primary layout method. These tools are for minor nudges only. If a slide has overlapping text or overflow, your layout is fundamentally wrong. You MUST split the slide, reduce text, or change the archetype. NEVER use collision resolution to force objects into arbitrary positions.
2. **ANIMATION IS NOT OPTIONAL IF REQUESTED.** If `brief.useEffects === true`, you MUST call `deck_save` (which auto-applies motion). Do NOT call `export_pptx(applyMotion=false)` unless the user explicitly says "no animation". If COM is unavailable, state it clearly in the final response, but still save the motion spec.
3. **CONTENT DENSITY MINIMUM.** Do not create "empty" slides. Every content slide must have at least 3 distinct blocks (title, main content, context/footer). A slide with only a title is a wasted slide.
4. **VERTICAL ALIGNMENT.** For text boxes with `fontSize > 36pt` (e.g., titles), you MUST set `valign: "middle"` (anchor center) to prevent text from floating to the top of a large box.
5. **USE ADVANCED DECOR (Optional but recommended):** For cover and section-divider slides, prefer the `decor-modern` archetype (with styles: honeycomb, shatter, waves, dots, glass, stars) instead of plain backgrounds to make the deck look premium.
## Non-negotiables

1. **No brief, no build.** Before the first slide: run `intake_questions`. If `topic`, `slideCount`, or `useEffects` is missing from the user's prompt, **MUST use MCP Elicitation (`ctx.elicit` / `elicitInput`)** to ask the user. Do not guess. After collecting, call `brief_confirm` with `approved:true` and an explicit `slideCount`.
2. **Ask for missing parameters.** If the user did not state `topic`, `slideCount`, or `useEffects`, ask via elicitation. Never guess silently. Only after the user has answered (or explicitly declined) may you set assumptions in `brief.assumptions`.
3. **Ground truth comes from measurement**, not estimation. Text metrics, COM bounds, render diff — never invent geometry at export time.
4. **Gates are hard.** Do not export with layout violations, contrast failures, unknown licenses, or editability < 80.
5. **Content must stay editable.** Text as text, charts as charts, tables as tables. Destructive craft lives in `deco/*` groups only.
6. **Everything gets a name, a band, and alt text.** No anonymous shapes.
7. **Animation is mandatory when requested.** If `brief.useEffects = true` and COM is available, the build step MUST call `applyMotion` (via `xp-motion` tools and `com_motion.py`). Do not export a deck that was requested with effects but contains no transitions/animations.
8. Tools return compact JSON: `{ ok, data, warnings[], next_action }`.

## Standard pipeline
intake -> brief -> research -> assets -> spec -> build -> measure -> validate
-> motion -> render -> visual verify -> export -> deliver

**Pipeline rules (v2.1.0):**

- **`intake`** is mandatory. It MUST elicit `topic`, `slideCount`, `useEffects` if absent. It writes results into `brief`.
- **`build`** must use the grid and archetypes properly. If a slide overflows, split it. Do NOT rely on `layout_collision` to fix bad content. 
- **`validate`** must pass before `motion`. If `validate_layout` reports collisions, fix the layout manually, do NOT use `resolve=true`.
- **`motion`** is MANDATORY when `useEffects=true` and COM is available. If the build step finishes without calling `applyMotion`, the pipeline fails gate [5] and must not export.
- **`motion` fallback** (COM unavailable): write motion spec into `brief.assumptions` + `notes`, warn the user, but do not claim the deck has animation.

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

- No `topic` OR no `slideCount` OR `useEffects` undefined -> **do not build**. Elicit the missing value first.
- `approved:false` -> **do not build**.
- Gate [5]–[9] failing -> **do not export**.
- **COM available AND `useEffects = true` AND `applyMotion` not called -> do not export.** Either call motion or explicitly downgrade `useEffects` to `false` with user consent.
- COM unavailable AND `useEffects = true` -> fallback: write motion spec into speaker notes, warn the user, do not promise MP4/morph/animation.
- License `unknown` -> never insert the asset into a commercial deck.
- Fragment budget > 60/slide -> bake or split.
- Editability < 80 -> run `handoff_cleanup` or report the gap.
- **Layout collision resolution used as primary fix -> do not export.** Rebuild the slide with correct content density.

## Default (only after confirmation)

10–12 slides, 16:9, Vietnamese, corporate-clean, editable, `pptx + pdf`, assumptions stated in the brief.

## Read next

`README.md` -> `skill/xp-workflow/SKILL.md` -> `skill/xp-intake/SKILL.md`