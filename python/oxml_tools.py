import sys
import json
import os
import zipfile
import base64
from lxml import etree

def get_rels(path):
    with zipfile.ZipFile(path, 'r') as z:
        rels_file = [f for f in z.namelist() if f.endswith('.rels')]
        out = {}
        for f in rels_file:
            with z.open(f) as r:
                tree = etree.parse(r)
                out[f] = [ { 'id': el.get('Id'), 'type': el.get('Type'), 'target': el.get('Target') } for el in tree.xpath('/*/*') ]
        return out

def get_part(path, part_name):
    with zipfile.ZipFile(path, 'r') as z:
        if part_name not in z.namelist():
            return None
        with z.open(part_name) as f:
            return f.read().decode('utf-8')

def write_part(path, part_name, content, out):
    out = out or os.path.join(os.path.dirname(os.path.abspath(path)), os.path.splitext(os.path.basename(path))[0] + '.patched.pptx')
    tmp = out + '.tmp'
    with zipfile.ZipFile(path, 'r') as src, zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED) as dst:
        for item in src.infolist():
            data = src.read(item.filename)
            if item.filename == part_name:
                data = content.encode('utf-8') if isinstance(content, str) else content
            dst.writestr(item, data)
    os.replace(tmp, out)
    return out

def validate(path):
    errors = []
    parts = 0
    try:
        with zipfile.ZipFile(path, 'r') as z:
            bad = z.testzip()
            if bad:
                errors.append('Corrupt zip entry: ' + bad)
            for name in z.namelist():
                if name.endswith('.xml') or name.endswith('.rels'):
                    parts += 1
                    try:
                        etree.fromstring(z.read(name))
                    except Exception as e:
                        errors.append(f'{name}: {e}')
    except Exception as e:
        errors.append(str(e))
    return parts, errors


PKG_NS = 'http://schemas.microsoft.com/office/2006/xmlPackage'
CT_NS = 'http://schemas.openxmlformats.org/package/2006/content-types'

def _content_types(z):
    defaults, overrides = {}, {}
    data = z.read('[Content_Types].xml')
    root = etree.fromstring(data)
    for el in root:
        tag = etree.QName(el).localname
        if tag == 'Default':
            defaults[el.get('Extension', '').lower()] = el.get('ContentType')
        elif tag == 'Override':
            overrides[el.get('PartName')] = el.get('ContentType')
    return defaults, overrides

def to_flat(path, out):
    out = out or os.path.splitext(path)[0] + '.xml'
    with zipfile.ZipFile(path, 'r') as z:
        defaults, overrides = _content_types(z)
        pkg = etree.Element('{%s}package' % PKG_NS, nsmap={'pkg': PKG_NS})
        for name in z.namelist():
            part = etree.SubElement(pkg, '{%s}part' % PKG_NS)
            part.set('{%s}name' % PKG_NS, '/' + name)
            ext = name.rsplit('.', 1)[-1].lower() if '.' in name else ''
            ctype = overrides.get('/' + name) or defaults.get(ext) or 'application/octet-stream'
            part.set('{%s}contentType' % PKG_NS, ctype)
            raw = z.read(name)
            if name.endswith('.xml') or name.endswith('.rels'):
                try:
                    node = etree.fromstring(raw)
                    xd = etree.SubElement(part, '{%s}xmlData' % PKG_NS)
                    xd.append(node)
                    continue
                except Exception:
                    pass
            bd = etree.SubElement(part, '{%s}binaryData' % PKG_NS)
            bd.text = base64.b64encode(raw).decode('ascii')
        etree.ElementTree(pkg).write(out, xml_declaration=True, encoding='UTF-8', standalone=True)
    return out

def from_flat(path, out):
    out = out or os.path.splitext(path)[0] + '.pptx'
    root = etree.parse(path).getroot()
    parts = root.findall('{%s}part' % PKG_NS)
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for part in parts:
            name = part.get('{%s}name' % PKG_NS).lstrip('/')
            xd = part.find('{%s}xmlData' % PKG_NS)
            bd = part.find('{%s}binaryData' % PKG_NS)
            if xd is not None and len(xd):
                data = etree.tostring(xd[0], xml_declaration=True, encoding='UTF-8', standalone=True)
            elif bd is not None:
                data = base64.b64decode(bd.text or '')
            else:
                data = b''
            z.writestr(name, data)
    return out

