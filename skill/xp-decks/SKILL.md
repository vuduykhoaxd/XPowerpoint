---
name: xp-decks
description: Used when framing a deck: cover, agenda, section divider, conclusion,
  appendix, reference, back cover. Rules for repetition and consistency.
---

# Deck-level slides

## Minimum framework

| Slide | Required | Content |
|---|---|---|
| Cover | yes | title, subtitle, presenter, date |
| Agenda | if >= 8 slides | 3–6 items, numbered |
| Section divider | per section | number + name, 1 lead-in sentence |
| Conclusion | yes | 3 takeaways + CTA |
| Appendix | if backup exists | data, method, glossary |
| Source/refs | if citations | short list |

## Cover

- 1 strong title sentence, logo not larger than title.
- At least 40% whitespace.
- Background image (if any) + overlay >= 40%.
- Small meta at bottom corner: presenter, date, venue.

## Agenda

- 3–6 items, not 8+.
- Number + duration if helpful.
- Current item can be highlighted on subsequent slides (progress).

## Section divider

- Large section number (deco) + section name.
- 1 sentence description.
- Background tone shifted slightly from content slides.

## Conclusion

- 3 points, 1 line each.
- 1 clear CTA.
- No new content.

## Appendix

- After "Thank you", numbered A1, A2...
- Detailed tables/charts, method, definitions.
- No animation needed.

## Consistency

- Same footer/page number/logo position entire deck.
- Same title font, same margin.
- Section colors by token, not ad-hoc.

## Tool

`slide_add` -> `slide_layout_set` -> `slide_section_assign` -> `slide_notes`.

## Read next

`xp-slide-types` -> `xp-narrative`