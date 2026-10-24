#!/usr/bin/env python3
import json
import sys
import os
from pathlib import Path

def read_pptx(input_path):
    try:
        from pptx import Presentation
        from pptx.util import Inches
    except ImportError as e:
        return {"ok": False, "code": "E_COM_UNAVAILABLE", "message": f"python-pptx not available: {e}"}

    try:
        prs = Presentation(input_path)
        slides = []
        for i, slide in enumerate(prs.slides):
            shapes = []
            for shape in slide.shapes:
                text = ""
                if shape.has_text_frame:
                    for p in shape.text_frame.paragraphs:
                        text += p.text + "\n"
                elif shape.has_table:
                    rows = []
                    for row in shape.table.rows:
                        rows.append([cell.text for cell in row.cells])
                    text = str(rows)
                elif shape.has_chart:
                    text = "[Chart]"
                elif shape.shape_type == 13:  # Picture
                    text = "[Image]"

                left = Inches(shape.left).inches
                top = Inches(shape.top).inches
                width = Inches(shape.width).inches
                height = Inches(shape.height).inches

                shapes.append({
                    "name": shape.name,
                    "text": text.strip(),
                    "type": str(shape.shape_type),
                    "left": left,
                    "top": top,
                    "width": width,
                    "height": height,
                })
            notes = ""
            if slide.has_notes_slide:
                notes = slide.notes_slide.notes_text_frame.text
            slides.append({"index": i + 1, "shapes": shapes, "notes": notes})
        return {"ok": True, "slides": slides, "width": Inches(prs.slide_width).inches, "height": Inches(prs.slide_height).inches}
    except Exception as e:
        return {"ok": False, "code": "E_ENGINE", "message": str(e)}

if __name__ == "__main__":
    try:
        payload = json.load(sys.stdin)
        action = payload.get("action", "read")
        input_file = payload.get("input")
        if not input_file or not os.path.exists(input_file):
            print(json.dumps({"ok": False, "code": "E_NOT_FOUND", "message": f"File not found: {input_file}"}))
            sys.exit(1)
        if action == "read":
            result = read_pptx(input_file)
        else:
            result = {"ok": False, "code": "E_INVALID_INPUT", "message": f"Unknown action: {action}"}
    except Exception as e:
        result = {"ok": False, "code": "E_INTERNAL", "message": str(e)}
    print(json.dumps(result))