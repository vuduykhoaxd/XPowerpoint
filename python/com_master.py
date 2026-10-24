#!/usr/bin/env python3
import json
import sys
import os

def embed_fonts(input_path, out_path=None):
    try:
        import comtypes.client
        input_path = os.path.abspath(input_path)
        if not os.path.exists(input_path):
            return {"ok": False, "code": "E_NOT_FOUND", "message": f"File not found: {input_path}"}
        out = os.path.abspath(out_path) if out_path else os.path.splitext(input_path)[0] + "-embedded.pptx"
        ppt = comtypes.client.CreateObject("PowerPoint.Application")
        ppt.Visible = True
        pres = ppt.Presentations.Open(input_path, ReadOnly=False, Untitled=False, WithWindow=False)
        try:
            pres.EmbedTrueTypeFonts = True
            pres.SaveAs(out, 24)
        finally:
            pres.Close()
            ppt.Quit()
        return {"ok": os.path.exists(out) and os.path.getsize(out) > 0, "file": out, "message": "Fonts embedded"}
    except Exception as e:
        return {"ok": False, "code": "E_COM_UNAVAILABLE", "message": f"Font embed failed: {e}"}

if __name__ == "__main__":
    try:
        payload = json.load(sys.stdin)
        action = payload.get("action", "embedFonts")
        if action == "embedFonts":
            result = embed_fonts(payload["input"], payload.get("out"))
        else:
            result = {"ok": False, "code": "E_INVALID_INPUT", "message": f"Unknown action: {action}"}
    except Exception as e:
        result = {"ok": False, "code": "E_INTERNAL", "message": str(e)}
    print(json.dumps(result))