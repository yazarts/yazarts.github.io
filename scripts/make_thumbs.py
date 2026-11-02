#!/usr/bin/env python3
"""Deploy-time helper: makes small WebP previews for the gallery/album GRIDS only.

Usage: python3 scripts/make_thumbs.py _site
- Reads every JPG/PNG/WebP under <site>/images and writes <site>/thumbs/<same path>.webp (max 1200 px).
- Writes <site>/content/thumbs.json mapping "images/x.jpeg" -> "thumbs/images/x.jpeg.webp".
- The originals in the repo and on the site are NEVER modified; the viewer always opens the original file.
"""
import json, os, sys
from PIL import Image, ImageOps

site = sys.argv[1] if len(sys.argv) > 1 else '_site'
MAX, out = 1200, {}
for root, _, files in os.walk(os.path.join(site, 'images')):
    for f in files:
        if not f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
            continue
        src = os.path.join(root, f); rel = os.path.relpath(src, site).replace(os.sep, '/')
        dst = os.path.join(site, 'thumbs', rel + '.webp')
        try:
            with Image.open(src) as im:
                im = ImageOps.exif_transpose(im)
                if max(im.size) <= MAX:
                    continue                      # already small: the grid just uses the original
                im = im.convert('RGBA' if im.mode in ('RGBA', 'LA', 'P') else 'RGB')
                im.thumbnail((MAX, MAX), Image.LANCZOS)
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                im.save(dst, 'WEBP', quality=86, method=5)
            out[rel] = 'thumbs/' + rel + '.webp'
            print(f'{rel}: thumb {os.path.getsize(dst)//1024} KB (original {os.path.getsize(src)//1024} KB kept as-is)')
        except Exception as e:                    # never break the deploy over a thumbnail
            print(f'skip {rel}: {e}')
os.makedirs(os.path.join(site, 'content'), exist_ok=True)
with open(os.path.join(site, 'content', 'thumbs.json'), 'w') as fh:
    json.dump(out, fh, indent=0)
