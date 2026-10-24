# Changelog

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
