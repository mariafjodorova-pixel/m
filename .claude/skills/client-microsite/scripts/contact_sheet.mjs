// Preview sheet of a folder of images (asset pool, extracted PDF images…) so slot choices can be made by eye.
// Adds width/height to manifest.json when present.
//
// Usage: node contact_sheet.mjs assets-pool [--out reference/assets-contact-sheet.png] [--cols 5]
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadPlaywright, args } from './_lib.mjs';

const a = args();
const dir = path.resolve(a._[0] || 'assets-pool');
const out = a.out || path.join('reference', path.basename(dir) + '-contact-sheet.png');
const cols = +(a.cols || 5);
const files = fs.readdirSync(dir).filter((f) => /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(f)).sort();
if (!files.length) { console.error('no images in ' + dir); process.exit(1); }

const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:16px;font:12px/1.35 system-ui,sans-serif;background:#f3f3f3}
.g{display:grid;grid-template-columns:repeat(${cols},1fr);gap:12px}
figure{margin:0;background:#fff;border:1px solid #ddd;padding:8px}
.box{height:180px;display:flex;align-items:center;justify-content:center;background:repeating-conic-gradient(#9a9a9a 0 25%,#b8b8b8 0 50%) 0 0/16px 16px}
img{max-width:100%;max-height:180px}
figcaption{margin-top:6px;word-break:break-all}.s{color:#666}.warn{color:#c00}
</style><div class="g">${files.map((f, i) => `<figure><div class="box"><img src="${pathToFileURL(path.join(dir, f)).href}" data-f="${f}"></div><figcaption><b>${i + 1}.</b> ${f}<br><span class="s" id="s${i}"></span></figcaption></figure>`).join('')}</div>`;
const tmp = path.join(dir, '.contact-sheet.html');
fs.writeFileSync(tmp, html);

const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto(pathToFileURL(tmp).href, { waitUntil: 'load' });
const sizes = await page.evaluate(() => [...document.images].map((im, i) => {
    const s = `${im.naturalWidth}×${im.naturalHeight}`;
  const el = document.getElementById('s' + i); el.textContent = s; if (im.naturalWidth && im.naturalWidth < 800 && !/\.svg$/i.test(im.dataset.f)) el.className = 'warn';
  return { f: im.dataset.f, w: im.naturalWidth, h: im.naturalHeight };
}));
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
await page.screenshot({ path: out, fullPage: true });
await browser.close();
fs.rmSync(tmp);

const mf = path.join(dir, 'manifest.json');
if (fs.existsSync(mf)) {
  const m = JSON.parse(fs.readFileSync(mf, 'utf8'));
  for (const e of m) { const s = sizes.find((x) => x.f === e.file); if (s) { e.width = s.w; e.height = s.h; } }
  fs.writeFileSync(mf, JSON.stringify(m, null, 1));
}
const small = sizes.filter((s) => s.w && s.w < 800 && !/\.svg$/i.test(s.f)).length;
console.log(`${out}: ${files.length} images${small ? `, ${small} narrower than 800px (red) — too small for hero/full-width slots` : ''}`);
