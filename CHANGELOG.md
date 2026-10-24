# Changelog

## 2.0.0

- **Breaking**: Removed external PowerPoint MCP dependency; XPowerpoint now self-contained
- Single MCP server (196 tools) provides full PowerPoint control via PptxGenJS, python-pptx, and COM bridge
- All 32 skills internalized and routed via `xp-main` router
- Phase 1-13 complete: architecture audit, object control, design workflow, animation, cross-platform, file safety, testing, performance, documentation, release gates
- opencode skill configuration at `.opencode/opencode.json` with `skills.paths: ["skill"]`
- All 51 tests passing (smoke 14 + extended 20 + MCP client 6 + typecheck)
- Version metadata updated across package.json, server.ts, README, VERSION, 1ClickSetup.bat

## 1.0.0

- Full-control PowerPoint skill suite: 32 skills, 24 slide archetypes, 11 JSON schemas.
- MCP server with 17 tool groups (196 tools), session store with undo/redo.
- PptxGenJS deck builder, python-pptx reader, COM render/motion/master bridge.
- Quality gates: overflow, overlap, contrast, typography, consistency, accessibility,
  editability, licenses.
- Handoff: `_editable.pptx` + `_flat.pptx` export path.
- Verified: smoke test (14 checks), extended tool test (20 checks), MCP stdio client
  (196 tools), COM render/PDF/font-embed, native motion apply, OOXML read/patch/inject/
  flat round-trip, image/font tools, handout/notes/package/variants, handoff zip.
