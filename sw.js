/* yazarts service worker. Bump VERSION to drop the previous caches on the next visit. */
const VERSION = '3';
const SHELL = 'yazarts-shell-' + VERSION;
const CONTENT = 'yazarts-content-' + VERSION;
const KEEP = new Set([SHELL, CONTENT]);
const SHELL_URLS = [
  './',
  './index.html',
  './offline.html',
  './manifest.webmanifest',
  './assets/style.css',
  './assets/site.js',
  './assets/effects.js',
  './assets/fonts/nanum-brush-script.woff2',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-192.png',
  './assets/icons/icon-maskable-512.png',
  './assets/icons/apple-touch-icon.png',
];

function restOf(url) {
  const root = new URL(self.registration.scope).pathname;
  if (url.origin !== location.origin || !url.pathname.startsWith(root)) return null;
  return url.pathname.slice(root.length);
}

function purge() {
  return caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('yazarts-') && !KEEP.has(k)).map(k => caches.delete(k))));
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(req);
    if (fresh && fresh.ok && fresh.type === 'basic' && !req.headers.get('range')) cache.put(req, fresh.clone());
    return fresh;
  } catch (err) {
    const cached = await cache.match(req) || (req.mode === 'navigate' ? await cache.match('./offline.html') : null);
    if (cached) return cached;
    if (req.mode === 'navigate') return new Response('An internet connection is needed. Artwork and the latest portfolio are not saved on this device.', { status: 503, headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
    return new Response('', { status: 503 });
  }
}

self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL).then(cache => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(purge().then(() => self.clients.claim()));
});

self.addEventListener('message', event => {
  if (event.data === 'purge') event.waitUntil(purge().then(() => event.source && event.source.postMessage('purged')));
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const rest = restOf(url);
  if (rest == null) return;
  // Original artwork and music stay on the network. Do not fill the device with them.
  if (rest.startsWith('images/') || rest.startsWith('audio/') || rest.startsWith('thumbs/')) return;
  if (req.headers.get('range')) return;
  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req, SHELL));
    return;
  }
  if (rest.startsWith('content/')) {
    event.respondWith(networkFirst(req, CONTENT));
    return;
  }
  if (SHELL_URLS.some(item => rest === item.replace(/^\.\//, '') || (item === './' && rest === ''))) {
    event.respondWith(networkFirst(req, SHELL));
  }
});
