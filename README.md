# yazartsgallery

The art portfolio of **@yazarts**. It's a calm, dark blue-and-brown gallery site that is **free to host** on GitHub Pages and **edited without code** through [Pages CMS](https://pagescms.org), a free editor that logs in with GitHub.

* No server of your own and no build step. It is plain HTML, CSS and JS.
* All content lives in `content/gallery.json` (artworks, in display order) and `content/site.json` (links, commissions, about text, banner).
* **Messages & commission requests, likes, views and comments** use two free services: **Supabase** (free plan: the database + your private inbox login) and **Web3Forms** (free plan: the "you have a new message" email). Both stay switched off until you paste their keys in **Integrations** (see "Switch on messages, likes & comments" below). Until then the site works normally and simply hides those parts.
* Images live in `images/artworks/` and `images/site/`.
* Every save in the CMS creates a commit on `main`. A free GitHub Actions workflow then republishes the site, usually within 1 to 2 minutes.

---

## For the artist: editing your gallery

### Log in
1. Go to **https://app.pagescms.org**.
2. Click **Sign in with GitHub** and use your GitHub account.
3. Open the **yazartsgallery** repository. If you don't see it, follow "Connect Pages CMS" in the one-time setup below.

The left sidebar has four sections: **Gallery**, **Site settings**, **Integrations** and **Media**.

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
* **Add an entry** for a new one (e.g. *YouTube*, `https://youtube.com/@yazarts`),
* drag entries to reorder them, or remove one.

Then click **Save**. Instagram, Reddit, Ko-fi, X/Twitter, TikTok and YouTube get matching icons automatically. Any other link gets a link icon.

### Commissions open / closed
In **Site settings**, flip **Commissions open?**, check the two messages (one for open, one for closed), and click **Save**.

