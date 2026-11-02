#!/usr/bin/env python3
"""One-off, re-runnable migration from the old "gallery" content to the "portfolio" layout.
- content/gallery.json  -> content/portfolio.json (same artworks, same order, titles/captions untouched); gallery.json is removed.
- content/site.json: banner fields become the welcome/hero fields, the old "gallery" words are replaced, tagline -> heroIntro.
- content/commissions.json: seeded with 3 example tiers only if it doesn't exist yet.
Nothing else in site.json (links, about, commissions texts/toggle, music) is touched."""
import json, os
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
def load(p, d=None):
    try: return json.load(open(p, encoding='utf-8'))
    except FileNotFoundError: return d
def save(p, o): open(p, 'w', encoding='utf-8').write(json.dumps(o, ensure_ascii=False, indent=2) + '\n')

g, pf = load('content/gallery.json'), load('content/portfolio.json')
if g is not None:
    if pf and pf.get('artworks'):
        known = {a.get('image') for a in pf['artworks']}
        pf['artworks'] += [a for a in g.get('artworks', []) if a.get('image') not in known]
    else: pf = {'artworks': g.get('artworks', [])}
    save('content/portfolio.json', pf); os.remove('content/gallery.json')
    print('portfolio.json:', len(pf['artworks']), 'artworks')

s = load('content/site.json', {})
if 'gallery' in str(s.get('siteName', '')).lower() or not s.get('siteName'): s['siteName'] = 'yazarts'
if str(s.get('heroTitle', '')).strip().lower() in ('', 'yazarts'): s['heroTitle'] = 'Welcome!'
if str(s.get('heroSubtitle', '')).strip().lower() in ('', 'gallery'): s['heroSubtitle'] = 'To my portfolio'
if 'tagline' in s:
    s.setdefault('heroIntro', s['tagline']); del s['tagline']
if not s.get('heroImage') or str(s.get('heroImage')).endswith('banner-placeholder.svg'): s['heroImage'] = '/images/site/hero-cutout.png'
s.setdefault('heroImageAlt', 'Character art by @yazarts')
order = ['siteName', 'heroImage', 'heroImageAlt', 'heroTitle', 'heroSubtitle', 'heroIntro', 'about', 'commissionsOpen', 'commissionText', 'commissionClosedText', 'links', 'music']
save('content/site.json', {**{k: s[k] for k in order if k in s}, **{k: v for k, v in s.items() if k not in order}})

if load('content/commissions.json') is None:
    ex = 'Example: replace with your own art.'
    save('content/commissions.json', {'tiers': [
        {'name': 'Portraits', 'image': '/images/examples/portrait-example.jpg', 'price': '$25',
         'description': 'A head-and-shoulders portrait of your character or OC, fully coloured and shaded, with a simple background.',
         'notes': ex},
        {'name': 'Half Body', 'image': '/images/examples/half-body-example.jpg', 'price': '$50',
         'description': 'Your character from the waist up, with hands, outfit details and a soft background.',
         'notes': ex},
        {'name': 'Full Body Character', 'image': '/images/examples/full-body-example.jpg', 'price': '$75',
         'description': 'A full body illustration of your character, head to toe, fully rendered with lighting and a simple scene.',
         'notes': ex},
    ]})
    print('commissions.json seeded')