def main():
    try:
        input_data = json.load(sys.stdin)
        action = input_data.get('action')
        path = input_data.get('path') or input_data.get('input')

        if not path or not os.path.exists(path):
            print(json.dumps({'ok': False, 'message': 'File not found'}))
            return

        part_name = input_data.get('partName') or input_data.get('part')

        if action == 'parts':
            with zipfile.ZipFile(path, 'r') as z:
                print(json.dumps({'ok': True, 'parts': z.namelist()}))
        elif action == 'get':
            xml = get_part(path, part_name)
            if xml:
                print(json.dumps({'ok': True, 'xml': xml}))
            else:
                print(json.dumps({'ok': False, 'message': 'Part not found'}))
        elif action == 'rels':
            rels = get_rels(path)
            if part_name:
                base = part_name.rsplit('/', 1)
                key = (base[0] + '/_rels/' + base[1] + '.rels') if len(base) == 2 else part_name
                rels = {key: rels.get(key, [])}
            flat = []
            for items in rels.values():
                flat.extend(items)
            print(json.dumps({'ok': True, 'relationships': flat}))
        elif action == 'query':
            xml = get_part(path, part_name)
            if not xml:
                print(json.dumps({'ok': False, 'message': 'Part not found'}))
                return
            tree = etree.fromstring(xml.encode('utf-8'))
            results = [etree.tostring(el).decode('utf-8') for el in tree.xpath(input_data.get('xpath'), namespaces=tree.nsmap)]
            print(json.dumps({'ok': True, 'matches': results}))
        elif action == 'patch':
            xml = get_part(path, part_name)
            if not xml:
                print(json.dumps({'ok': False, 'message': 'Part not found'}))
                return
            find = input_data.get('find')
            replace = input_data.get('replace')
            xpath = input_data.get('xpath')
            if find is not None and replace is not None:
                new_xml = xml.replace(find, replace)
            elif xpath:
                tree = etree.fromstring(xml.encode('utf-8'))
                nodes = tree.xpath(xpath, namespaces=tree.nsmap)
                for el in nodes:
                    el.text = replace or ''
                new_xml = etree.tostring(tree, encoding='unicode')
            else:
                print(json.dumps({'ok': False, 'message': 'Provide find+replace or xpath+replace'}))
                return
            out = write_part(path, part_name, new_xml, input_data.get('out'))
            print(json.dumps({'ok': True, 'out': out, 'changed': new_xml != xml}))
        elif action == 'inject':
            xml = get_part(path, part_name)
            if not xml:
                print(json.dumps({'ok': False, 'message': 'Part not found'}))
                return
            snippet = input_data.get('xml') or ''
            marker = input_data.get('before')
            mode = 'before'
            if not marker:
                marker = input_data.get('after')
                mode = 'after'
            if marker:
                idx = xml.find(marker)
                if idx < 0:
                    print(json.dumps({'ok': False, 'message': 'Marker not found'}))
                    return
                pos = idx if mode == 'before' else idx + len(marker)
                new_xml = xml[:pos] + snippet + xml[pos:]
            else:
                close = xml.rfind('</')
                new_xml = xml[:close] + snippet + xml[close:] if close >= 0 else xml + snippet
            out = write_part(path, part_name, new_xml, input_data.get('out'))
            print(json.dumps({'ok': True, 'out': out}))
        elif action == 'validate':
            parts, errors = validate(path)
            print(json.dumps({'ok': True, 'valid': not errors, 'parts': parts, 'errors': errors}))
        elif action == 'convert':
            flat = bool(input_data.get('flat', True))
            out = to_flat(path, input_data.get('out')) if flat else from_flat(path, input_data.get('out'))
            print(json.dumps({'ok': os.path.exists(out), 'out': out, 'flat': flat}))
        else:
            print(json.dumps({'ok': False, 'message': f'Unknown action {action}'}))
    except Exception as e:
        print(json.dumps({'ok': False, 'message': str(e)}))

if __name__ == '__main__':
    main()
