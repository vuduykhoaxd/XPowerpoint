---
name: xp-illustration
description: Used when needing icons/illustrations: icon set, SVG normalize, line-art,
  isometric, recolor, sizing, consistency.
---

# Illustration & icons

## Icon set

- 1 single set for entire deck (stroke width, corner, cap style).
- Stroke 1.5–2px at 24px; scale with size.
- Filled or outline, not mixed.
- <= 2 colors/icon: currentColor + accent.

## Sizing

| Use | Size |
|---|---|
| Inline with body | 16–20px |
| Card | 24–32px |
| Feature | 40–48px |
| Hero | 64–96px |

## SVG

- Normalize viewBox 0 0 24 24 (or 48).
- Remove hard fill -> currentColor for recolor.
- Don't flatten SVG to PNG (loses editability).
- Embed native SVG if engine supports; else PNG @2x.

## Line-art / isometric

- Line-art: 1 stroke, no gradient.
- Isometric: 30° angle, same light direction.
- Illustration must share palette with charts (no neon outside theme).

## Consistency

- Same style within slide and across deck.
- Same optical size, don't put 20px next to 48px on same row.
- Align by optical center, not bounding box.

## Geometric Decoration & Boolean Operations (Advanced)

PowerPoint is not just for text; it's a vector graphics tool. To make slides look premium, you MUST use shapes as decoration, not just containers.

### 1. Advanced Shapes Available
Do not limit yourself to rectangles. Use these preset geometries (`shape` field):
- `hexagon`: Great for honeycombs, tech feels, or modular grids.
- `circle` / `ellipse`: For accents, eyes, or overlapping color blobs.
- `triangle`: For direction, play buttons, or dynamic edges.
- `chevron` / `pentagon`: For process flows.
- `teardrop` / `cloud`: For organic backgrounds.
- `star5` / `star4`: For sparkles and highlights.
- `roundRect`: With a high `adj` value (e.g., `adj=50000`), it becomes a pill.

### 2. Creating Complex Shapes (The "Honeycomb" & "Shatter" Effects)
You cannot draw a complex shape in one go. You must draw it piece by piece:
- **Honeycomb (Tổ ong):** Draw multiple `hexagon` shapes, offset them by 50% of their width, and group them. Set the fill to a subtle gradient with 5% opacity. Use this as a background deco (z=10).
- **Shatter Effect (Cắt mảnh):** To make an image look "shattered", draw 5-6 polygon shapes (or triangles) over the image area. Group them, then apply a "Push" or "Wipe" transition to each piece with a staggered delay so they fly in from different angles.
- **Giant Overlapping Circles:** Draw 3 large `ellipse` shapes that bleed off the edge of the slide. Put them in the `deco` band (z=10), set `alpha` to 10-20%, and use a radial gradient. This creates a modern "glassmorphism" background.

### 3. Boolean Operations (Cắt/Ghép hình)
`python-pptx` does not natively support Boolean operations (Subtract, Intersect, Union) via code. 
- If the design requires cutting a shape out of an image (e.g., image inside a hexagon), use the `oxml` tool to inject the shape, or use `imagery` tools to mask the image with an SVG path.
- For advanced custom shapes, instruct the user to manually use PowerPoint's "Shape Format > Merge Shapes" feature.

### 4. The "Rule of Thirds" for Decor
- Place 1 giant shape in the background (z=1) bleeding off the bottom-right corner.
- Place 1 small accent shape near the title (z=25) to draw the eye.
- Use lines (`rect` with height=0.02in) to connect elements or separate sections.

### 5. Anti-Pattern
- Mixing 3 icon sets.
- Multi-color gradient icons.
- Icons used as bullet instead of text.
- 512px icon scaled to 16px (loss of detail).
- Do NOT use 10 different shapes randomly. Pick 1 geometric theme (e.g., all hexagons) and repeat it.
- Do NOT put complex deco in the `content` band. Deco goes in `deco` (z=10-19) or `bg` (z=0-9).
- Do NOT use a solid color for large background shapes; always use gradient + transparency.
- Do NOT rely on Boolean operations natively; simulate with layered shapes.

## Tool

`asset_search(category:"icon")` -> `asset_svg_normalize` -> `asset_recolor`.

## Read next

`xp-imagery` -> `xp-color` -> `xp-composition`