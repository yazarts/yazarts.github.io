# yazartsgallery

The art portfolio of **@yazarts**. It's a calm, dark blue-and-brown gallery site that is **free to host** on GitHub Pages and **edited without code** through [Pages CMS](https://pagescms.org), a free editor that logs in with GitHub.

* No server, no database and no build step. It is plain HTML, CSS and JS.
* All content lives in two files: `content/gallery.json` (artworks, in display order) and `content/site.json` (links, commissions, about text, banner).
* Images live in `images/artworks/` and `images/site/`.
* Every save in the CMS creates a commit on `main`. A free GitHub Actions workflow then republishes the site, usually within 1 to 2 minutes.

---

## For the artist: editing your gallery

### Log in
1. Go to **https://app.pagescms.org**.
2. Click **Sign in with GitHub** and use your GitHub account.
3. Open the **yazartsgallery** repository. If you don't see it, follow "Connect Pages CMS" in the one-time setup below.

The left sidebar has three sections: **Gallery**, **Site settings** and **Media**.

### Add a new artwork
1. Click **Gallery**.
2. Scroll to the bottom of the *Artworks* list and click **Add an entry**. (The button may be worded slightly differently, such as "Add item".)
3. In **Image**, click to upload a picture from your computer, or pick one you uploaded before.
4. Type a **Title** if you want one (optional) and a **Caption**. The caption shows under the picture when someone opens it full size.
5. Click **Save** (top right). Your site updates in about 1 to 2 minutes.

Tip: JPG or WEBP files about 2000 px on the long side, under 1 to 2 MB, keep the site fast.

### Change a caption or title
In **Gallery**, click an artwork in the list to expand it, edit the text, then click **Save**.

### Reorder artworks
In **Gallery**, drag an artwork by its **handle** (the dotted grip on the left of each entry) up or down, then **Save**.
The first artwork in the list is the first one on the website (top-left).

### Delete an artwork
In **Gallery**, open the entry's menu or the trash icon next to it, choose **Remove**, then **Save**.
That takes it off the website. The image file stays in **Media**. To delete the file too, go to **Media → images/artworks**, select it and delete it. This step is optional.

### Social links
Go to **Site settings → Social links**, where you can:
* edit a name or link,
* **Add an entry** for a new one (e.g. *TikTok*, `https://tiktok.com/@yazarts`),
* drag entries to reorder them, or remove one.

Then click **Save**. Instagram, Reddit, Ko-fi, X/Twitter, TikTok and YouTube get matching icons automatically. Any other link gets a link icon.

### Commissions open / closed
In **Site settings**, flip **Commissions open?**, check the two messages (one for open, one for closed), and click **Save**.

### Other things you can change in Site settings
About text, the tagline under the title, the banner image (use a wide picture, e.g. 2400 × 900), the two lines of the banner title, and the site name.

### When do changes appear?
Each **Save** goes straight to GitHub, and the site republishes automatically. It usually takes **1 to 2 minutes**. Your browser may cache the page for a few more minutes, so if you still see the old version, refresh.
To watch it happen, open the repository on GitHub → **Actions** tab. A green tick means it's live.

### Placeholders
The 8 abstract images labelled **PLACEHOLDER** and the **placeholder banner** are only there to show the layout. Remove them in **Gallery** once you've added your real work, and pick your own banner in **Site settings**.

---

## One-time setup (going live)

Everything here is free.

1. **Create the repository.** On GitHub, signed in as the artist, go to **New repository**. Name it `yazartsgallery`, make it **Public** (GitHub Pages is free only for public repos), and **don't** add a README, .gitignore or license.
2. **Push this folder** from this machine:
   ```bash
   cd yazartsgallery-static
   git remote add origin https://github.com/<USERNAME>/yazartsgallery.git
   git push -u origin main
   ```
   (GitHub asks for a login. Use a [personal access token](https://github.com/settings/tokens) or GitHub Desktop / `gh auth login`. Or skip the command line: on the empty repo page choose "uploading an existing file" and drag in the folder contents, including the hidden `.pages.yml`, `.nojekyll` and `.github/` folder.)
3. **Turn on Pages.** In the repo go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
   Then in the **Actions** tab, re-run "Deploy to GitHub Pages" (or push any change). After the green tick the site is live at
   **https://&lt;USERNAME&gt;.github.io/yazartsgallery/**
4. **Connect Pages CMS.** Go to https://app.pagescms.org and **Sign in with GitHub**. When asked, **install the Pages CMS GitHub App**, choose *Only select repositories* and select `yazartsgallery`. Open the repo. Pages CMS reads the included `.pages.yml`, and **Gallery / Site settings / Media** appear.
5. Optionally add a **custom domain** (needs a paid domain, about $10/yr, so skip it to stay at $0). If you add one, put it in Settings → Pages → Custom domain and add a `CNAME` file with the domain. The workflow already copies it.
6. Put the site link in the Instagram, Reddit and Ko-fi bios.

---

## For developers

```
index.html              the one page (nav, banner, gallery, about, connect, lightbox)
assets/style.css        styles: dark navy, steel blue and caramel; Quicksand and Nunito fonts
assets/site.js          loads content/*.json, renders the grid, lightbox, scroll fade-ins
content/gallery.json    { "artworks": [ { "image", "title", "caption" } ] }   (order = display order)
content/site.json       siteName, heroTitle/heroSubtitle, tagline, heroImage, about,
                        commissionsOpen, commissionText, commissionClosedText, links[]
images/artworks/        artwork files       images/site/  banner
.pages.yml              Pages CMS configuration (what the editor shows)
.github/workflows/pages.yml   deploys index.html, assets, content, images to GitHub Pages on push to main
scripts/                local helpers (not deployed): placeholder generator, screenshot/check script
```

* **Preview locally:** `python3 -m http.server 8090`, then open http://localhost:8090. It needs a local server, because opening the file directly blocks `fetch` of the JSON.
* **Checks and screenshots:** `npm install && npm run check` (needs Chrome at `/usr/bin/google-chrome` or `CHROME_PATH`, and the local server running).
* **Image paths:** the CMS writes paths like `/images/artworks/x.jpg`. `site.js` strips the leading `/` so they resolve both at `user.github.io/yazartsgallery/` and on a custom domain.
* **Motion:** gentle fade-ins, soft hover lift and zoom, and a fading lightbox. All of it is disabled under `prefers-reduced-motion`.

## Limitations
* Changes take about 1 to 2 minutes to go live (GitHub Actions plus Pages caching). There's no instant preview of unsaved edits.
* Images are published exactly as uploaded, with no automatic resizing. Upload web-sized files.
* The repository must be public for free Pages, so the original uploaded image files are publicly downloadable. That is also true of any image on any website.
* Pages CMS is a free third-party hosted service. If it ever goes away, content is still plain JSON and images in the repo, editable on github.com, or Pages CMS can be self-hosted for free.
* The GitHub Free account limits that matter here are a 1 GB recommended repo size, 100 MB per file, and 100 GB/month Pages bandwidth. These are plenty for a portfolio.
