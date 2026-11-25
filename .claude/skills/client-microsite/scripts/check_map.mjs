// After uploading assets to the RELAYTO hub (or any CDN) and collecting their URLs into asset-urls.json:
// verifies every URL before it goes into the page.
//
// Usage:
//   node check_map.mjs asset-urls.json [--local dist/assets]       hub mode: {"hero.jpg": "https://cdn-3.relayto.com/…/hero_abc.jpg"}
//   node check_map.mjs --root https://cdn.relayto.com/workspace-assets/<id>/ [--dist dist]
//                                                                  RELAYTO Files: every file of dist/upload-list.json at root + path
// Checks per file: HTTP 200 · content type matches the extension · pixel size equals the local file
// (the hub may recompress or resize) · CORS header (needed only for fonts, canvas, fetch()).
// Also lists local files that have no URL yet.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadPlaywright, args, UA } from './_lib.mjs';

const a = args();
const DIST = a.dist || 'dist';
let mapFile = a._[0] || 'asset-urls.json', localDir = a.local || path.join(DIST, 'assets');
let map, localOf;
if (a.root) {
  const root = String(a.root).replace(/\/?$/, '/');
  const list = JSON.parse(fs.readFileSync(path.join(DIST, 'upload-list.json'), 'utf8')).files;
  map = Object.fromEntries(list.map((rel) => [rel, root + rel.split('/').map(encodeURIComponent).join('/')]));
  localOf = (rel) => path.join(DIST, rel);
  mapFile = null;
} else {
  map = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
  localOf = (name) => path.join(localDir, name);
}
const TYPES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', svg: 'image/svg+xml', gif: 'image/gif', mp4: 'video/mp4', webm: 'video/webm', woff2: 'font/woff2', pdf: 'application/pdf' };

const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const page = await browser.newPage();
const dims = (src) => page.evaluate((u) => new Promise((res) => { const i = new Image(); i.onload = () => res([i.naturalWidth, i.naturalHeight]); i.onerror = () => res(null); i.src = u; }), src);

let fails = 0;
for (const [name, url] of Object.entries(map)) {
  const ext = name.split('.').pop().toLowerCase();
  const issues = [];
  let res = null;
  try { res = await fetch(url, { headers: { 'User-Agent': UA }, method: ext === 'mp4' || ext === 'webm' ? 'HEAD' : 'GET' }); } catch (e) { issues.push('fetch failed: ' + e.message); }
  if (res) {
    if (!res.ok) issues.push('HTTP ' + res.status);
    const ct = (res.headers.get('content-type') || '').split(';')[0];
    if (TYPES[ext] && ct && ct !== TYPES[ext] && !(ext === 'jpg' && ct === 'image/jpg')) issues.push(`served as ${ct}`);
    if (/woff2?|ttf|otf/.test(ext) && !res.headers.get('access-control-allow-origin')) issues.push('no CORS header — fonts from this URL will be blocked; embed fonts as data: instead');
  }
  const local = localOf(name);
  if (res?.ok && /^(jpe?g|png|webp|gif)$/.test(ext) && fs.existsSync(local)) {
    const [r, l] = [await dims(url), await dims(pathToFileURL(path.resolve(local)).href)];
    if (!r) issues.push('does not decode as an image');
    else if (l && (r[0] !== l[0] || r[1] !== l[1])) issues.push(`size ${r[0]}×${r[1]} ≠ local ${l[0]}×${l[1]} (resized by the host?)`);
  }
  if (issues.length) fails++;
  console.log(`${issues.length ? 'FAIL' : 'OK  '}  ${name}${issues.length ? '  — ' + issues.join('; ') : ''}`);
}
if (mapFile && fs.existsSync(localDir)) {
  const missing = fs.readdirSync(localDir).filter((f) => !map[f]);
  if (missing.length) { fails++; console.log(`\nFAIL  ${missing.length} local file(s) have no URL yet: ${missing.join(', ')}`); }
}
await browser.close();
console.log(fails ? `\n${fails} problem(s)` : mapFile ? '\nall URLs OK — run: node pack.mjs --mode external --map ' + mapFile : '\nall uploaded files are served correctly — dist/index.html is ready');
process.exit(fails ? 1 : 0);
