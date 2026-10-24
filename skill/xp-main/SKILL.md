---
name: xp-main
description: High-level router for XPowerpoint. Read first for every task. Decides
  which skill to load, which tool to call, when to stop.
---

# xp-main — router

Root skill at `../../SKILL.md`. This is internal route map for skill layer.

## Decision flow

```
1. Has brief.approved + slideCount?
   - no -> xp-intake, STOP build
   - yes -> continue
2. Task type?
   - new       -> xp-workflow -> xp-narrative -> xp-decks
   - edit      -> xp-repair -> xp-workflow
   - audit     -> xp-quality -> xp-repair
3. Has data?      -> xp-data-storytelling -> xp-charts / xp-tables
4. Has diagrams?  -> xp-diagrams
5. Has images?    -> xp-imagery / xp-illustration
6. Needs effects? -> xp-effects / xp-motion / xp-creative-deconstruction
7. Pre-export     -> xp-quality -> xp-handoff
```

## Priority on conflict

1. Correct brief > pretty.
2. Editability > effects.
3. Contrast/readability > style.
4. Consistency > per-slide creativity.
5. Real data > decoration.

## Stop conditions

- Missing slide count or not approved -> stop, ask.
- COM unavailable -> don't promise motion/mp4/3d.
- License unknown -> don't insert asset.
- Gate layout/contrast/a11y fail -> don't export.
- > 400 objects/slide -> split or flatten deco.
- Editability < 80 -> cleanup before delivery.

## Read next

`../xp-workflow/SKILL.md` -> `../xp-intake/SKILL.md` -> `../xp-tools/SKILL.md`