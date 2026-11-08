#!/usr/bin/env bash
# Builds a throw-away local copy of the site with TEST content (extra pieces incl. a "Show bigger" one, a generated tone
# as background music) for scripts/check.js. Nothing here is committed or published.
# Serve it with: (cd /tmp/yaz-test-site && python3 -m http.server 8091)
set -e
cd "$(dirname "$0")/.."; T=/tmp/yaz-test-site; rm -rf "$T"; mkdir -p "$T"
cp -r content images .nojekyll 404.html "$T"/; [ -d audio ] && cp -r audio "$T"/; ln -s "$PWD/assets" "$T/assets"; ln -s "$PWD/index.html" "$T/index.html"
mkdir -p "$T/audio/site"
ffmpeg -loglevel error -y -f lavfi -i "sine=frequency=330:duration=8" -af volume=0.2 -q:a 6 "$T/audio/site/test-bg.mp3"
python3 - "$T" <<'PY'
import json, sys
T = sys.argv[1]
g = json.load(open(f'{T}/content/portfolio.json'))
for k in range(1, 6): g['artworks'].append({'image': f'/images/artworks/placeholder-{k}.svg?extra={k}', **({'featured': True} if k == 3 else {})})
json.dump(g, open(f'{T}/content/portfolio.json', 'w'), indent=1)
s = json.load(open(f'{T}/content/site.json')); s['music'] = '/audio/site/test-bg.mp3'; json.dump(s, open(f'{T}/content/site.json', 'w'), indent=1)
# First commission tier becomes a real multi-photo stack (distinct files, original kept in front). Other tiers stay as published.
c = json.load(open(f'{T}/content/commissions.json'))
if c.get('tiers'):
    imgs = list(c['tiers'][0].get('images') or [])
    for extra in ('/images/artworks/giant-girl-lake.jpg', '/images/artworks/img1593.jpeg'):
        if extra not in imgs:
            imgs.append(extra)
    c['tiers'][0]['images'] = imgs
    c['tiers'][0].pop('image', None)
    c['tiers'][0].pop('price', None)
    json.dump(c, open(f'{T}/content/commissions.json', 'w'), indent=1)
PY
python3 scripts/make_thumbs.py "$T" >/dev/null || true
echo "Test site ready in $T"
