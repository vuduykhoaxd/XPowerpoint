---
name: xp-intake
description: Used at the start of every task. Asks 5–7 mandatory questions,
  especially always asking for slide count, finalizes brief.json with approved:true
  before building. Includes minutes-to-slides conversion table.
---

# Intake — ask before you build

## Hard rules

Do not create any slide before `brief.json` has `slideCount` and `approved:true`.
Missing decision-critical info -> ask. Never guess silently then build.

## 7 mandatory questions

1. **How many slides do you need?** (if unsure -> provide table below)
2. Purpose + audience?
3. Presentation duration?
4. Language?
5. Content ready or need research?
6. Output (pptx/pdf/png/mp4) + need manual editability?
7. Brand (colors/fonts/logo) or free choice?

Ask **once, grouped**, with quick-choice options. No more than 2 rounds.

## Minutes to slides conversion

| Duration | Slides |
|---|---|
| 3–5 min | 5–7 |
| 10 min | 8–12 |
| 15 min | 12–18 |
| 20 min | 16–22 |
| 30 min | 22–30 |
| 45 min | 30–40 |

Formula: `slides ≈ minutes × 1.5 + 2` + framework slides (cover, agenda, section,
conclusion, appendix). Each section 3–7 slides.

## Brief contract

```json
{
  "goal": "Q3 report",
  "audience": "leadership",
  "durationMin": 15,
  "slideCount": 14,
  "slideCountSource": "user",
  "language": "vi",
  "mustHave": ["revenue", "vs Q2 comparison"],
  "tone": "corporate-clean",
  "brand": null,
  "output": ["pptx", "pdf"],
  "editability": "required",
  "motion": "light",
  "assumptions": [],
  "approved": false
}
```

## Tool flow

`intake_questions` -> user answers -> `brief_set` (each field + assumptions)
-> `brief_confirm` (set approved:true) -> `deck_new`.

## Default when user skips entirely

10–12 slides, 16:9, Vietnamese, corporate-clean, editable, pptx+pdf.
Must still state assumptions and **get confirmation**. No silent build.

## Slide count deviation

Deviation > ±20% from brief -> reconfirm before build.

## Read next

`xp-workflow` -> `xp-narrative` -> `xp-decks`