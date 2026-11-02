#!/usr/bin/env bash
# Builds a throw-away local copy of the site with TEST content (album, extra pieces, generated tones) for scripts/check.js.
# Nothing here is committed or published. Serve it with: (cd /tmp/yaz-test-site && python3 -m http.server 8091)
set -e
cd "$(dirname "$0")/.."; T=/tmp/yaz-test-site; rm -rf "$T"; mkdir -p "$T"
cp -r content images .nojekyll "$T"/; [ -d audio ] && cp -r audio "$T"/; ln -s "$PWD/assets" "$T/assets"; ln -s "$PWD/index.html" "$T/index.html"
mkdir -p "$T/audio/site" "$T/audio/albums" "$T/images/albums"
ffmpeg -loglevel error -y -f lavfi -i "sine=frequency=330:duration=8" -af volume=0.2 -q:a 6 "$T/audio/site/test-bg.mp3"
ffmpeg -loglevel error -y -f lavfi -i "sine=frequency=520:duration=8" -af volume=0.2 -q:a 6 "$T/audio/albums/test-album.mp3"
python3 - "$T" <<'PY'
import json, sys
from PIL import Image, ImageDraw
T = sys.argv[1]
im = Image.new('RGB', (1600, 1600), (20, 120, 110)); d = ImageDraw.Draw(im)
for i in range(0, 1600, 80): d.ellipse([i-200, i-300, i+300, i+200], outline=(60, 200, 170), width=14)
im.save(f'{T}/images/albums/test-cover.jpg', quality=92)
g = json.load(open(f'{T}/content/portfolio.json'))
for k in range(1, 6): g['artworks'].append({'image': f'/images/artworks/placeholder-{k}.svg?extra={k}', 'title': f'TEST extra {k}', 'caption': 'Temporary local test piece'})
json.dump(g, open(f'{T}/content/portfolio.json', 'w'), indent=1)
arts = [a['image'] for a in g['artworks'] if a['image'].endswith(('.jpeg', '.jpg', '.png'))][:2] + ['/images/artworks/placeholder-2.svg', '/images/artworks/placeholder-6.svg', '/images/artworks/placeholder-7.svg']
json.dump({'albums': [{'name': 'TEST album (local only)', 'cover': '/images/albums/test-cover.jpg', 'description': 'Temporary local test album used for screenshots. Not published.', 'music': '/audio/albums/test-album.mp3',
  'artworks': [{'image': a, 'title': f'Test piece {i+1}', 'caption': 'Inside a test album'} for i, a in enumerate(arts)]},
  {'name': 'TEST second album', 'cover': arts[0], 'artworks': [{'image': arts[0], 'title': 'Test'}]}]}, open(f'{T}/content/albums.json', 'w'), indent=1)
s = json.load(open(f'{T}/content/site.json')); s['music'] = '/audio/site/test-bg.mp3'; json.dump(s, open(f'{T}/content/site.json', 'w'), indent=1)
PY
python3 scripts/make_thumbs.py "$T" >/dev/null || true
echo "Test site ready in $T"
