---
name: xp-copywriting
description: Used when writing title, message, microcopy, claim, bullet, CTA. Vietnamese
  rules, length, verbs, numbers, avoid fluff.
---

# Copywriting

## Content Density (By Archetype)

The right amount of text depends on the slide type. NEVER use a generic rule. Apply these budgets:

1. **Cover / Section-Divider / Quote:**
   - **Budget:** 10–25 words.
   - **Rule:** Only title, subtitle, and maybe a short quote/author. Do NOT add bullet points or paragraphs to these slides.
2. **Agenda / Process / Roadmap:**
   - **Budget:** 40–70 words.
   - **Rule:** List 4–6 distinct items. Each item must be a complete phrase (3–5 words), not a single word.
3. **Text-and-Bullets / Comparison / Card-Grid (Content slides):**
   - **Budget:** 60–100 words.
   - **Rule:** Provide 3–5 bullet points. Each bullet must be a complete thought (10–15 words). If you have less than 60 words, the slide is too empty. If you have more than 100 words, split the slide.
4. **Data/Chart Focus:**
   - **Budget:** 20–40 words (excluding the data itself).
   - **Rule:** Title, a 1-sentence insight, and source. Let the chart do the talking.

**Crucial Rule:** If the content requires more words than the budget, you MUST split it into a new slide. Do NOT shrink the font. Do NOT use `layout_collision` to squeeze it in.

## Title

- <= 12 words, 1 line.
- State **conclusion**, not topic: "OpEx down 28%" > "Operating expenses".
- No "Overview", "Introduction", "Conclusion" except framework slides.
- Parallel structure across titles in same section.

## Message (subtitle)

- 1 sentence, <= 25 words, adds evidence or context.
- Does not repeat title.

## Bullet

- Max 5 bullets per slide. Max 2 levels of nesting.
- Each bullet can be up to 2 lines long (approx 15-20 words). Do not artificially truncate if the concept requires explanation.
- Start with a verb or number.
- Parallel grammar.
- If a bullet requires more than 3 lines -> convert it to a paragraph or split into a new slide.

## Claim

- Every numeric claim must have source + timestamp (can be placed in `ui/source` at the bottom).
- Quantify over adjective: "2.4× faster" > "significantly faster".
- No "best/top" without proof.

## Vietnamese

- Sentence <= 25 words; prefer active voice.
- Consistent terminology (do not mix English and Vietnamese arbitrarily; e.g., stick to "máy chủ" or "server", not both).
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