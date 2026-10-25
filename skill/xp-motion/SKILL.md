---
name: xp-motion
description: Used when needing transition, animation, timing, trigger, motion path, morph, or video export. Checks COM and target machine capability. Based on real-world data from 1,196 professional slides.
---

# Motion — Animation and Transitions

## Purpose & Philosophy

Define when **not** to use effects (most cases) and when to use them to support storytelling. 
Based on real-world data: **76% of effects in professional slides are `fade`**. Animation is used to **reduce cognitive load** on dense slides (revealing groups sequentially), not for decoration.

**Key Statistics from Professional Decks:**
- Animation coverage: 54.2% of slides have animations.
- Transition coverage: 71% of decks use transitions.
- Effect Distribution: Fade (76.1%), Fly (12.2%), Wipe (5.9%), Appear (3.5%), Zoom (2.2%).
- The 12.2% of "Fly" and 5.9% of "Wipe" are mostly template noise, not intentional design choices.

## When to Use / When NOT to Use
- **USE:** Slides with lists (bullet points), slides with heavy data (KPIs, tables) that need to be revealed step-by-step, or section dividers.
- **DO NOT USE:** Statement slides (single sentence), Chart slides, Conclusion/CTA slides, Matrix slides. These should appear instantly.
- **NEVER USE:** When the deck is exported to PDF/Email (animations are lost). When the presentation is under 10 minutes (animations eat up time budget).

## HARD RULES

1. **FADE IS THE DEFAULT.**
   Unless the user explicitly requests a different effect (like `fly` or `zoom`), use `fade` for all objects. Over-animating dilutes the message.
   *Exception:* Variety is allowed ONLY if the slide has a specific storytelling reason (e.g., mosaic image collage, hex grid) or the user explicitly requests a "dynamic" feel.

2. **1 Click = 1 Semantic Group.**
   Never animate individual small shapes (e.g., 10 bullets = 10 clicks = 10 seconds wasted). Group them: 1 click for the entire bullet block, or split into 2-3 groups (by row) if the slide is very dense.
   *Rule of thumb:* Process steps = 1 group per step (max 6). Card grids = 1-2 groups by row.

3. **Transitions: Use 1 type for the whole deck.**
   Default is `fade` (600ms). Do not mix `push`, `wipe`, `morph` randomly.
   *Exception:* You can use `push` or `wipe` for section dividers to signal a change in topic.

4. **Speed and Timing:**
   - `duration`: 0.3 - 0.5s for fade, max 0.8s.
   - Total cascade time (from first effect to last) must not exceed 1.3s.
   - Stagger delay between items should be 0.08s - 0.14s for text/cards, 0.05s for image fragments.

5. **No Loops and No Advance on Time.** Effects should only play once on click.
   *Reason:* In a live presentation, automatic advancement will break the flow.

6. **Never hide information with effects.** If effects are removed (e.g., printing to PDF), the content must still be fully readable.

## Decision Matrix
| Slide Type | Animate? | Number of Groups (Clicks) | Default Effect |
|---|---|---|---|
| Cover | **No** | 0 | — |
| Statement | **No** | 0 | — |
| Hero metric (big number) | **No** | 0 | — |
| Conclusion / CTA | **No** | 0 | — |
| Chart / Matrix | **No** | 0 | — |
| KPI / Dashboard | **Yes** | 1 (whole row) | fade |
| Text-and-bullets | **Yes** | 1 (whole block) or 3 (per bullet) | fade |
| Card grid | **Yes** | 1 or max 2-3 (by row) | fade |
| Process / Roadmap | **Yes** | 1 group per step (max 6) | fade |

## Advanced Techniques (Creative Use)

If the user requests a mosaic (image collage) or honeycomb (hex) slide, you may break the "fade only" rule to create a premium look:
- **Mosaic pieces:** Use Wipe from left or right (Wipe Left/Right).
- **Honeycomb (Hex):** Use Wipe alternating left/right, or Zoom.
- **Title/Hero:** You can use Fly In (from bottom) or Zoom.
- **Polygon shards:** Use Strips or Wipe with alternating directions.
*(Absolutely no weird effects like Glitter, Vortex, Ripple).*

## Timing & Cascade Strategy

- **Absolute Delay:** When sequencing multiple objects, use absolute delay (e.g., `delay: 0.0`, `delay: 0.1`, `delay: 0.2`) rather than relying on "after previous" chaining. This prevents cumulative timing errors.
- **Order of Appearance:** Background/Scrim -> Image fragments -> Title -> Content Body -> Footer.
- **Duration Budget:** Total time from first click to last effect must be <= 1.3 seconds. The user should not be waiting for the slide to finish loading.

## Anti-patterns

- Animating every character or small shape, causing the slide to drag (A2).
- Animating statement, conclusion, or chart slides (A3).
- Using effects to hide content (A4).
- `Fly` in random directions not aligned with reading flow (A5).
- Loop animations (A6).
- Transitions like Glitter, Vortex, Ripple (A7).
- Changing transition family between consecutive slides of the same type (A8).
- Using `by_paragraph` on a table with 18 rows (A9).
- Duration of 1.5s (A10).
- Cascade total > 1.3s or 2 clicks per slide (A14).
- **Using `layout_collision` to push shapes into arbitrary positions.**

## Quality Checklist (Verify before export)

- [ ] Is the deck using `fade` as the default effect and transition?
- [ ] Are statement, conclusion, and chart slides free of animations?
- [ ] Is each slide limited to max 3 groups (or 6 for process)?
- [ ] Is the total cascade time <= 1.3s?
- [ ] Are effects triggered by click (not automatically)?
- [ ] If all effects are removed, is the content still fully readable?

## Tool
`transition_set` -> `animation_sequence` -> `animation_timing`

## Read next
`xp-media` -> `xp-handoff` -> `xp-environment`