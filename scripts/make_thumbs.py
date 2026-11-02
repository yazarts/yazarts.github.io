#!/usr/bin/env python3
"""Deploy-time helper: small WebP previews for the portfolio/album/commission GRIDS, plus every image's size.

Usage: python3 scripts/make_thumbs.py _site
- Reads every JPG/PNG/WebP under <site>/images and writes <site>/thumbs/<same path>.webp (max 1200 px) for big files.
- Writes <site>/content/thumbs.json:
    { "thumbs": { "images/x.jpeg": "thumbs/images/x.jpeg.webp", ... },
      "sizes":  { "images/x.jpeg": [width, height], ... } }        (sizes also cover small files and SVGs)
  The sizes let the portfolio lay out its bricks at the right shape before any image has loaded (no layout jump).
- The originals in the repo and on the site are NEVER modified; the viewer always opens the original file.
"""
import json, os, re, sys
try:
    from PIL import Image, ImageOps
except ImportError:                                # no Pillow: still write SVG sizes, the site falls back to originals
    Image = None

site = sys.argv[1] if len(sys.argv) > 1 else '_site'
MAX, thumbs, sizes = 1200, {}, {}

def svg_size(path):
    head = open(path, 'r', encoding='utf-8', errors='ignore').read(4000)
    tag = re.search(r'<svg\b[^>]*>', head, re.S)
    if not tag: return None
    t = tag.group(0)
    w, h = re.search(r'\bwidth="([\d.]+)(px)?"', t), re.search(r'\bheight="([\d.]+)(px)?"', t)
    if w and h: return [round(float(w.group(1))), round(float(h.group(1)))]
    vb = re.search(r'viewBox="[\d.\-]+[ ,]+[\d.\-]+[ ,]+([\d.]+)[ ,]+([\d.]+)"', t)
    return [round(float(vb.group(1))), round(float(vb.group(2)))] if vb else None

for root, _, files in os.walk(os.path.join(site, 'images')):
    for f in files:
        src = os.path.join(root, f); rel = os.path.relpath(src, site).replace(os.sep, '/'); low = f.lower()
        try:
            if low.endswith('.svg'):
                s = svg_size(src)
                if s: sizes[rel] = s
                continue
            if not low.endswith(('.jpg', '.jpeg', '.png', '.webp', '.gif')) or Image is None:
                continue
            with Image.open(src) as im:
                im = ImageOps.exif_transpose(im)
                sizes[rel] = [im.width, im.height]
                if max(im.size) <= MAX or low.endswith('.gif'):
                    continue                          # already small: the grid just uses the original
                dst = os.path.join(site, 'thumbs', rel + '.webp')
                im = im.convert('RGBA' if im.mode in ('RGBA', 'LA', 'P') else 'RGB')
                im.thumbnail((MAX, MAX), Image.LANCZOS)
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                im.save(dst, 'WEBP', quality=86, method=5)
            thumbs[rel] = 'thumbs/' + rel + '.webp'
            print(f'{rel}: thumb {os.path.getsize(dst)//1024} KB (original {os.path.getsize(src)//1024} KB kept as-is)')
        except Exception as e:                        # never break the deploy over a thumbnail
            print(f'skip {rel}: {e}')
os.makedirs(os.path.join(site, 'content'), exist_ok=True)
with open(os.path.join(site, 'content', 'thumbs.json'), 'w') as fh:
    json.dump({'thumbs': thumbs, 'sizes': sizes}, fh, indent=0)
print(f'{len(thumbs)} thumbs, {len(sizes)} sizes')
