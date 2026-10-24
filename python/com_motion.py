#!/usr/bin/env python3
import json
import sys
import os

EFFECTS = {
    'appear': 1, 'fly': 2, 'flyin': 2, 'wipe': 3, 'dissolve': 9, 'fade': 10,
    'zoom': 23, 'float': 42, 'grow': 25, 'pulse': 26, 'spin': 27,
    'wipeleft': 1282, 'wiperight': 1281, 'wipeup': 1283, 'wipedown': 1284,
}
TRIGGERS = {'onclick': 1, 'withprevious': 2, 'afterprevious': 3}
TRANSITIONS = {
    'none': 0, 'cut': 257, 'fade': 1793, 'dissolve': 1537, 'wiperight': 1281,
    'wipeleft': 1282, 'wipeup': 1283, 'wipedown': 1284, 'push': 3841,
    'cover': 3845, 'uncover': 3849, 'morph': 513,
}

ALIASES = {
    "title": ["content/title", "title"],
    "subtitle": ["content/subtitle", "subtitle"],
    "body": ["content/bullet-0", "content/body", "content/bullet-1", "content/bullet-2"],
    "bullets": ["content/bullet-0", "content/bullet-1", "content/bullet-2", "content/bullet-3"],
    "source": ["ui/source", "source"],
    "logo": ["deco/logo", "logo"],
    "image": ["content/image", "image"],
    "chart": ["content/chart", "chart"],
    "table": ["content/table", "table"],
}

def _resolve_shapes(slide, obj_id):
    obj_str = str(obj_id)
    obj_lower = obj_str.lower()
    matches = []
    seen = set()

    def add(sh):
        if sh.Id not in seen:
            seen.add(sh.Id)
            matches.append(sh)

    for sh in slide.Shapes:
        if sh.Name == obj_str:
            add(sh)

    if not matches and obj_lower in ALIASES:
        for alias in ALIASES[obj_lower]:
            for sh in slide.Shapes:
                if sh.Name == alias:
                    add(sh)
            if matches:
                break

    if not matches and "*" in obj_str:
        import fnmatch
        for sh in slide.Shapes:
            if fnmatch.fnmatchcase(sh.Name, obj_str):
                add(sh)

    if not matches:
        for sh in slide.Shapes:
            if obj_lower in sh.Name.lower():
                add(sh)

    if not matches and obj_lower in ("body", "bullets", "text"):
        for sh in slide.Shapes:
            if sh.HasTextFrame and sh.TextFrame.HasText:
                if "title" not in sh.Name.lower():
                    add(sh)

    return matches

def apply(input_path, slides, out_path):
    try:
        import comtypes.client
        ppt = comtypes.client.CreateObject("PowerPoint.Application")
        ppt.Visible = True
        pres = ppt.Presentations.Open(
            os.path.abspath(input_path),
            ReadOnly=False,
            Untitled=False,
            WithWindow=False,
        )
        failures = []
        applied = 0
        try:
            for i, slide_spec in enumerate(slides):
                if i >= pres.Slides.Count:
                    failures.append(f"slide {i + 1}: does not exist in file")
                    continue
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
                            shapes = _resolve_shapes(slide, obj_id)
                            if not shapes:
                                failures.append(
                                    f"slide {i + 1}: shape {obj_id} not found "
                                    f"(available: {[sh.Name for sh in slide.Shapes]})"
                                )
                                continue

                            name = str(anim.get("effect", "fade")).lower().replace(" ", "")
                            effect_id = EFFECTS.get(name, 10)
                            trigger = TRIGGERS.get(str(anim.get("start", "onClick")).lower(), 1)

                            for idx, shape in enumerate(shapes):
                                try:
                                    eff = slide.TimeLine.MainSequence.AddEffect(
                                        shape, effect_id, 0, trigger, 1
                                    )
                                    print(
                                        f"[com_motion] slide {i+1}: {shape.Name} -> effect {eff.EffectType} (want {effect_id})",
                                        file=sys.stderr,
                                    )
                                    try:
                                        eff.Timing.Duration = float(anim.get("duration", 0.5))
                                    except Exception:
                                        pass
                                    delay = float(anim.get("delay", 0) or 0)
                                    if delay or idx > 0:
                                        try:
                                            eff.Timing.TriggerDelayTime = delay + idx * 0.1
                                        except Exception:
                                            pass
                                    applied += 1
                                except Exception as e:
                                    failures.append(f"slide {i + 1}: {obj_id} (shape {shape.Name}): {e}")
                        except Exception as e:
                            failures.append(f"slide {i + 1}: {obj_id}: {e}")
        finally:
            if failures:
                print(f"[com_motion] FAILURES ({len(failures)}):", file=sys.stderr)
                for f in failures:
                    print(f"  {f}", file=sys.stderr)
            print(f"[com_motion] applied={applied}, failures={len(failures)}", file=sys.stderr)
            try:
                pres.Save()
            except Exception as e:
                print(f"[com_motion] pres.Save() failed: {e}", file=sys.stderr)
            pres.SaveAs(os.path.abspath(out_path), 24)
            pres.Close()
            ppt.Quit()
        return {
            "ok": os.path.exists(out_path),
            "file": out_path,
            "applied": applied,
            "failures": failures,
        }
    except Exception as e:
        return {
            "ok": False,
            "code": "E_COM_UNAVAILABLE",
            "message": f"Motion apply failed: {e}",
        }

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