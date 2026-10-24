# XPowerpoint v1.0.0

Full-control PowerPoint skill suite: 32 skills, an MCP server with 196 tools, and a
Windows COM / python-pptx / OOXML engine. Builds anything from an 8-object cover to a
150+ object dashboard, with transitions, animation, charts, diagrams, fonts, licensed
assets, and an editable + flat handoff.

---

# XPowerpoint v1.0.0

Bộ kỹ năng PowerPoint toàn quyền: 32 skills, MCP server 196 tools, engine Windows COM /
python-pptx / OOXML. Xây dựng mọi thứ từ cover 8 object đến dashboard 150+ object, có
transition, animation, chart, diagram, font, asset có license, và bản giao _editable + _flat.

---

## 📦 Quick Start (Windows)

```powershell
# 1 click (or run steps individually)
.\1ClickSetup.bat
```

Or manually:

```powershell
# 1. Install MCP server
cd mcp
npm install
npm run build
cd ..

# 2. Install Python bridge
pip install -r python/requirements.txt

# 3. Start server
node mcp/bin/server.mjs

# 4. Register as MCP server (Claude Desktop / any MCP host):
{
  "mcpServers": {
    "xpowerpoint": {
      "command": "node",
      "args": ["C:/Users/xd/Documents/GitHub/XPowerpoint-main/mcp/bin/server.mjs"],
      "env": { "PYTHONIOENCODING": "utf-8" }
    }
  }
}
```

---

## 📦 Khởi động nhanh (Windows)

```powershell
# 1 click (hoặc chạy từng bước)
.\1ClickSetup.bat
```

Hoặc thủ công:

```powershell
# 1. Cài MCP server
cd mcp
npm install
npm run build
cd ..

# 2. Cài Python bridge
pip install -r python/requirements.txt

# 3. Chạy server
node mcp/bin/server.mjs

# 4. Đăng ký MCP server (Claude Desktop / MCP host khác):
{
  "mcpServers": {
    "xpowerpoint": {
      "command": "node",
      "args": ["C:/Users/xd/Documents/GitHub/XPowerpoint-main/mcp/bin/server.mjs"],
      "env": { "PYTHONIOENCODING": "utf-8" }
    }
  }
}
```

## 🛠️ Development

```powershell
cd mcp
npm test                # smoke test (14 checks)
npm run test:mcp        # stdio MCP client, 196 tools + resource
npm run test:extended   # 20 tool-group checks incl. OOXML round-trip
```

It creates `output/decks/smoke.pptx` (cover, bullets, KPI dashboard) through the same
dispatcher the MCP tools use, checks the brief gate, reopens the exported PPTX, and
fails if any step breaks. Rendering/PDF/MP4 need PowerPoint COM; install `comtypes`
on Windows for those paths.

---

## 🛠️ Phát triển

```powershell
cd mcp
npm test                # smoke test (14 kiểm tra)
npm run test:mcp        # stdio MCP client, 196 tools + resource
npm run test:extended   # 20 nhóm tool check bao gồm OOXML round-trip
```

Tạo `output/decks/smoke.pptx` (cover, bullet, KPI dashboard) qua cùng dispatcher
MCP tools dùng, check brief gate, mở lại PPTX đã export, fail nếu bất kỳ bước nào lỗi.
Render/PDF/MP4 cần PowerPoint COM; cài `comtypes` trên Windows cho các path đó.

## 📁 Layout

| Path | Purpose | Mục đích |
|---|---|---|
| `SKILL.md` | Router, non-negotiables, stop conditions | Router, luật cứng, điều kiện dừng |
| `skill/` | 32 skills + 24 slide archetypes | 32 skills + 24 archetype slide |
| `schemas/` | JSON contracts (brief, deck, slide, object, motion, QA…) | Schema JSON (brief, deck, slide, object, motion, QA…) |
| `mcp/` | TypeScript MCP server and tool modules | MCP server TypeScript và module tool |
| `python/` | COM, python-pptx, OOXML bridge scripts | Script bridge COM, python-pptx, OOXML |
| `assets/` | Templates, themes, icons, fonts, textures, audio | Template, theme, icon, font, texture, audio |
| `tests/` | Fixtures, baselines, reports | Fixture, baseline, báo cáo |
| `output/` | Generated decks, previews, exports (gitignored) | Deck sinh ra, preview, export (gitignored) |

## 🔄 Pipeline

```
intake -> brief -> research -> assets -> spec -> build -> measure -> validate
       -> motion -> render -> visual verify -> export -> deliver
```

Gate table: see `SKILL.md` §Gates.

---

## 🔄 Pipeline

```
intake -> brief -> research -> assets -> spec -> build -> measure -> validate
       -> motion -> render -> visual verify -> export -> deliver
```

Bảng gate: xem `SKILL.md` §Gates.

## 📜 License

MIT for this repository. Bundled or downloaded assets keep their own licenses; see
`THIRD-PARTY-NOTICES.md` and `skill/xp-legal/SKILL.md`.

---

## 📜 Giấy phép

MIT cho repository này. Asset bundle hoặc tải về giữ license riêng; xem
`THIRD-PARTY-NOTICES.md` và `skill/xp-legal/SKILL.md`.

## 🚀 1ClickSetup.bat

A Windows-friendly one-click setup script is included at the repo root:

```
.\1ClickSetup.bat
```

It verifies Node.js, installs MCP dependencies, builds TypeScript, installs Python
requirements, and runs the smoke test.

---

## 🚀 1ClickSetup.bat

Script setup 1 click cho Windows có sẵn tại thư mục gốc:

```
.\1ClickSetup.bat
```

Kiểm tra Node.js, cài dependency MCP, build TypeScript, cài Python requirements,
chạy smoke test.

---

*Generated with ❤️ for the PowerPoint automation community.*

---

*Tạo ra với ❤️ cho cộng đồng tự động hóa PowerPoint.*