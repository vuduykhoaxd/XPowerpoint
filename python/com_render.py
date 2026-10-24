#!/usr/bin/env python3
import json
import sys
import os
import subprocess
import tempfile
from pathlib import Path

def probe():
    try:
        import comtypes.client
        comtypes.client.CreateObject("PowerPoint.Application")
        return {"ok": True, "available": True, "message": "PowerPoint COM available"}
    except Exception:
        return {"ok": True, "available": False, "message": "PowerPoint COM not available"}

def render(input_path, out_dir, formats, dpi=150):
    input_path = os.path.abspath(input_path)
    out_dir = os.path.abspath(out_dir)
    os.makedirs(out_dir, exist_ok=True)
    files = []
    try:
        import comtypes.client
        ppt = comtypes.client.CreateObject("PowerPoint.Application")
        ppt.Visible = True
        pres = ppt.Presentations.Open(input_path, ReadOnly=True, Untitled=False, WithWindow=False)
        try:
            for fmt in formats:
                if fmt.lower() == "pdf":
                    out = os.path.join(out_dir, Path(input_path).stem + ".pdf")
                    pres.SaveAs(out, 32)  # ppSaveAsPDF
                    files.append(out)
                elif fmt.lower() in ("png", "jpg", "jpeg"):
                    ext = "PNG" if fmt.lower() == "png" else "JPG"
                    out = os.path.join(out_dir, Path(input_path).stem + "-" + ext.lower())
                    pres.Export(out, ext, 1920, 1080)
                    # PowerPoint exports a folder of per-slide images
                    if os.path.isdir(out):
                        for f in sorted(os.listdir(out)):
                            if f.lower().endswith((".png", ".jpg", ".jpeg")):
                                files.append(os.path.join(out, f))
                elif fmt.lower() == "svg":
                    # LibreOffice fallback
                    out = os.path.join(out_dir, Path(input_path).stem + ".svg")
                    try:
                        subprocess.run(["soffice", "--headless", "--convert-to", "svg", "--outdir", out_dir, input_path], timeout=120, check=True)
                        if os.path.exists(out):
                            files.append(out)
                    except Exception:
                        pass
        finally:
            pres.Close()
            ppt.Quit()
        return {"ok": len(files) > 0, "files": files, "message": f"Rendered {len(files)} files"}
    except Exception as e:
        return {"ok": False, "code": "E_COM_UNAVAILABLE", "message": f"COM render failed: {e}"}

def video(input_path, out_path, seconds_per_slide=3):
    try:
        import comtypes.client
        ppt = comtypes.client.CreateObject("PowerPoint.Application")
        ppt.Visible = True
        pres = ppt.Presentations.Open(input_path, ReadOnly=True, Untitled=False, WithWindow=False)
        import time
        try:
            out_path = os.path.abspath(out_path)
            os.makedirs(os.path.dirname(out_path), exist_ok=True)
            pres.CreateVideo(out_path, True, seconds_per_slide * 1000, 1080, 24, 85)
            deadline = time.time() + 600
            while time.time() < deadline:
                status = pres.CreateVideoStatus
                if status == 2:
                    break
                if status == 3:
                    return {"ok": False, "code": "E_COM_UNAVAILABLE", "message": "PowerPoint video export failed"}
                time.sleep(1)
            size = os.path.getsize(out_path) if os.path.exists(out_path) else 0
            waited = 0
            while size == 0 and waited < 30:
                time.sleep(1)
                waited += 1
                size = os.path.getsize(out_path) if os.path.exists(out_path) else 0
            if size == 0:
                try:
                    if os.path.exists(out_path):
                        os.remove(out_path)
                except Exception:
                    pass
                return {"ok": False, "code": "E_COM_UNAVAILABLE", "message": f"PowerPoint did not finish writing the video (CreateVideoStatus={pres.CreateVideoStatus}). MP4 export requires PowerPoint desktop with media codecs.", "file": out_path}
            return {"ok": True, "file": out_path, "size": size}
        finally:
            pres.Close()
            ppt.Quit()
    except Exception as e:
        return {"ok": False, "code": "E_COM_UNAVAILABLE", "message": f"Video export failed: {e}"}

if __name__ == "__main__":
    try:
        payload = json.load(sys.stdin)
        action = payload.get("action", "probe")
        if action == "probe":
            result = probe()
        elif action == "render":
            result = render(payload["input"], payload["outDir"], payload.get("formats", ["pdf"]), payload.get("dpi", 150))
        elif action == "video":
            result = video(payload["input"], payload["outPath"], payload.get("secondsPerSlide", 3))
        else:
            result = {"ok": False, "code": "E_INVALID_INPUT", "message": f"Unknown action: {action}"}
    except Exception as e:
        result = {"ok": False, "code": "E_INTERNAL", "message": str(e)}
    print(json.dumps(result))