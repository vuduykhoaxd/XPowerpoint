# Changelog
## [2.1.1] - 2026-10-25

### Added
- **Advanced Shape Support:** The layout engine (`builder.ts`) now maps over 100+ PowerPoint shapes (hexagons, stars, arrows, callouts, flowcharts), replacing the previous fallback to simple rectangles.
- **Gradient & Transparency:** `buildFill()` now supports native gradient fills and alpha transparency, enabling modern design trends like "Glassmorphism".
- **Geometric Decorators:** Added automated shape generators in `archetypes.ts` (`createHoneycomb`, `createShatter`, `createDotGrid`, `createWaves`, `createGlassBlobs`) and a new `decor-modern` archetype to automatically generate complex backgrounds.
- **Golden Grid Math:** Implemented measured grid calculations (`getCardGrid`) based on 1,196 professional slides. N=4 grids are now the default, with automatic padding (`min(0.8% width, 25% card_w)`) to prevent text overflow.
- **Strict Composition Rules:** Merged three expert-level design specs (Layout, Spacing, Components) into `skill/xp-composition/SKILL.md` to enforce the "Proximity Ratio" (gap_between / gap_inside ≥ 4) and strict vertical alignment (`valign: middle`).

### Changed
- **Anti-Hacking Constraints:** Disabled `layout_collision(resolve=true)` in `layout.ts`. The AI is now forced to rebuild slides manually using the grid instead of pushing shapes into arbitrary overlapping positions.
- **Archetype Fulfillment:** Updated `skill/xp-slide-types/SKILL.md` to strictly enforce mandatory blocks (e.g., a `cover` must have a subtitle and metadata; `text-and-bullets` must have a footer).
- **Copywriting Density:** Updated `skill/xp-copywriting/SKILL.md` to use "Word Budgets" by archetype, preventing empty slides while allowing covers to remain minimal.
- **Motion Rules:** Integrated data from 1,196 slides into `skill/xp-motion/SKILL.md` (76% fade default, 1 click = 1 semantic group, no loops).
- **Auto-Footer:** The `archetypes.ts` engine now automatically injects a source/footer block into content slides to prevent them from looking incomplete.

### Fixed
- Fixed TypeScript build errors related to `LineStyle` type checks in `builder.ts`.
- Prevented `layout_collision` from throwing errors when called without an active `deckId`.
- Fixed the issue where `slide_add` ignored `transition` and `motion` parameters, causing decks to be exported without animations.

### Security / Internals
- Cleaned up duplicate imports in `export.ts`.
- Added `fflate` to dev dependencies for XML inspection scripts.

## [2.1.0] - 2026-10-25

### Added
- **MCP Elicitation**: server now auto-asks for `topic`, `slideCount`, and
  `useEffects` when missing, instead of silently guessing.
- **Auto-approve**: brief is approved automatically after intake if all three
  mandatory fields are present.
- **Auto-motion**: when `useEffects=true`, `deck_save` / `deck_save_as` call
  `applyMotion` (COM) to write real transitions/animations.
- **Gated tools**: `slide_add`, `slide_add_batch`, `slide_update`, `slide_clone`,
  `deck_save`, `deck_save_as`, `deck_export`, `deck_handoff` now run the intake gate.
- **Slide motion**: `slide_add` now accepts `transition` and `motion` parameters.
- `comtypes` documented in THIRD-PARTY-NOTICES.md (required for motion).

### Changed
- `Brief` type now includes `topic` and `useEffects`.
- `ToolContext` now exposes an optional `elicit` function.
- `SKILL.md` non-negotiables and stop conditions hardened: no build without
  `topic`, `slideCount`, `useEffects`; no export without motion when
  `useEffects=true` and COM is available.
- `com_motion.py`: added alias resolution for `title`/`body`/`bullets`, improved
  logging (`applied` counter), and fixed `SaveAs` overriding the open file.

### Fixed
- `[intakeGate] error: No active deck` when calling `deck_new`.
- Animation lost when `applyMotion` saved to the same file as input
  (now uses a temporary output file).

## [2.0.0] - 2026-10-24

- **Breaking**: Removed external PowerPoint MCP dependency; XPowerpoint now self-contained
- Single MCP server (196 tools) provides full PowerPoint control via PptxGenJS, python-pptx, and COM bridge
- All 32 skills internalized and routed via `xp-main` router
- Phase 1-13 complete: architecture audit, object control, design workflow, animation, cross-platform, file safety, testing, performance, documentation, release gates
- opencode skill configuration at `.opencode/opencode.json` with `skills.paths: ["skill"]`
- All 51 tests passing (smoke 14 + extended 20 + MCP client 6 + typecheck)
- Version metadata updated across package.json, server.ts, README, VERSION, 1ClickSetup.bat

## [1.0.0] - 2026-10-23

- Full-control PowerPoint skill suite: 32 skills, 24 slide archetypes, 11 JSON schemas.
- MCP server with 17 tool groups (196 tools), session store with undo/redo.
- PptxGenJS deck builder, python-pptx reader, COM render/motion/master bridge.
- Quality gates: overflow, overlap, contrast, typography, consistency, accessibility,
  editability, licenses.
- Handoff: `_editable.pptx` + `_flat.pptx` export path.
- Verified: smoke test (14 checks), extended tool test (20 checks), MCP stdio client
  (196 tools), COM render/PDF/font-embed, native motion apply, OOXML read/patch/inject/
  flat round-trip, image/font tools, handout/notes/package/variants, handoff zip.
