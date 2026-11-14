#!/usr/bin/env python3
"""Build deep-zoom tiles for portfolio and commission images.

Usage: python3 scripts/make_dzi.py _site

For every raster image named in content/portfolio.json and content/commissions.json:
  - a screen-sized JPEG preview (longest side 2048, never upscaled)
  - a Deep Zoom pyramid from libvips (vips dzsave), full original resolution at the top level

Writes content/dzi.json mapping the original path to {w, h, preview, tiles, tile, overlap, format}.
Originals are never modified. Images without tiles (SVG, or vips missing) are simply omitted,
and the viewer falls back to the original file.
"""
import json, os, subprocess, sys

site = sys.argv[1] if len(sys.argv) > 1 else '_site'
PREVIEW = 2048

def load(name):
    path = os.path.join(site, 'content', name)
    try:
        with open(path, encoding='utf-8') as fh:
            return json.load(fh)
    except Exception:
        return {}

def referenced():
    out = []
    for art in load('portfolio.json').get('artworks') or []:
        if isinstance(art, dict) and art.get('image'):
            out.append(art['image'])
    comm = load('commissions.json')
    for tier in comm.get('tiers') or []:
        if not isinstance(tier, dict):
            continue
        photos = tier.get('photos') or tier.get('images') or []
        if isinstance(photos, str):
            photos = [photos]
        for p in photos:
            if isinstance(p, str):
                out.append(p)
            elif isinstance(p, dict):
                src = p.get('image') or p.get('src')
                if src:
                    out.append(src)
        if isinstance(tier.get('image'), str):
            out.append(tier['image'])
    seen, uniq = set(), []
    for p in out:
        key = str(p).split('?', 1)[0].split('#', 1)[0].lstrip('/')
        if key and key not in seen:
            seen.add(key)
            uniq.append(key)
    return uniq

def vips(*args):
    subprocess.check_call(['vips', *args], stdout=subprocess.DEVNULL)

def main():
    try:
        subprocess.check_call(['vips', '--version'], stdout=subprocess.DEVNULL)
    except Exception:
        print('vips is not installed; skipping deep-zoom tiles (the viewer will use the originals)')
        return 0
    manifest = {}
    for rel in referenced():
        src = os.path.join(site, rel)
        low = rel.lower()
        if not os.path.isfile(src) or not low.endswith(('.jpg', '.jpeg', '.png', '.webp')):
            continue
        base = os.path.join(site, 'tiles', rel)
        os.makedirs(os.path.dirname(base), exist_ok=True)
        preview_rel = 'tiles/' + rel + '.preview.jpg'
        try:
            vips('thumbnail', src, os.path.join(site, preview_rel), str(PREVIEW), '--size', 'down')
            vips('dzsave', src, base, '--tile-size', '254', '--overlap', '1', '--suffix', '.jpg[Q=80,strip]')
            # dzsave prints the full-image size in the .dzi file
            dzi_path = base + '.dzi'
            text = open(dzi_path, encoding='utf-8').read()
            import re
            w = int(re.search(r'Width="(\d+)"', text).group(1))
            h = int(re.search(r'Height="(\d+)"', text).group(1))
        except Exception as e:
            print(f'skip {rel}: {e}')
            continue
        manifest[rel] = {
            'w': w, 'h': h,
            'preview': preview_rel,
            'tiles': 'tiles/' + rel + '_files',
            'tile': 254, 'overlap': 1, 'format': 'jpg',
        }
        print(f'{rel}: {w}x{h} tiles')
    os.makedirs(os.path.join(site, 'content'), exist_ok=True)
    with open(os.path.join(site, 'content', 'dzi.json'), 'w', encoding='utf-8') as fh:
        json.dump(manifest, fh, indent=0)
    print(f'{len(manifest)} deep-zoom images')
    return 0

if __name__ == '__main__':
    sys.exit(main())
