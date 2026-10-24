
**Pipeline rules (v2.1.0):**

- **`intake`** is mandatory. It MUST elicit `topic`, `slideCount`, `useEffects` if
  absent. It writes results into `brief`.
- **`motion`** is MANDATORY when `useEffects=true` and COM is available. If the
  build step finishes without calling `applyMotion`, the pipeline fails gate [5]
  and must not export.
- **`motion` fallback** (COM unavailable): write motion spec into
  `brief.assumptions` + `notes`, warn the user, but do not claim the deck has
  animation.

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

- No `topic` OR no `slideCount` OR `useEffects` undefined -> **do not build**.
  Elicit the missing value first.
- `approved:false` -> **do not build**.
- Gate [5]–[9] failing -> **do not export**.
- **COM available AND `useEffects = true` AND `applyMotion` not called -> do not
  export.** Either call motion or explicitly downgrade `useEffects` to `false`
  with user consent.
- COM unavailable AND `useEffects = true` -> fallback: write motion spec into
  speaker notes, warn the user, do not promise MP4/morph/animation.
- License `unknown` -> never insert the asset into a commercial deck.
- Fragment budget > 60/slide -> bake or split.
- Editability < 80 -> run `handoff_cleanup` or report the gap.

## Default (only after confirmation)

10–12 slides, 16:9, Vietnamese, corporate-clean, editable, `pptx + pdf`,
assumptions stated in the brief.

## Read next

`README.md` -> `skill/xp-workflow/SKILL.md` -> `skill/xp-intake/SKILL.md`