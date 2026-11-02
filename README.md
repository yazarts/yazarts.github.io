# yazarts

The art portfolio of **@yazarts**: a calm, dark navy-and-brown site that is **free to host** on GitHub Pages and **edited without code** through [Pages CMS](https://pagescms.org), a free editor that logs in with GitHub.

* Live site: **https://yazarts.github.io/** · Repository: **https://github.com/yazarts/yazarts.github.io**
* Plain HTML, CSS and JS. No server of your own and no build step.
* Content lives in `content/portfolio.json` (artworks, in display order), `content/albums.json`, `content/commissions.json` (commission types) and `content/site.json` (welcome section, links, commissions open/closed, about text, music).
* **Likes and views** use [Abacus](https://abacus.jasoncameron.dev), a free counter service that needs **no account, no key and no setup**.
* Every save in the CMS creates a commit on `main`. A free GitHub Actions workflow then republishes the site, usually within 1 to 2 minutes.

The page, top to bottom: **Welcome** (your cut-out character on a warm brown gradient) → **Portfolio** (a sideways-scrolling brick wall of your work) → **Albums** → **Commissions** (a slideshow of your commission types and prices) → **About** → **Connect**.

---

## For the artist: editing your portfolio

### Log in
1. Go to **https://app.pagescms.org**.
2. Click **Sign in with GitHub** and use your GitHub account.
3. Open the **yazarts.github.io** repository.

The left sidebar shows **Portfolio**, **Albums**, **Commissions**, **Site settings** and **Media**.

### Welcome section (top of the page)
In **Site settings**:
* **Welcome image**: upload a **PNG with a transparent background** (a character cut out from its background). It floats on the brown gradient with no box around it. A normal rectangular picture works too, but it will look like a box.
  To make a cut-out for free: export your character layer alone as PNG from your drawing app, or use a free background remover such as remove.bg or Photopea (Select → Remove background) and save as PNG.
* **Welcome image description**: a few words for screen readers.
* **Welcome title** ("Welcome!"), **Welcome subtitle** ("To my portfolio") and **Welcome intro** (the short line below).
* **Site name**: shown top-left next to the music button and in the footer.

### Portfolio
1. Click **Portfolio**. Scroll to the bottom of the *Artworks* list and click **Add an entry**.
2. **Image**: upload or pick a picture. Any shape works: tall, square or wide pieces keep their real proportions and are packed like bricks.
3. Optional **Title**, a **Caption** (shown when someone opens the piece full size), and **Show bigger** to make it a big tile. The first artwork is always big.
4. Click **Save**. The site updates in about 1 to 2 minutes.

* **Reorder:** drag an entry by its handle. The first one is the first (big) tile on the left.
* **Edit:** click an entry to expand it, change the text, **Save**.
* **Delete:** use the entry's menu or trash icon, then **Save**. The file stays in **Media** until you delete it there.

Visitors scroll the portfolio sideways (mouse wheel, trackpad, drag, the arrows, or swipe on a phone). Clicking a piece opens the full-size viewer.

Tip: JPG or WEBP files about 2000 px on the long side, under 1 to 2 MB, keep the site fast.

### Albums
1. Click **Albums**, then **Add an entry** under *Albums*.
2. **Album name**, **Album cover** (square works best), optional **Description**.
3. **Album music (optional)**: an mp3, m4a, ogg or wav that plays while the album is open (the background music pauses meanwhile).
4. Under **Artworks in this album**, add each piece (**Image**, **Title**, **Caption**) and drag to reorder.
5. **Save**. To delete an album, open its menu (⋯) and choose **Remove**, then **Save**.

### Commissions
* **Open or closed:** in **Site settings**, flip **Commissions open?** and check the two messages (one for open, one for closed).
* **Commission types (the slideshow):** click **Commissions**. Each entry is one slide:
  * **Tier name** (e.g. *Portraits*, *Full Body Character*), shown big.
  * **Example image**, any shape (your own art works best).
  * **Description**.
  * **Price**, shown in the outlined box (e.g. *$25*, *from $40*).
  * **Extra notes** (optional small text under the price).
  Drag entries to reorder, **Add an entry** for a new type, remove one to delete it, then **Save**. The slides switch every 5 seconds and pause while a visitor hovers, touches or uses the keyboard on them.
* The three starting slides use **public-domain example paintings** (see "Example images" below) and say "Example: replace with your own art." Replace each **Example image** with your own work and clear the **Extra notes**.

### Social links
**Site settings → Social links**: edit, add (**Add an entry**), reorder or remove, then **Save**. Instagram, Reddit, Ko-fi, X/Twitter, TikTok and YouTube get matching icons automatically.

### Likes and views
Every artwork has a heart (likes) and an eye (views), on the tile and in the viewer. One like per browser. Counts belong to the image **file name**, so reordering or retitling keeps them; uploading a different file starts at zero. A view is counted once per piece per visit when someone opens it in the viewer.

### Background music
**Site settings → Background music (optional)**: upload a light track. It loops softly. Browsers block sound until a visitor interacts, so it starts right away where allowed, otherwise on the first click, tap or key press. The small blue equalizer next to the site name toggles it. Remove the file and **Save** to turn the music off.

### Image quality
Uploads are published exactly as uploaded. The portfolio and album tiles use small previews made automatically at publish time; opening a piece always loads your original at full resolution, and zooming shows full detail.

### When do changes appear?
Usually **1 to 2 minutes** after **Save**. Refresh if you still see the old version. On GitHub, the **Actions** tab shows a green tick when it's live.

### Placeholders
The abstract images labelled **PLACEHOLDER** in the portfolio are only there to show the layout. Remove them in **Portfolio** once you've added more real work.

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
index.html              the one page: nav + music toggle, welcome, portfolio band, albums, commissions slideshow, about, connect, album view, viewer
assets/style.css        styles: dark navy, steel blue and caramel; Quicksand and Nunito
assets/site.js          loads content/*.json; welcome, portfolio brick packer + horizontal scroller, albums, commission slideshow,
                        likes + views (Abacus), music, the artwork viewer
content/portfolio.json  { "artworks": [ { "image", "title", "caption", "featured"? } ] }   (order = display order)
content/albums.json     { "albums": [ { "name", "cover", "description", "music", "artworks": [...] } ] }
content/commissions.json{ "tiers": [ { "name", "image", "description", "price", "notes" } ] }
content/site.json       siteName, heroImage, heroImageAlt, heroTitle, heroSubtitle, heroIntro, about,
                        commissionsOpen, commissionText, commissionClosedText, links[], music
images/artworks/  images/albums/  images/commissions/  images/examples/  images/site/      audio/
.pages.yml              Pages CMS configuration
scripts/migrate_portfolio.py  one-off (re-runnable) migration from the old gallery.json/site.json schema
scripts/make_thumbs.py  run by the deploy: WebP previews + every image's width/height -> content/thumbs.json
scripts/build_local.sh  builds the site like the deploy into /tmp/yaz-build (root + a sub-path copy)
scripts/check.js        Playwright end-to-end checks + screenshots (Abacus mocked)
```

* **Portfolio band:** a fixed-height strip (2 rows; 380–560 px tall on desktop, 280–340 px on phones) that scrolls horizontally. `site.js` packs tiles into two lanes at their natural aspect ratio (big tiles span both lanes; a small look-ahead keeps the lanes even) using sizes from `thumbs.json`, so nothing jumps while images load. Vertical mouse-wheel is turned into smooth horizontal scrolling until the band reaches an end (then the page scrolls on); mouse drag has momentum; touch uses native scrolling. Arrows, a "Scroll/Swipe" hint and mask-image edge fades show there is more.
* **Commission slideshow:** rAF-timed, 5 s per slide; the image slides in with a blur/scale crossfade, the name's letters stagger in, and the price box outline is drawn with an SVG stroke. Pauses on hover, focus, touch and when the tab is hidden; dots (with progress), prev/next, keyboard and swipe; with `prefers-reduced-motion` it does not auto-advance and switches without animation.
* **Paths:** the CMS writes `/images/...`; `site.js` strips the leading `/`, so the site works at the root and under any sub-path (checked by `scripts/check.js`).
* **Run the checks:** `npm install`, `bash scripts/build_local.sh`, serve `/tmp/yaz-build/site` on :8091 and `/tmp/yaz-build/sub` on :8092 (`python3 -m http.server`), then `node scripts/check.js`. Screenshots go to `screenshots/` (git-ignored).
* **Likes / views:** `https://abacus.jasoncameron.dev`, keys `like-<file>` / `view-<file>`, read with `/info/…`, added with `/hit/…`, lazily loaded through a small rate-limited queue. The counter namespace is still `yazartsgallery` on purpose: renaming it would reset every existing count. Liked pieces are stored in `localStorage` (`yaz.liked`), failed likes in `yaz.pendingLikes`.
* **Music:** `<audio id="bgAudio">` (site, 0.35, loop) and `<audio id="albumAudio">` (album, 0.6, loop); choice stored in `localStorage` `yaz.sound`.
* **Viewer:** the clicked tile flies into a full-screen viewer tinted with the artwork's colour; desktop shows image left / text right, phones show the caption under the image. Swipe or arrows to browse, pinch/double-tap/ctrl+scroll to zoom with the full-resolution original.

## Limitations
* Changes take about 1 to 2 minutes to go live (GitHub Actions plus Pages caching). There's no instant preview of unsaved edits.
* Images are published exactly as uploaded, with no automatic resizing. Upload web-sized files.
* The repository must be public for free Pages, so the original uploaded image files are publicly downloadable. That is also true of any image on any website.
* Pages CMS is a free third-party hosted service. If it ever goes away, content is still plain JSON and images in the repo, editable on github.com, or Pages CMS can be self-hosted for free.
* Likes are "one per browser". Someone who clears their browser (or calls the counter URL directly) could add extra likes, because a no-signup counter has no protection against that. It's fine for a friendly heart counter, but don't treat the number as exact.
* Abacus is a free community service run by one developer (no uptime guarantee). If it ever shuts down, only the numbers disappear; the rest of the site is unaffected, and `LIKES.api` in `assets/site.js` is the one line to change.
* The GitHub Free account limits that matter here are a 1 GB recommended repo size, 100 MB per file, and 100 GB/month Pages bandwidth. These are plenty for a portfolio.
