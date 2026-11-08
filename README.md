# yazarts

The art portfolio of **@yazarts**: a calm, dark navy-and-brown site that is **free to host** on GitHub Pages and **edited without code** through [Pages CMS](https://pagescms.org), a free editor that logs in with GitHub.

* Live site: **https://yazarts.github.io/** · Repository: **https://github.com/yazarts/yazarts.github.io**
* Plain HTML, CSS and JS. No server of your own and no build step.
* Content lives in `content/welcome.json` (welcome section + "See more" story), `content/portfolio.json` (artworks, in display order), `content/commissions.json` (open/closed + commission types), `content/contact.json` (contact button + social links) and `content/site.json` (site name, music).
* Every save in the CMS creates a commit on `main`. A free GitHub Actions workflow then republishes the site, usually within 1 to 2 minutes.

The page, top to bottom: **Welcome** (your cut-out character on the left, over a full-size background illustration; title, intro and a **See more** button on the right) → **Portfolio** (a sideways-scrolling brick wall of your work) → **Commissions** (a slideshow of your commission types, each with its own photos, then a **Not quite what you're looking for?** button that reveals your contact icons).

---

## For the artist: editing your portfolio

### Log in
1. Go to **https://app.pagescms.org**.
2. Click **Sign in with GitHub** and use your GitHub account.
3. Open the **yazarts.github.io** repository.

The left sidebar shows **Welcome section**, **Portfolio**, **Commissions**, **Contact & socials**, **Site settings**, and the media folders **Images** and **Music**. (If you still see an old "Gallery" or "Albums" item, refresh the page or sign out and in again: Pages CMS caches the old menu.)

### Welcome section
* **Floating character image (left side)**: a **PNG with a transparent background** (a character cut-out) floats over the background with no box. To make one for free: export the character layer alone as PNG from your drawing app, or use remove.bg / Photopea (Select → Remove background).
* **Floating image description**: a few words for screen readers.
* **Background illustration**: fills the whole welcome section behind everything, with a dark veil so the text stays readable. Wide pictures fit best. Remove it to get a calm dark navy "space" background instead.
* **Title** ("Welcome!") and **Intro line** ("Hi there! I'm yazarts! …"). Replace **[your city]**.
* **See more · heading / your story / photo of you**: the panel that opens from **See more**. The whole story is shown at once and fades in. Leave an empty line between paragraphs. The photo sits beside the text (above it on phones).

### Portfolio
1. Click **Portfolio**, scroll to the bottom of *Artworks* and click **Add an entry**.
2. **Image**: upload or pick a picture. Tick **Show bigger** to make it a big tile.
3. **Save**. The site updates in about 1 to 2 minutes.

* **Reorder:** drag an entry by its handle. The first one is the big tile on the left (on computers and tablets).
* **Delete:** use the entry's menu or trash icon, then **Save**. The file stays in **Images** until you delete it there.
* Tiles are cropped into a mix of shapes (wide, square, tall) for the brick look. Opening a piece always shows the **whole, uncropped original** full screen, with nothing else on screen but the close button and arrows. Visitors swipe, scroll, drag or use the arrows to browse.

Tip: JPG or WEBP files about 2000 px on the long side, under 1 to 2 MB, keep the site fast.

### Commissions
* **Commissions open?** On shows an **Available for commissions** badge. Off shows **Commissions closed**. The longer open and closed messages underneath stay as you wrote them.
* **Commission types (slides)**: each entry is one slide with **Example photos**, **Name**, **Description** and optional **Notes**. Add as many photos as you like, drag them to reorder (the first is the front of the stack), or remove them. A slide with one photo shows that photo; a slide with several shows them layered so visitors can tell there is more than one; a slide with none shows only the text. Drag to reorder types, **Add an entry** for a new type, remove one to delete it, then **Save**. Tapping the photos opens them full screen at the original quality, and the arrows browse only that type.
* **Testimonial (optional)** and **Who said it**: a real quote, shown between the slides and the contact button only when the quote is filled in. Leave both empty to hide them. Don't add a quote you don't have.
* The three starting slides use **public-domain example paintings** (see "Example images" below) and say "Example: replace with your own art." Replace each photo with your own work and clear the **Notes**.

### Contact & socials
* **Button text** ("Not quite what you're looking for?") and **Text above the icons** ("Contact me directly via:").
* **Email address**: type your address (`name@example.com`) or a `mailto:` link. It shows as an envelope that opens the visitor's email app. Leave it empty to hide the envelope. Nothing is sent from the site itself.
* **Social links**: edit, add, reorder or remove, then **Save**. Instagram, TikTok, Reddit, Ko-fi, X/Twitter and YouTube get matching icons automatically. Put email in **Email address**, not in this list. The **Contact** item in the top menu jumps here and opens the icons.

### Background music
**Site settings → Background music**: upload a light track. It loops softly. Browsers block sound until a visitor interacts, so it starts right away where allowed, otherwise on the first click, tap or key press. The small blue equalizer next to the site name toggles it. Remove the file and **Save** to turn the music off.

### Image quality
Uploads are published exactly as uploaded. Tiles and the welcome background use small previews made automatically at publish time; opening a piece always loads your original at full resolution, and zooming (pinch or double-tap) shows full detail.

### When do changes appear?
Usually **1 to 2 minutes** after **Save**. Refresh if you still see the old version. On GitHub, the **Actions** tab shows a green tick when it's live.

### Placeholders to replace
* **[your city]** in Welcome section → Intro line.
* **See more · your story**: the starting text is a general placeholder; write your own.
* **See more · photo of you**: currently `images/site/bio-photo-placeholder.svg` ("Your photo here").
* **Background illustration**: currently your piece `images/artworks/giant-girl-lake.jpg`; pick any piece (wide ones fit best).
* The abstract **PLACEHOLDER** images in the portfolio and the example paintings in the commission slides.

---

## Example images (commission slides)

All three are **public domain** (free to use, no attribution required), downloaded from Wikimedia Commons and resized to 1100 px tall:

| File | Work | Source |
|---|---|---|
| `images/examples/portrait-example.jpg` | Johannes Vermeer, *Girl with a Pearl Earring* (c. 1665) | https://commons.wikimedia.org/wiki/File:Meisje_met_de_parel.jpg |
| `images/examples/half-body-example.jpg` | Leonardo da Vinci, *Mona Lisa* (c. 1503–1519) | https://commons.wikimedia.org/wiki/File:Mona_Lisa,_by_Leonardo_da_Vinci,_from_C2RMF_retouched.jpg |
| `images/examples/full-body-example.jpg` | John Singer Sargent, *Madame X* (1883–84), The Met | https://commons.wikimedia.org/wiki/File:Madame_X_(Madame_Pierre_Gautreau)_MET_DT278076.jpg |

The welcome image `images/site/hero-cutout.png` is a background-removed cut-out of the artist's own piece `images/artworks/img1452.jpeg` (made with the free, open-source `rembg` tool).

---

## Hosting (already set up)

* Repository `yazarts/yazarts.github.io` (public; GitHub Pages is free for public repos). Because the repo is named `<user>.github.io`, the site lives at the root: **https://yazarts.github.io/**. The old address `https://yazarts.github.io/yazartsgallery/` no longer serves the site.
* **Settings → Pages → Source: GitHub Actions**. `.github/workflows/pages.yml` deploys on every push to `main`.
* Pages CMS: the Pages CMS GitHub App must have access to `yazarts.github.io` (GitHub → Settings → Applications → Pages CMS → Configure).
* Optional custom domain (paid, about $10/yr, so skipped to stay at $0).

---

## For developers

```
index.html              the one page: nav + music toggle, welcome (+ "See more" story panel), portfolio band, commissions slideshow + contact, viewer
assets/style.css        styles: dark navy, steel blue and caramel; Quicksand and Nunito
assets/site.js          loads content/*.json; welcome + fading story, portfolio brick packer + horizontal scroller,
                        commission slideshow (photo stack per type), contact reveal, music, the full-screen artwork viewer
content/welcome.json    heroImage, heroImageAlt, heroBackground, heroTitle, heroIntro, bioTitle, bio, bioPhoto
content/portfolio.json  { "artworks": [ { "image", "featured"? } ] }   (order = display order)
content/commissions.json{ "open", "openText", "closedText", "testimonial"?, "testimonialBy"?, "tiers": [ { "images": [ "/images/…" ], "name", "description", "notes" } ] }
content/contact.json    { "buttonLabel", "contactText", "email", "links": [ { "label", "url" } ] }
content/site.json       siteName, music
images/artworks/  images/commissions/  images/examples/  images/site/      audio/
.pages.yml              Pages CMS configuration (one CMS entry per JSON file)
scripts/make_thumbs.py  run by the deploy: WebP previews + every image's width/height -> content/thumbs.json
scripts/build_local.sh  builds the site like the deploy into /tmp/yaz-build (root + a sub-path copy)
scripts/check.js        Playwright end-to-end checks + screenshots (desktop 1280x800, iPad 1024x1366, phone 390x844)
```

* **Portfolio band:** a fixed-height strip with 2 rows (up to ~85% of the viewport on desktop, 340–520 px on phones) that scrolls horizontally. `site.js` gives tiles a repeating mix of crop ratios and packs them into two lanes (big tiles span both lanes; the shorter lane is stretched so rows end flush), computed once up front so nothing moves while images load. Images use `object-fit: cover`. Touch uses pure native momentum scrolling (no scroll-snap, no JS); trackpads scroll 1:1, notched mouse wheels glide sideways until the band reaches an end; mouse drag has momentum. For smooth iPad Safari scrolling there is no `mask-image` or `backdrop-filter` on or inside the scroller, and the track uses `contain: layout paint`. A soft blue glow appears only for `@media (hover: hover) and (pointer: fine)`. It is a box-shadow, not a scale or move, so a touch screen never sticks a hover zoom while swiping.
* **Section fades:** an inline script adds `js` on `<html>`. With that class, `.fade` blocks and the portfolio bricks rise in over about 0.34s (no blur). Without JavaScript they stay visible. `prefers-reduced-motion` shows them immediately.
* **Commission slideshow:** rAF-timed, 5 s per slide; pauses on hover, focus, touch, while the viewer is open and when the tab is hidden; dots, prev/next, keyboard and swipe; with `prefers-reduced-motion` it does not auto-advance. Each tier's `images` array (a legacy single `image` is still read, and duplicates are dropped) is a photo stack: one image is a single picture, two or more are offset so the extras peek out, and an empty list leaves the name and description. Tapping opens the full-screen viewer on that tier's originals only.
* **Story panel:** the complete biography is in the page and fades in (about 0.4 s) when the panel opens. There is no typewriter and no cursor. `prefers-reduced-motion` shows it immediately. Esc, the X or the backdrop closes it.
* **Paths:** the CMS writes `/images/...`; `site.js` strips the leading `/`, so the site works at the root and under any sub-path (checked by `scripts/check.js`).
* **Run the checks:** `npm install`, `bash scripts/build_local.sh`, serve `/tmp/yaz-build/site` on :8091 and `/tmp/yaz-build/sub` on :8092 (`python3 -m http.server`), then `node scripts/check.js`. Screenshots go to `screenshots/` (git-ignored).
* **Music:** `<audio id="bgAudio">` (0.35, loop); choice stored in `localStorage` `yaz.sound`.
* **Viewer:** the clicked tile flies into a full-screen viewer tinted with the artwork's colour, showing only the artwork. Swipe or arrows to browse, pinch/double-tap/ctrl+scroll to zoom with the full-resolution original. Portfolio tiles and a commission tier's photos share it. A tier opens on its own photos, so the arrows never leave that tier; a single photo hides the arrows. The commission slideshow stays paused until the viewer closes.
* **Commissions badge:** `open: true` shows "Available for commissions". Any other value shows "Commissions closed". The saved flag is not rewritten.
* **Testimonial:** `testimonial` plus optional `testimonialBy` render between the slides and the contact button only when the quote has text. An attribution alone stays hidden. Nothing is filled in by default.
* **Contact email:** `email` accepts a bare address or a `mailto:` link (a query string is ignored). An empty or invalid value hides the envelope. An older social link whose label or URL is an email is shown as that envelope instead of a chain icon, and is not listed twice. The link is only `mailto:`; the page does not send mail.

## Limitations
* Changes take about 1 to 2 minutes to go live (GitHub Actions plus Pages caching). There's no instant preview of unsaved edits.
* Images are published exactly as uploaded, with no automatic resizing. Upload web-sized files.
* The repository must be public for free Pages, so the original uploaded image files are publicly downloadable. That is also true of any image on any website.
* Pages CMS is a free third-party hosted service. If it ever goes away, content is still plain JSON and images in the repo, editable on github.com, or Pages CMS can be self-hosted for free.
* The GitHub Free account limits that matter here are a 1 GB recommended repo size, 100 MB per file, and 100 GB/month Pages bandwidth. These are plenty for a portfolio.