### Messages and commission requests (your inbox)
Visitors write to you with the form in the **Connect** section ("Just a message" or "Commission request" with type and budget).
* Each time someone sends a new message **or replies**, you get an email at **aitazouzabdellah@gmail.com** saying who wrote and what they said, with a link to your inbox. The email is only a notification: **answer on the website, not in Gmail.**
* Your inbox: **https://&lt;USERNAME&gt;.github.io/yazartsgallery/inbox.html** (bookmark it; it is not linked anywhere on the site). Sign in with your email and the inbox password you created in Supabase.
* Click a conversation, read it, type your answer and press **Send reply**. Unread ones have a caramel dot. **Close conversation** stops further replies; **Delete** removes it for good.
* The visitor gets a **private conversation link** when they send their message (it's also remembered in their browser under "Your conversations", with a "New reply" badge). Only someone with that link, and you, can read it. Visitors are not emailed when you reply (that would need a paid email service), so they check their link. If they left an email address, it is shown to you in the conversation.
* The commission types and budget choices are editable in **Site settings**. When **Commissions open?** is off, the form only offers "Just a message".

### Likes, views and comments
Under every artwork (and in the full-size viewer) visitors see a heart with the like count, a comment button with the comment count, and the view count.
* One like per visitor (per browser). A view is counted when someone opens the piece full size (once per visit).
* Comments need a name and a short text (max 500 characters) and appear for everyone straight away.
* **Delete a comment:** open your inbox → **Comments** tab → **Delete**.
* Counts belong to the image **file name**, so reordering or retitling keeps them. Uploading a different file starts that piece at zero.

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
6. Put the site link in the Instagram, TikTok, Reddit and Ko-fi bios.

### Switch on messages, likes & comments (about 10 minutes, $0, no card)

**A. Supabase: database + your inbox login (free plan)**
1. Go to **https://supabase.com** → **Start your project** → sign in (with GitHub, or with aitazouzabdellah@gmail.com).
2. **New project** → organization on the **Free** plan → Name `yazartsgallery` → click **Generate a password** for the database (save it in your password manager; you won't need it day to day) → Region: the one closest to you (e.g. *West EU*) → **Create new project**. Wait ~1 minute.
3. Left menu **SQL Editor** → **New query** → paste the whole file [`supabase/schema.sql`](supabase/schema.sql) → **Run**. It should say *Success. No rows returned*.
4. Left menu **Authentication** → **Sign In / Providers** → turn **off** "Allow new users to sign up" → **Save**. (Only you will ever have a login.)
5. **Authentication** → **Users** → **Add user** → **Create new user** → email `aitazouzabdellah@gmail.com`, choose a strong password (this is your **inbox password**), tick **Auto Confirm User** → **Create user**.
6. **SQL Editor** → **New query** → paste [`supabase/link-artist-login.sql`](supabase/link-artist-login.sql) → **Run**. The result shows your email: that login is now "the artist".
7. Click **Connect** (top of the dashboard) or **Project Settings → API Keys**. Copy the **Project URL** (`https://xxxx.supabase.co`) and the **Publishable key** (`sb_publishable_…`). Never use the *secret* key on the website.

**B. Web3Forms: the notification email (free plan, 250 emails/month, no password)**
1. Go to **https://web3forms.com** → **Create your Access Key** → enter `aitazouzabdellah@gmail.com` → create.
2. Open the email from Web3Forms in Gmail and copy the **Access Key**. (If it is in Spam, mark it "Not spam" so the notifications land in your inbox.)

**C. Paste the keys**
1. In **Pages CMS** open **Integrations**, paste the **Supabase Project URL**, the **Supabase publishable key** and the **Web3Forms access key** → **Save**.
2. After 1 to 2 minutes the hearts, counts, comments and the message form are live. Send yourself a test message from the site, check the email arrives, and answer it in **inbox.html**.

Good to know
* If you only add the Web3Forms key (no Supabase), the form still works but sends the whole message to your Gmail (reply-to = the visitor), with no on-site inbox, likes or comments.
* Supabase pauses free projects after about a week without any activity. The included workflow **Keep Supabase awake** (`.github/workflows/keepalive.yml`) pings it every 3 days for free, so this shouldn't happen. If you ever get a "project paused" email, open the Supabase dashboard and click **Resume project**; nothing is lost.
* Emails come from Web3Forms (subject "New commission request from …" / "New reply from …").

---

## For developers

```
index.html              the main page (nav, banner, gallery, about, connect + message form, lightbox + comments)
conversation.html       a visitor's private conversation (conversation.html#<64-hex secret token>)
inbox.html              the artist's inbox (Supabase Auth email + password) + comment moderation
assets/style.css        styles: dark navy, steel blue and caramel; Quicksand and Nunito fonts
assets/backend.js       config loader, Supabase RPC + Auth over fetch (no SDK), Web3Forms notify, helpers
assets/site.js          loads content/*.json, grid, like/comment/view counts, lightbox, comments, contact form
assets/conversation.js  / assets/inbox.js   the two pages above
content/integrations.json  supabaseUrl, supabaseKey (publishable), web3formsAccessKey (all public by design; empty = off)
supabase/schema.sql     tables (RLS on, no direct access), visitor + artist-only functions, rate limits
supabase/link-artist-login.sql  marks the artist's Supabase Auth user as the only inbox user
content/gallery.json    { "artworks": [ { "image", "title", "caption" } ] }   (order = display order)
content/site.json       siteName, heroTitle/heroSubtitle, tagline, heroImage, about,
                        commissionsOpen, commissionText, commissionClosedText, links[]
images/artworks/        artwork files       images/site/  banner
.pages.yml              Pages CMS configuration (what the editor shows)
.github/workflows/pages.yml      deploys the 3 pages, assets, content, images to GitHub Pages on push to main
.github/workflows/keepalive.yml  pings Supabase every 3 days so the free project isn't paused
scripts/                local helpers (not deployed): placeholder generator, checks/screenshots,
                        fake-supabase.js (runs the REAL schema.sql in PGlite), test-db.js (security tests)
```

* **Preview locally:** `python3 -m http.server 8090`, then open http://localhost:8090. It needs a local server, because opening the file directly blocks `fetch` of the JSON.
* **Checks and screenshots:** `npm install && npm run check` (needs Chrome at `/usr/bin/google-chrome` or `CHROME_PATH`, and the local server running). It runs against a local fake Supabase and a mocked Web3Forms: **no real email is ever sent by the tests.**
* **Database security tests:** `npm run test:db` loads `supabase/schema.sql` into PGlite (Postgres in WebAssembly) and checks that visitors can't read/write tables directly, can't moderate, can like only once, hit rate limits, can only open a conversation with its exact token, and that only the linked artist login can use the inbox functions.
* **Security model:** every table has RLS on with no policies, and table privileges are revoked from `anon`/`authenticated`, so the public key can only call the `security definer` functions. Visitor functions: `get_stats, record_view, like_art, get_comments, add_comment, start_thread, get_thread, client_reply, my_threads`. Artist-only (checked against `artist_accounts` = `auth.uid()`): `artist_inbox, artist_thread, artist_reply, artist_set_closed, artist_delete_thread, artist_comments, artist_delete_comment`. Conversation tokens are 64 random hex chars and only their SHA-256 is stored. Limits: comment ≤ 500 chars (5 per 10 min / 30 per day per IP), message ≤ 4000 chars, new conversations 4 per hour / 10 per day per IP, replies 30 per hour, likes 60 per hour, views 400 per hour; IPs are stored only as SHA-256 hashes. The forms also have a hidden honeypot field and a minimum fill time.
* **Image paths:** the CMS writes paths like `/images/artworks/x.jpg`. `site.js` strips the leading `/` so they resolve both at `user.github.io/yazartsgallery/` and on a custom domain.
* **Motion:** gentle fade-ins, soft hover lift and zoom, and a fading lightbox. All of it is disabled under `prefers-reduced-motion`.
* **Graceful when off:** with empty keys the like/comment/view row and the comment panel are hidden, the form explains it isn't switched on yet, and nothing errors.

## Limitations
* Changes take about 1 to 2 minutes to go live (GitHub Actions plus Pages caching). There's no instant preview of unsaved edits.
* Images are published exactly as uploaded, with no automatic resizing. Upload web-sized files.
* The repository must be public for free Pages, so the original uploaded image files are publicly downloadable. That is also true of any image on any website.
* Pages CMS is a free third-party hosted service. If it ever goes away, content is still plain JSON and images in the repo, editable on github.com, or Pages CMS can be self-hosted for free.
* Free limits of the add-ons: Web3Forms 250 notification emails/month (then it pauses until next month; messages are still saved in the inbox). Supabase free: 500 MB database (millions of likes/comments), 2 free projects, paused after ~1 week of no activity (handled by the keep-alive workflow).
* Likes are "one per browser" (a determined person could clear their browser and like again); rate limits keep that small.
* Visitors aren't emailed when you reply; they see replies on their private link. Anyone who has a conversation link can read that conversation, so visitors are told to keep it private.
* The GitHub Free account limits that matter here are a 1 GB recommended repo size, 100 MB per file, and 100 GB/month Pages bandwidth. These are plenty for a portfolio.
