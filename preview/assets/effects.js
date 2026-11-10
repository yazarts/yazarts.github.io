/* Motion preview: ink intro, hero parallax, brush wipes, tilting cards.
   The shared-element viewer and the fanned stack live in preview/assets/site.js and effects.css.
   Nothing here runs unless the page is marked data-preview. */
(() => {
  if (document.documentElement.dataset.preview !== '1') return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s) => document.querySelector(s);
  const clamp = (a, b, t) => Math.max(0, Math.min(1, (t - a) / (b - a)));
  const smooth = (p) => p * p * (3 - 2 * p);

  const seenKey = 'yazarts-intro';
  const force = new URLSearchParams(location.search).get('intro') === '1';
  let seen = false;
  try { seen = sessionStorage.getItem(seenKey) === '1'; } catch (e) { seen = false; }
  const playIntro = !reduce && (force || !seen);

  function markSeen() { try { sessionStorage.setItem(seenKey, '1'); } catch (e) {} }

  if (!playIntro) {
    document.documentElement.classList.add('intro-done');
  } else {
    const PATH = 'M810 1772 c-19 -11 -48 -40 -63 -65 -24 -38 -29 -57 -30 -119 -1 -40 0 -79 3 -87 8 -24 -156 -70 -272 -78 l-98 -6 0 119 c0 157 -3 164 -50 164 -35 0 -38 -2 -45 -36 -9 -48 -47 -105 -86 -128 -27 -16 -33 -17 -46 -4 -21 22 -33 86 -27 139 6 47 6 47 -35 47 -36 1 -42 -2 -47 -25 -14 -55 12 -183 47 -227 30 -38 91 -36 150 3 24 17 44 29 45 28 1 -1 4 -18 8 -38 6 -36 6 -36 -45 -42 -65 -8 -109 -36 -154 -96 -46 -64 -65 -120 -65 -193 0 -124 74 -186 203 -172 70 8 125 47 144 102 8 23 13 87 13 165 0 127 0 127 33 127 58 0 160 30 253 74 89 42 93 43 109 26 9 -10 30 -24 46 -31 37 -15 98 1 147 37 17 14 32 20 32 14 0 -21 47 -34 80 -20 31 13 38 24 20 35 -23 14 -42 71 -45 136 -5 93 -8 100 -57 131 -60 37 -123 44 -168 20z m-39 -309 c13 -16 12 -17 -3 -4 -10 7 -18 15 -18 17 0 8 8 3 21 -13z M877 1324 c-1 -1 -90 -5 -197 -8 -153 -5 -197 -10 -206 -21 -6 -8 -16 -15 -22 -15 -16 0 -3 -35 18 -45 10 -6 38 -26 61 -45 42 -34 42 -34 37 7 -6 40 -6 40 90 42 52 1 98 2 101 3 3 0 20 0 36 -1 24 -2 -6 -20 -148 -92 -126 -64 -177 -95 -173 -105 3 -7 -3 -18 -12 -24 -37 -22 15 -30 198 -30 102 -1 215 -1 253 -2 99 0 167 11 167 28 0 8 -4 14 -9 14 -5 0 -12 7 -15 16 -3 8 -2 12 4 9 6 -3 10 -1 10 4 0 6 -22 22 -49 36 -51 25 -68 21 -57 -13 6 -16 -5 -18 -143 -17 -82 0 -148 2 -146 5 2 3 87 48 189 100 102 52 186 98 186 102 0 5 -10 19 -22 33 -20 23 -28 25 -86 23 -35 -2 -64 -4 -65 -4z M731 910 c-85 -9 -115 -27 -146 -86 -21 -39 -21 -39 -44 11 -21 47 -23 49 -36 30 -8 -11 -19 -25 -25 -32 -7 -9 -3 -47 15 -129 24 -116 44 -157 74 -152 9 1 22 -1 29 -6 25 -15 34 11 41 122 4 65 13 117 20 126 19 23 76 36 159 36 65 0 73 -2 68 -17 -3 -10 -6 -73 -8 -141 -2 -120 -2 -123 22 -140 14 -9 29 -17 35 -17 14 0 24 58 31 203 7 132 7 132 71 132 67 0 82 13 36 31 -30 11 -216 39 -248 37 -11 0 -53 -4 -94 -8z M116 860 c-85 -65 -111 -131 -81 -215 23 -68 58 -111 100 -125 46 -15 85 -6 137 34 42 33 42 33 79 -6 32 -34 42 -39 75 -36 49 4 53 21 9 37 -50 18 -59 41 -51 130 13 139 13 136 -9 134 -11 -1 -37 12 -59 29 -68 54 -143 61 -200 18z M988 445 c-5 -4 -506 -15 -708 -15 -185 0 -185 0 -208 -36 -25 -38 -19 -53 19 -54 9 0 18 -3 22 -6 3 -3 158 -57 344 -119 l338 -114 -326 0 c-327 -1 -327 -1 -319 34 4 19 4 37 0 40 -4 3 -28 -14 -54 -36 -43 -38 -51 -58 -33 -86 4 -6 1 -13 -5 -16 -46 -16 54 -20 449 -17 546 3 550 3 566 19 9 10 8 15 -8 27 -17 13 -18 16 -5 24 18 11 46 1 -372 141 -185 63 -336 114 -335 115 7 5 597 14 597 9 0 -3 -5 -15 -10 -25 -18 -33 10 -34 44 -1 18 17 36 31 41 31 6 0 16 12 22 27 11 22 10 28 -5 39 -17 13 -48 24 -54 19z';
    const stroke = '<svg class="intro-draw" viewBox="0 0 110 180" aria-hidden="true"><g transform="translate(0,180) scale(0.1,-0.1)"><path fill="none" stroke="#9cc3e6" stroke-width="46" stroke-linecap="round" stroke-linejoin="round" d="' + PATH + '"></path></g></svg>';
    const intro = document.createElement('div');
    intro.id = 'intro';
    intro.className = 'intro';
    intro.innerHTML = '<div class="intro-navy"></div><div class="intro-ink"></div><div class="intro-glow"></div><div class="intro-sig"></div>';
    document.body.appendChild(intro);
    const sig = intro.querySelector('.intro-sig');
    // The traced outline is one long contour, so a dash offset finishes the silhouette too early.
    // Five clipped bands fade in from top to bottom, which reads as the pen moving down the signature.
    const bands = [];
    for (let i = 0; i < 5; i++) {
      const band = document.createElement('div');
      band.className = 'intro-band';
      const top = Math.max(0, i * 20 - (i ? 4 : 0));
      const bottom = Math.max(0, (100 - (i + 1) * 20) - (i < 4 ? 4 : 0));
      band.style.clipPath = 'inset(' + top + '% 0 ' + bottom + '% 0)';
      band.style.opacity = '0';
      band.innerHTML = stroke;
      sig.appendChild(band);
      bands.push(band);
    }
    const png = document.createElement('img');
    png.className = 'intro-png';
    png.alt = '';
    png.src = '/images/site/logo.png';
    sig.appendChild(png);
    const navy = intro.querySelector('.intro-navy');
    const ink = intro.querySelector('.intro-ink');
    const glow = intro.querySelector('.intro-glow');
    document.documentElement.classList.add('intro-on');

    let stopped = false, glided = false, dx = 0, dy = 0, scale = 0.24;
    const start = performance.now();
    const logo = $('#brandLogo');

    function end(now) {
      if (stopped) return;
      stopped = true;
      markSeen();
      document.documentElement.classList.remove('intro-on');
      document.documentElement.classList.add('intro-done');
      intro.remove();
      if (now) document.documentElement.dataset.introMs = String(Math.round(now - start));
    }
    intro.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); end(performance.now()); });

    function frame(now) {
      if (stopped) return;
      const t = now - start;
      bands.forEach((band, i) => { band.style.opacity = String(clamp(i * 80, i * 80 + 130, t)); });
      const pngIn = clamp(420, 680, t);
      png.style.opacity = String(pngIn);
      glow.style.opacity = String(Math.sin(Math.min(1, pngIn) * Math.PI) * 0.9);
      glow.style.transform = 'translate3d(-50%, -50%, 0) scale(' + (0.65 + pngIn * 0.55) + ')';
      bands.forEach((band) => { band.style.opacity = String(parseFloat(band.style.opacity) * (1 - clamp(560, 740, t))); });
      const wipe = smooth(clamp(660, 1040, t));
      navy.style.opacity = String(1 - wipe);
      const inkFade = wipe < 0.2 ? wipe / 0.2 : Math.max(0, 1 - (wipe - 0.2) / 0.8);
      ink.style.opacity = String(inkFade);
      ink.style.transform = 'translate3d(-50%, -50%, 0) scale(' + (0.2 + wipe * 16) + ')';
      if (t >= 1000) {
        if (!glided) {
          glided = true;
          const a = sig.getBoundingClientRect();
          const b = logo ? logo.getBoundingClientRect() : a;
          dx = (b.left + b.width / 2) - (a.left + a.width / 2);
          dy = (b.top + b.height / 2) - (a.top + a.height / 2);
          scale = a.height > 0 && b.height > 0 ? b.height / a.height : 0.24;
        }
        const g = smooth(clamp(1000, 1420, t));
        sig.style.transform = 'translate3d(' + (dx * g) + 'px, ' + (dy * g) + 'px, 0) scale(' + (1 + (scale - 1) * g) + ')';
      }
      if (t >= 1360) document.documentElement.classList.add('intro-done');
      if (t >= 1420) { end(now); return; }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  if (reduce) return;

  const hero = $('#home');
  const bg = hero && hero.querySelector('.hero-bg');
  const fig = hero && hero.querySelector('.hero-figure');
  const text = hero && hero.querySelector('.hero-text');
  if (hero && bg && fig && text) {
    let px = 0, py = 0, sy = 0, raf = 0, heroH = hero.offsetHeight;
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const apply = () => {
      raf = 0;
      const y = Math.min(sy, heroH);
      bg.style.transform = 'translate3d(' + (px * -18) + 'px, ' + (y * 0.16 + py * -12) + 'px, 0)';
      fig.style.transform = 'translate3d(' + (px * 20) + 'px, ' + (y * -0.05 + py * 12) + 'px, 0)';
      text.style.transform = 'translate3d(' + (px * 10) + 'px, ' + (y * -0.18 + py * 8) + 'px, 0)';
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(apply); };
    addEventListener('scroll', () => { sy = scrollY; schedule(); }, { passive: true });
    addEventListener('resize', () => { heroH = hero.offsetHeight; }, { passive: true });
    if (fine) {
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        px = (e.clientX - r.left) / r.width - 0.5;
        py = (e.clientY - r.top) / r.height - 0.5;
        schedule();
      });
      hero.addEventListener('pointerleave', () => { px = 0; py = 0; schedule(); });
    }
  }

  const brushSvg = '<svg viewBox="0 0 800 220" preserveAspectRatio="none" aria-hidden="true">'
    + '<path fill="#6f9cc4" d="M8 128C78 36 160 196 268 118c92-66 154-92 236 8 74 90 148 104 214-16 28-40 62-62 74-28v78c-36 48-124 16-206 72-96 64-168 8-258-36-78-36-150 28-214 8-18-8-22-18-14-36z"/>'
    + '<path fill="#a8754a" d="M36 148C112 64 198 206 312 128c86-58 168-84 236 4 58 74 130 96 196-8v60c-48 42-136 8-214 62-104 70-176 4-268-42C168 164 86 206 24 158 4 144 8 160 36 148z"/>'
    + '</svg>';
  ['#portfolio', '#commissions'].forEach((sel) => {
    const section = $(sel);
    if (!section) return;
    const el = document.createElement('div');
    el.className = 'brush';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = brushSvg;
    section.classList.add('has-brush');
    section.appendChild(el);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting || document.documentElement.classList.contains('intro-on')) return;
        el.classList.add('go');
        io.disconnect();
        const svg = el.querySelector('svg');
        const done = () => { if (el.isConnected) el.remove(); };
        svg.addEventListener('animationend', done, { once: true });
        setTimeout(done, 1000);
      });
    }, { threshold: 0.22 });
    const armBrush = () => { if (!el.isConnected) return; io.observe(section); };
    if (document.documentElement.classList.contains('intro-on')) {
      const wait = new MutationObserver(() => {
        if (document.documentElement.classList.contains('intro-on')) return;
        wait.disconnect();
        armBrush();
      });
      wait.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    } else armBrush();
  });

  const stage = $('#tiersStage');
  if (stage) {
    const arm = (stack) => {
      if (!stack || stack.querySelector('.sheen')) return;
      const sheen = document.createElement('span');
      sheen.className = 'sheen';
      sheen.setAttribute('aria-hidden', 'true');
      stack.appendChild(sheen);
    };
    const reset = (stack) => {
      if (!stack) return;
      stack.style.transform = '';
      const sheen = stack.querySelector('.sheen');
      if (sheen) sheen.style.opacity = '0';
    };
    const paint = () => stage.querySelectorAll('.stack').forEach((stack) => {
      arm(stack);
      if (!stack.closest('.tier.on')) reset(stack);
    });
    new MutationObserver(paint).observe(stage, { childList: true, subtree: true });
    paint();
    const tilt = (stack, x, y) => {
      const r = stack.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const nx = (x - r.left) / r.width - 0.5;
      const ny = (y - r.top) / r.height - 0.5;
      stack.style.transform = 'rotateY(' + (nx * 8) + 'deg) rotateX(' + (-ny * 7) + 'deg)';
      const sheen = stack.querySelector('.sheen');
      if (sheen) {
        sheen.style.opacity = '1';
        sheen.style.transform = 'translate3d(' + (nx * 36) + '%, ' + (ny * 28) + '%, 0)';
      }
    };
    stage.addEventListener('pointermove', (e) => {
      const stack = e.target.closest('.stack');
      if (!stack || !stack.closest('.tier.on')) return;
      tilt(stack, e.clientX, e.clientY);
    });
    stage.addEventListener('pointerdown', (e) => {
      const stack = e.target.closest('.stack');
      if (!stack || !stack.closest('.tier.on')) return;
      tilt(stack, e.clientX, e.clientY);
    });
    stage.addEventListener('pointerleave', (e) => reset(e.target.closest ? stage.querySelector('.tier.on .stack') : null));
    stage.addEventListener('pointerout', (e) => {
      const stack = e.target.closest && e.target.closest('.stack');
      if (stack && !stack.contains(e.relatedTarget)) reset(stack);
    });
  }
})();
