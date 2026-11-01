"""Generate clearly-labelled PLACEHOLDER artworks + banner in the site's blue/brown palette.
Run: python3 scripts/make_placeholders.py   (overwrites images/artworks/placeholder-*.svg and images/site/banner-placeholder.svg)"""
import random, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
random.seed(11)
P = [  # (bg-from, bg-to, accents...)
    ("#0f2238", "#3a6a96", "#c49a6c", "#e3cfb4"), ("#2a1a10", "#8a5a36", "#6f9cc4", "#d8b48a"),
    ("#10263d", "#5b8db8", "#a8754a", "#f0e2cc"), ("#1b2a3a", "#7a5232", "#9cc0dc", "#c49a6c"),
    ("#0c1a2b", "#2f5578", "#d1a774", "#8fb3d1"), ("#3a2416", "#c49a6c", "#2f5578", "#f3e6d3"),
    ("#13293f", "#8fb3d1", "#7a4e2d", "#e3cfb4"), ("#22160e", "#5d3b22", "#5b8db8", "#e0c39c"),
]
def art(i, w, h, pal, label):
    a, b, c, d = pal
    s = []
    for k in range(6):
        x, y = random.uniform(0, w), random.uniform(0, h); r = random.uniform(.18, .42) * min(w, h)
        s.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r:.0f}" fill="{[c, d, b][k % 3]}" opacity="{random.uniform(.35, .7):.2f}" filter="url(#bl)"/>')
    for k in range(4):  # soft flowing strokes
        y0 = random.uniform(.2, .8) * h
        s.append(f'<path d="M-50 {y0:.0f} C {w*.3:.0f} {y0-h*random.uniform(-.3,.3):.0f}, {w*.6:.0f} {y0+h*random.uniform(-.3,.3):.0f}, {w+50} {y0+h*random.uniform(-.15,.15):.0f}" '
                 f'fill="none" stroke="{[d, c][k % 2]}" stroke-opacity=".35" stroke-width="{random.uniform(6, 26):.0f}" stroke-linecap="round" filter="url(#bs)"/>')
    cx, cy = random.uniform(.25, .75) * w, random.uniform(.2, .6) * h
    for k in range(1, 4):
        s.append(f'<circle cx="{cx:.0f}" cy="{cy:.0f}" r="{k*min(w,h)*.09:.0f}" fill="none" stroke="{d}" stroke-opacity="{.32-k*.07:.2f}" stroke-width="2"/>')
    tag = ''
    if label:
        tag = (f'<rect x="{w/2-200}" y="{h/2-36}" width="400" height="72" rx="36" fill="#0b121c" fill-opacity=".5"/>'
               f'<text x="50%" y="{h/2+11}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" letter-spacing="6" fill="#f3e6d3">{label}</text>')
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{a}"/><stop offset="1" stop-color="{b}"/></linearGradient>
<filter id="bl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="{min(w,h)*.035:.0f}"/></filter>
<filter id="bs"><feGaussianBlur stdDeviation="3"/></filter></defs>
<rect width="100%" height="100%" fill="url(#g)"/>{"".join(s)}{tag}</svg>'''
sizes = [(1200, 1500), (1200, 900), (1200, 1200), (1000, 1400), (1400, 1000), (1200, 1600), (1200, 1200), (1500, 1000)]
for i, (w, h) in enumerate(sizes):
    open(f"{root}/images/artworks/placeholder-{i+1}.svg", "w").write(art(i, w, h, P[i], f"PLACEHOLDER #{i+1}"))
# banner: ocean blues on the left melting into warm browns on the right; small label low in the centre
random.seed(5)
W, H = 2400, 900
parts = []
for k in range(14):
    left = k % 2 == 0
    x = random.uniform(0, W * .55) if left else random.uniform(W * .45, W)
    y = random.uniform(-100, H + 100); r = random.uniform(180, 420)
    col = random.choice(["#2f5578", "#5b8db8", "#1d3a5a", "#8fb3d1"]) if left else random.choice(["#8a5a36", "#c49a6c", "#5d3b22", "#a8754a"])
    parts.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r:.0f}" fill="{col}" opacity="{random.uniform(.45,.8):.2f}" filter="url(#bl)"/>')
for k in range(7):
    y0 = random.uniform(.15, .85) * H; col = random.choice(["#e3cfb4", "#8fb3d1", "#d2ab7c"])
    parts.append(f'<path d="M-100 {y0:.0f} C {W*.3:.0f} {y0-random.uniform(-260,260):.0f}, {W*.65:.0f} {y0+random.uniform(-260,260):.0f}, {W+100} {y0+random.uniform(-120,120):.0f}" fill="none" stroke="{col}" stroke-opacity="{random.uniform(.18,.4):.2f}" stroke-width="{random.uniform(3,14):.0f}" stroke-linecap="round" filter="url(#bs)"/>')
b = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#10263d"/><stop offset=".5" stop-color="#14202e"/><stop offset="1" stop-color="#3a2416"/></linearGradient>
<filter id="bl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="70"/></filter><filter id="bs"><feGaussianBlur stdDeviation="2.5"/></filter></defs>
<rect width="100%" height="100%" fill="url(#g)"/>{"".join(parts)}
<text x="50%" y="{H*.86:.0f}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" letter-spacing="6" fill="#f3e6d3" fill-opacity=".6">PLACEHOLDER BANNER</text></svg>'''
open(f"{root}/images/site/banner-placeholder.svg", "w").write(b)
print("ok")
