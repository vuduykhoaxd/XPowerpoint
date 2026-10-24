---
name: xp-motion
description: Used when needing transition, animation, timing, trigger, motion path,
  morph, or video export. Checks COM and target machine capability.
---

# Motion

## Transition (30+)

fade, morph, push, wipe, split, uncover, cover, zoom, pan, gallery, cube, flip,
honeycomb, glitter, vortex, shred, switch, ferris, conveyor, origami, dissolve,
ripple, prestige, random-bars, curtain, doors, window, wheel-reverse, blinds,
checkerboard.

Parameters: `direction` (8), `speed`, `duration` (ms), `advance_on_click`,
`advance_after`, `sound`.

## Animation

| Group | Examples |
|---|---|
| Entrance (~25) | appear, fade, fly-in, float-in, wipe, zoom, swivel, bounce, peek-in, wheel |
| Emphasis (~18) | pulse, color-pulse, spin, grow-shrink, desaturate, wave, glow, underline |
| Exit (~25) | corresponding entrance |
| Motion path | line, arc, circle, turn, loop, custom points |

Timing: `start` (on-click / with-previous / after-previous), `delay`, `duration`,
`repeat`, `rewind`, `smooth-start/end`, `bounce-end`, `auto-reverse`.

## Default rhythm

| Deck | Transition | Stagger |
|---|---|---|
| Corporate | fade 500–700ms | 60–80ms |
| Tech | fade/morph 600ms | 50ms |
| Editorial | fade 800ms | 80ms |
| Swiss | no motion | — |
| Hero | morph 900ms | 40ms |

## Rules

- 1 transition per slide; don't mix 3 types.
- Animation only to guide eye: title -> content -> data -> source.
- No infinite loop animations that distract.
- Morph needs same-named objects (`!!name`) across 2 slides.
- Always have non-animated `_flat` for safe presenting.

## COM check

`motion_preview` -> if `E_COM_UNAVAILABLE` -> report clearly, don't promise MP4/morph.
Fallback: only write motion spec, export pptx; note in speaker notes.

## Tool

`transition_set` -> `animation_sequence` -> `animation_timing`
-> `animation_morph` -> `motion_preview` -> `export_mp4`.

## Anti-pattern

- 5 effects/slide.
- Spin 360 on body text.
- Animation runs before slide is read.
- Morph without naming objects.

## Read next

`xp-media` -> `xp-handoff` -> `xp-environment`