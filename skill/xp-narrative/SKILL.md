---
name: xp-narrative
description: Used for outline, story arc, deck pacing, slides per section,
  climax and close. Turns discrete slides into a story.
---

# Narrative

## Default arc (10–14 slides)

```
Hook -> Context -> Problem -> Insight -> Solution -> Proof -> Plan -> CTA
```

| Section | Slides | Goal |
|---|---|---|
| Hook | 1 (cover/statement) | grab attention with 1 number/1 sentence |
| Context | 1–2 | why now |
| Problem | 1–2 | pain, cost |
| Insight | 1 | surprising fact, root cause |
| Solution | 2–3 | approach, architecture, process |
| Proof | 1–2 | data, case, testimonial |
| Plan | 1–2 | roadmap, resources |
| CTA | 1 | specific decision |

## Pacing

- 3–7 slides/section.
- Every 4–5 content slides -> 1 breather (statement, quote, divider).
- No 2 consecutive slides same archetype.
- Climax at 60–70% of deck.
- Close with 1 sentence + 1 action, not just "thank you".

## Slide plan contract

```json
{ "no": 4, "type": "hero-metric", "title": "32% growth",
  "message": "Q3 is fastest growing quarter", "evidence": ["data/q3"],
  "visual": "hero-metric", "source": ["internal"] }
```

## Flow check

- Read only titles: still understand story? If not -> fix title.
- Each slide answers "so what?" of previous.
- No slide repeats another's point.
- Each section has 1 closing sentence.

## Tool

`deck_sections` -> `slide_add` per plan -> `slide_notes` for story notes.

## Read next

`xp-copywriting` -> `xp-decks` -> `xp-slide-types`