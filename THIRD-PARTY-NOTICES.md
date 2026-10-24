# Third-party notices

## Runtime dependencies

| Component | License | Use |
|---|---|---|
| PptxGenJS | MIT | Deck creation |
| python-pptx | MIT | Deck reading/editing |
| lxml | BSD-3-Clause | OOXML patching |
| Pillow | HPND | Image processing |
| @modelcontextprotocol/sdk | MIT | MCP transport |
| Zod | MIT | Tool input validation |

## Fonts

No font files are committed. `assets/fonts/` is intentionally empty; fonts are
installed at runtime and their license is recorded per font in `assets/fonts/LICENSE.json`
when present. Use `font_audit` and `asset_license_check` before embedding.

Recommended, redistributable defaults: Inter, Source Sans 3, Noto Sans, IBM Plex Sans,
Be Vietnam Pro (all OFL) — verify Vietnamese Latin Extended Additional coverage.

## Images, icons, templates

Assets downloaded through `asset_download` must carry `license` and `attribution` in
`assets/downloaded/*.json`. The commercial gate rejects `license: "unknown"`.

## Templates

`assets/templates/` starts empty. Any `.potx` added must ship with a license note here.
