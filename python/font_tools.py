import sys
import json
import os
try:
    from fontTools.ttLib import TTFont
except ImportError:
    TTFont = None

def get_coverage(font_path, text):
    if not TTFont: return None
    font = TTFont(font_path)
    cmap = font.getBestCmap()
    missing = [c for c in text if ord(c) not in cmap]
    return {'missing': missing, 'coverage': (len(text) - len(missing)) / len(text) if text else 1.0}


def subset_font(path, text, out=None):
    from fontTools import subset as ft_subset
    font = TTFont(path)
    opts = ft_subset.Options()
    opts.layout_features = ['*']
    opts.name_IDs = ['*']
    opts.notdef_outline = True
    subsetter = ft_subset.Subsetter(options=opts)
    subsetter.populate(text=text or '')
    subsetter.subset(font)
    if not out:
        base, ext = os.path.splitext(path)
        out = base + '-subset' + (ext or '.ttf')
    font.save(out)
    return out

def metrics(text, family='Segoe UI', size=18, path=None):
    try:
        from PIL import ImageFont
        candidates = []
        if path:
            candidates.append(path)
        if os.name == 'nt':
            windir = os.environ.get('WINDIR', r'C:\Windows')
            candidates.append(os.path.join(windir, 'Fonts', family.replace(' ', '') + '.ttf'))
        font = None
        for c in candidates:
            if c and os.path.exists(c):
                font = ImageFont.truetype(c, int(size))
                break
        if font is None:
            font = ImageFont.load_default()
        box = font.getbbox(text or ' ')
        w = max(0, box[2] - box[0])
        h = max(0, box[3] - box[1])
        return {'widthPx': w, 'heightPx': h, 'widthIn': w / 96.0, 'heightIn': h / 96.0, 'family': family, 'size': size, 'source': 'pillow'}
    except Exception:
        w = len(text or '') * float(size) * 0.52
        return {'widthPx': w, 'heightPx': float(size) * 1.2, 'widthIn': w / 96.0, 'heightIn': float(size) * 1.2 / 96.0, 'family': family, 'size': size, 'source': 'estimate'}

def main():
    try:
        input_data = json.load(sys.stdin)
        action = input_data.get('action')
        path = input_data.get('path')

        if action == 'coverage':
            if not TTFont:
                print(json.dumps({'ok': False, 'message': 'fontTools not installed'}))
                return
            res = get_coverage(path, input_data.get('text', ''))
            print(json.dumps({'ok': True, **res}))
        elif action == 'subset':
            out = subset_font(path, input_data.get('text', ''), input_data.get('out'))
            print(json.dumps({'ok': True, 'path': out, 'out': out}))
        elif action == 'metrics':
            print(json.dumps({'ok': True, **metrics(input_data.get('text', ''), input_data.get('family', 'Segoe UI'), input_data.get('size', 18), path)}))
        else:
            print(json.dumps({'ok': False, 'message': f'Unknown action {action}'}))
    except Exception as e:
        print(json.dumps({'ok': False, 'message': str(e)}))

if __name__ == '__main__':
    main()
