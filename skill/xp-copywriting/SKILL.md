---
name: xp-copywriting
description: Used when writing title, message, microcopy, claim, bullet, CTA. Vietnamese
  rules, length, verbs, numbers, avoid fluff.
---

# Copywriting

## Title

- <= 12 words, 1 line.
- State **conclusion**, not topic: "OpEx down 28%" > "Operating expenses".
- No "Overview", "Introduction", "Conclusion" except framework slides.
- Parallel structure across titles in same section.

## Message (subtitle)

- 1 sentence, <= 25 words, adds evidence or context.
- Does not repeat title.

## Bullet

- <= 6 lines, <= 2 levels, <= 2 lines/bullet.
- Start with verb or number.
- Parallel grammar.
- If bullet > 2 lines -> convert to paragraph.

## Claim

- Every numeric claim must have source + timestamp.
- Quantify over adjective: "2.4× faster" > "significantly faster".
- No "best/top" without proof.

## Vietnamese

- Sentence <= 25 words; prefer active voice.
- Consistent terminology (not "customer" then "user").
- Number format: `1.234`, `12,5%`; unit spaced.
- No ALL CAPS long sentences.
- Avoid filler: "actually", "very", "extremely".

## CTA

- 1 specific action + deadline: "Approve Q4 budget by 10/30".
- No "Contact us for more info".

## Tool

`text_set` / `text_markdown`; word count via `text_metrics`.

## Read next

`xp-typography` -> `xp-narrative` -> `xp-decks`