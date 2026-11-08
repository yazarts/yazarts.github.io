// Draws the existing palette mark (assets/favicon.svg) into the home-screen sizes.
// No portrait and no new character: the same mark already used beside the site name.
import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'assets', 'icons');
fs.mkdirSync(out, { recursive: true });
const svg = fs.readFileSync(path.join(root, 'assets', 'favicon.svg'), 'utf8');

const pageFor = (size, pad) => `<!doctype html><meta charset="utf-8"><style>
  html,body{margin:0;width:${size}px;height:${size}px;background:#0c1420}
  body{display:grid;place-items:center}
  svg{width:${size - pad * 2}px;height:${size - pad * 2}px;display:block}
</style><body>${svg.replace('<svg ', '<svg ')}</body>`;

const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ deviceScaleFactor: 1 })).newPage();
const shots = [
  ['icon-192.png', 192, 0],
  ['icon-512.png', 512, 0],
  ['icon-maskable-192.png', 192, 28],
  ['icon-maskable-512.png', 512, 74],
  ['apple-touch-icon.png', 180, 22],
];
for (const [name, size, pad] of shots) {
  await p.setViewportSize({ width: size, height: size });
  await p.setContent(pageFor(size, pad));
  await p.screenshot({ path: path.join(out, name), clip: { x: 0, y: 0, width: size, height: size }, omitBackground: false });
}
await b.close();
console.log('icons written to assets/icons');
