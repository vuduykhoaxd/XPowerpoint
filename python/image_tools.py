import sys
import json
import os
from PIL import Image, ImageDraw

def get_metadata(path):
    with Image.open(path) as img:
        return {'width': img.width, 'height': img.height, 'format': img.format, 'mode': img.mode}

def resize(path, out, w, h):
    with Image.open(path) as img:
        img.thumbnail((w, h))
        img.save(out)
    return True

def crop(path, out, x, y, w, h):
    with Image.open(path) as img:
        # Pptx uses inches, but PIL uses pixels. 
        # For deconstruct tool, we might need to assume a DPI if not provided.
        # But bridge should pass pixel coords.
        img.crop((x, y, x + w, y + h)).save(out)
    return True

def palette(path, count=8):
    with Image.open(path) as img:
        img = img.convert('RGB').quantize(colors=count).convert('RGB')
        colors = img.getcolors()
        hex_colors = [ '#{:02x}{:02x}{:02x}'.format(*c[1]) for c in sorted(colors, reverse=True) ]
        return hex_colors

def contact_sheet(images, out, cols=4):
    if not images: return False
    thumbs = []
    for p in images:
        try:
            img = Image.open(p)
            img.thumbnail((400, 400))
            thumbs.append(img)
        except: continue
    if not thumbs: return False
    
    rows = (len(thumbs) + cols - 1) // cols
    w, h = thumbs[0].size
    sheet = Image.new('RGB', (w * cols, h * rows), (255, 255, 255))
    for i, img in enumerate(thumbs):
        sheet.paste(img, ((i % cols) * w, (i // cols) * h))
    sheet.save(out)
    return True


def _out(path, out, suffix='-out', ext=None):
    if out:
        return out
    base, old = os.path.splitext(path)
    return base + suffix + (ext or old or '.png')

def process(path, out, width, height, fit='cover', fmt=None, quality=85):
    with Image.open(path) as img:
        img = img.convert('RGBA' if fmt and fmt.lower() == 'png' else 'RGB')
        if width and height:
            src_ratio = img.width / img.height
            dst_ratio = width / height
            if fit == 'cover':
                if src_ratio > dst_ratio:
                    nw = int(img.height * dst_ratio)
                    img = img.crop(((img.width - nw) // 2, 0, (img.width + nw) // 2, img.height))
                else:
                    nh = int(img.width / dst_ratio)
                    img = img.crop((0, (img.height - nh) // 2, img.width, (img.height + nh) // 2))
                img = img.resize((width, height), Image.LANCZOS)
            else:
                img.thumbnail((width, height), Image.LANCZOS)
        elif width or height:
            img.thumbnail((width or img.width, height or img.height), Image.LANCZOS)
        target = _out(path, out, '-processed', ('.' + fmt.lower()) if fmt else None)
        save_fmt = (fmt or os.path.splitext(target)[1].lstrip('.') or 'PNG').upper()
        if save_fmt == 'JPG': save_fmt = 'JPEG'
        params = {'quality': int(quality)} if save_fmt == 'JPEG' else {}
        img.save(target, format=save_fmt, **params)
        return target

def remove_bg(path, out, tolerance=18):
    with Image.open(path) as img:
        img = img.convert('RGBA')
        px = img.load()
        corners = [px[0, 0], px[img.width - 1, 0], px[0, img.height - 1], px[img.width - 1, img.height - 1]]
        base = tuple(sum(c[i] for c in corners) // 4 for i in range(3))
        for y in range(img.height):
            for x in range(img.width):
                r, g, b, a = px[x, y]
                if abs(r - base[0]) <= tolerance and abs(g - base[1]) <= tolerance and abs(b - base[2]) <= tolerance:
                    px[x, y] = (r, g, b, 0)
        target = _out(path, out, '-cutout', '.png')
        img.save(target, format='PNG')
        return target

def main():
    try:
        input_data = json.load(sys.stdin)
        action = input_data.get('action')
        path = input_data.get('path')

        if action == 'metadata':
            print(json.dumps({'ok': True, 'metadata': get_metadata(path)}))
        elif action == 'palette':
            colors = palette(path, input_data.get('count', 8))
            print(json.dumps({'ok': True, 'colors': colors, 'palette': colors}))
        elif action == 'resize':
            resize(path, input_data.get('out'), input_data.get('width'), input_data.get('height'))
            print(json.dumps({'ok': True, 'path': _out(path, input_data.get('out'), '-resized')}))
        elif action == 'crop':
            crop(path, input_data.get('out'), input_data.get('x'), input_data.get('y'), input_data.get('width'), input_data.get('height'))
            print(json.dumps({'ok': True, 'path': _out(path, input_data.get('out'), '-cropped')}))
        elif action == 'contact_sheet':
            cols = input_data.get('columns') or input_data.get('cols') or 4
            ok_sheet = contact_sheet(input_data.get('images'), input_data.get('out'), cols)
            print(json.dumps({'ok': bool(ok_sheet), 'out': input_data.get('out')}))
        elif action == 'process':
            target = process(path, input_data.get('out'), input_data.get('width'), input_data.get('height'), input_data.get('fit', 'cover'), input_data.get('format'), input_data.get('quality', 85))
            print(json.dumps({'ok': True, 'path': target, 'out': target}))
        elif action == 'remove_bg':
            target = remove_bg(path, input_data.get('out'), input_data.get('tolerance', 18))
            print(json.dumps({'ok': True, 'path': target, 'out': target}))
        elif action == 'dots':
            # Sampling dots for deconstruct tool
            with Image.open(path) as img:
                img = img.convert('RGB')
                w, h = img.size
                grid = input_data.get('grid', 20)
                step_x = w / grid
                step_y = h / grid
                dots = []
                for iy in range(grid):
                    for ix in range(grid):
                        px = int(ix * step_x + step_x / 2)
                        py = int(iy * step_y + step_y / 2)
                        if px >= w or py >= h: continue
                        color = img.getpixel((px, py))
                        dots.append({
                            'x': ix / grid, 'y': iy / grid, 
                            'r': 0.4 / grid, # relative radius
                            'color': '#{:02x}{:02x}{:02x}'.format(*color)
                        })
                print(json.dumps({'ok': True, 'dots': dots}))
        else:
            print(json.dumps({'ok': False, 'message': f'Unknown action {action}'}))
    except Exception as e:
        print(json.dumps({'ok': False, 'message': str(e)}))

if __name__ == '__main__':
    main()
