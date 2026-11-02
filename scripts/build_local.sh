#!/usr/bin/env bash
# Builds the site exactly like the deploy workflow does (copy public files + thumbnails/sizes) into /tmp/yaz-build/site,
# and a second copy under a sub-path (/tmp/yaz-build/sub/yazarts/) to check the site works at any base path.
set -e
cd "$(dirname "$0")/.."; B=/tmp/yaz-build; rm -rf "$B"; mkdir -p "$B/site"
cp -r index.html assets content images .nojekyll 404.html audio "$B/site/"
python3 scripts/make_thumbs.py "$B/site" > /dev/null
mkdir -p "$B/sub" && cp -r "$B/site" "$B/sub/yazarts"
echo "built $B/site and $B/sub/yazarts"
