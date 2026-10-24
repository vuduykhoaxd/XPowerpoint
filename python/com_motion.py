#!/usr/bin/env python3
import json
import sys
import os

EFFECTS = {
    'appear': 1, 'fly': 2, 'flyin': 2, 'wipe': 3, 'dissolve': 9, 'fade': 10,
    'zoom': 23, 'float': 42, 'grow': 25, 'pulse': 26, 'spin': 27,
}
TRIGGERS = {'onclick': 1, 'withprevious': 2, 'afterprevious': 3}
TRANSITIONS = {
    'none': 0, 'cut': 257, 'fade': 1793, 'dissolve': 1537, 'wiperight': 1281,
    'wipeleft': 1282, 'wipeup': 1283, 'wipedown': 1284, 'push': 3841,
    'cover': 3845, 'uncover': 3849, 'morph': 513,
}

def apply(input_path, slides, out_path):
    try:
        import comtypes.client
        ppt = comtypes.client.CreateObject("PowerPoint.Application")
        ppt.Visible = True
        pres = ppt.Presentations.Open(os.path.abspath(input_path), ReadOnly=False, Untitled=False, WithWindow=False)
        failures = []
        try:
            for i, slide_spec in enumerate(slides):
                if i >= pres.Slides.Count:
                    break
                slide = pres.Slides(i + 1)
                if "transition" in slide_spec:
                    t = slide_spec["transition"]
                    ttype = str(t.get("type", "none")).lower().replace(" ", "")
                    slide.SlideShowTransition.EntryEffect = TRANSITIONS.get(ttype, 0)
                    dur = float(t.get("duration", 0.6) or 0)
                    if dur > 0:
                        try:
                            slide.SlideShowTransition.Duration = dur
                        except Exception:
                            pass
                    adv = t.get("advance", "onClick")
                    if isinstance(adv, (int, float)):
                        slide.SlideShowTransition.AdvanceOnTime = True
                        slide.SlideShowTransition.AdvanceTime = float(adv)
                    elif str(adv).lower() in ("after", "auto"):
                        slide.SlideShowTransition.AdvanceOnTime = True
                        slide.SlideShowTransition.AdvanceTime = dur
                    else:
                        slide.SlideShowTransition.AdvanceOnTime = False
                if "sequence" in slide_spec:
                    for anim in slide_spec["sequence"]:
                        obj_id = anim.get("objectId")
                        if not obj_id:
                            continue
                        try:
                            shape = None
                            for sh in slide.Shapes:
                                if sh.Name == obj_id:
                                    shape = sh
                                    break
                            if not shape:
                                for sh in slide.Shapes:
                                    if obj_id in sh.Name:
                                        shape = sh
                                        break
                            if not shape:
                                failures.append(f"slide {i + 1}: shape {obj_id} not found")
                                continue
                            name = str(anim.get("effect", "fade")).lower().replace(" ", "")
                            effect_id = EFFECTS.get(name, 10)
                            trigger = TRIGGERS.get(str(anim.get("start", "onClick")).lower(), 1)
                            eff = slide.TimeLine.MainSequence.AddEffect(shape, effect_id, 0, trigger, 1)
                            try:
                                eff.Timing.Duration = float(anim.get("duration", 0.5))
                                if anim.get("delay"):
                                    eff.Timing.TriggerDelayTime = float(anim.get("delay"))
                            except Exception:
                                pass
                        except Exception as e:
                            failures.append(f"slide {i + 1}: {e}")
        finally:
            pres.SaveAs(os.path.abspath(out_path), 24)
            pres.Close()
            ppt.Quit()
        return {"ok": os.path.exists(out_path), "file": out_path, "failures": failures}
    except Exception as e:
        return {"ok": False, "code": "E_COM_UNAVAILABLE", "message": f"Motion apply failed: {e}"}

if __name__ == "__main__":
    try:
        payload = json.load(sys.stdin)
        action = payload.get("action", "apply")
        if action == "apply":
            result = apply(payload["input"], payload["slides"], payload["outPath"])
        else:
            result = {"ok": False, "code": "E_INVALID_INPUT", "message": f"Unknown action: {action}"}
    except Exception as e:
        result = {"ok": False, "code": "E_INTERNAL", "message": str(e)}
    print(json.dumps(result))