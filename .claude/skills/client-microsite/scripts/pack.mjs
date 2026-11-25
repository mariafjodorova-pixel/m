// Packs the working page (index.html + styles/ + scripts/ + assets/) into dist/.
//
//   node pack.mjs [projectDir] [--mode inline|external] [--root https://cdn…/] [--map asset-urls.json] [--out dist]
//
// Always inlined: local <link rel=stylesheet>, local <script src>, fonts referenced from CSS (data: URIs).
// Media (images, video, posters, CSS backgrounds):
//   --mode inline    (default) raster images and SVGs → data: URIs; videos can't be inlined → copied to dist/assets/
//                    Result: one HTML file you can upload alone (Veriff: ~1.9 MB).
//   --mode external  files copied flat into dist/assets/ and referenced as assets/<name>, or as the URL from
//                    --map {"hero.jpg": "https://cdn-3.relayto.com/…/hero_abc.jpg"} once uploaded to a hub (Westinghouse).
//   --root URL       RELAYTO Files (workspace assets, UAENO): sub-folders are KEPT — assets/img/x.webp is copied to
//                    dist/assets/img/x.webp and referenced as URL + "assets/img/x.webp". Upload the dist/assets folder
//                    as is; URL = https://cdn.relayto.com/workspace-assets/<workspace-id>/
//   External modes also write dist/upload-list.json (what to upload).
// Fails if any local reference is left unresolved or two different files would get the same flat name.
import fs from 'node:fs';
import path from 'node:path';
import { args } from './_lib.mjs';

const a = args();
const ROOT = path.resolve(a._[0] || '.');
const OUT = path.resolve(ROOT, a.out || 'dist');
// --root ./  → local preview with the same folders (paths "assets/img/…"); --root https://… → CDN
const ROOT_URL = a.root === undefined ? null : /^\.?\/?$/.test(String(a.root === true ? '.' : a.root)) ? '' : String(a.root).replace(/\/?$/, '/');
const MODE = ROOT_URL !== null ? 'external' : (a.mode || 'inline');
const MAP = a.map ? JSON.parse(fs.readFileSync(path.resolve(ROOT, a.map), 'utf8')) : {};
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf' };
const VIDEO = new Set(['.mp4', '.webm', '.mov', '.m4v']);
const FONT = new Set(['.woff2', '.woff', '.ttf', '.otf']);
const isLocal = (u) => u && !/^(https?:|data:|blob:|mailto:|tel:|#|\/\/|about:|javascript:)/i.test(u);

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });
const copied = new Map();   // flat name -> source path
const report = [];

function media(ref, baseDir) {
  const clean = ref.split(/[?#]/)[0];
  const file = path.resolve(baseDir, decodeURIComponent(clean));
  if (!fs.existsSync(file)) throw new Error(`missing file: ${ref} (from ${path.relative(ROOT, baseDir) || '.'})`);
  const ext = path.extname(file).toLowerCase(), name = path.basename(file);
  if (FONT.has(ext)) return `data:${MIME[ext]};base64,${fs.readFileSync(file).toString('base64')}`;
  if (MAP[name]) { report.push(`map     ${name} → ${MAP[name]}`); return MAP[name]; }
  if (ROOT_URL !== null) {                           // keep the folder structure (RELAYTO Files)
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    if (rel.startsWith('..')) throw new Error(`file outside the project: ${file}`);
    const dest = path.join(OUT, rel);
    if (!copied.has(rel)) { fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(file, dest); copied.set(rel, file); }
    return ROOT_URL + rel.split('/').map(encodeURIComponent).join('/');
  }
  if (MODE === 'inline' && !VIDEO.has(ext) && MIME[ext]) return `data:${MIME[ext]};base64,${fs.readFileSync(file).toString('base64')}`;
  if (copied.has(name) && copied.get(name) !== file) throw new Error(`flat name clash: ${name} (${copied.get(name)} vs ${file})`);
  if (!copied.has(name)) { fs.copyFileSync(file, path.join(OUT, 'assets', name)); copied.set(name, file); }
  return 'assets/' + name;
}

const cssUrls = (css, baseDir) => css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (m, q, u) => (isLocal(u) ? `url("${media(u, baseDir)}")` : m));

let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const deferred = [];

// inline <style> blocks already in the page (before linked sheets are inlined, so nothing is processed twice)
// and blocks and style="" attributes
html = html.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (m, o, css, c) => o + cssUrls(css, ROOT) + c);
html = html.replace(/style="([^"]*url\([^"]*)"/gi, (m, s) => `style="${cssUrls(s.replace(/&quot;/g, '"'), ROOT).replace(/"/g, '&quot;')}"`);
// stylesheets
html = html.replace(/<link\b[^>]*rel=["']?stylesheet["']?[^>]*>/gi, (tag) => {
  const href = (/href=["']([^"']+)["']/i.exec(tag) || [])[1];
  if (!isLocal(href)) return tag;
  const file = path.resolve(ROOT, href);
  return `<style>\n${cssUrls(fs.readFileSync(file, 'utf8'), path.dirname(file))}\n</style>`;
});
// font preloads are pointless once fonts are inline
html = html.replace(/<link\b[^>]*rel=["']?preload["']?[^>]*>\s*/gi, (tag) => (/as=["']?font/i.test(tag) && isLocal((/href=["']([^"']+)/i.exec(tag) || [])[1]) ? '' : tag));
// scripts: defer/module in <head> must run after the DOM → moved to the end of <body>
html = html.replace(/<script\b([^>]*)\bsrc=["']([^"']+)["']([^>]*)><\/script>/gi, (tag, pre, src, post) => {
  if (!isLocal(src)) return tag;
  const js = fs.readFileSync(path.resolve(ROOT, src), 'utf8').replace(/<\/script/gi, '<\\/script');
  const attrs = (pre + post).replace(/\s*\b(defer|async)\b(=["'][^"']*["'])?/gi, '').trim();
  const out = `<script${attrs ? ' ' + attrs : ''}>\n${js}\n</script>`;
  if (/\b(defer|type=["']?module)/i.test(pre + post)) { deferred.push(out); return ''; }
  return out;
});
if (deferred.length) html = html.replace(/<\/body>/i, () => deferred.join('\n') + '\n</body>');   // function replacer: JS contains $' $& sequences
// protect script bodies (comments/strings in JS may look like attributes)
const vault = [];
html = html.replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi, (m, o, body, c) => { vault.push(body); return `${o}\u0000${vault.length - 1}\u0000${c}`; });
// media attributes
html = html.replace(/\b(src|poster|data-src|href)=["']([^"']+)["']/gi, (m, attr, u) => {
  if (!isLocal(u)) return m;
  if (attr.toLowerCase() === 'href' && !/\.(png|jpe?g|webp|gif|svg|ico|avif|pdf|mp4|webm)$/i.test(u.split(/[?#]/)[0])) return m;   // page links stay
  return `${attr}="${media(u, ROOT)}"`;
});
html = html.replace(/\b(srcset|data-srcset)=["']([^"']+)["']/gi, (m, attr, set) => `${attr}="${set.split(',').map((part) => {
  const [u, d] = part.trim().split(/\s+/); return (isLocal(u) ? media(u, ROOT) : u) + (d ? ' ' + d : '');
}).join(', ')}"`);

html = html.replace(/\u0000(\d+)\u0000/g, (m, i) => vault[+i]);
const left = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').match(/\b(src|href|poster|srcset)=["'](?!https?:|data:|#|mailto:|tel:|\/\/|assets\/)[^"']+\.(css|js|png|jpe?g|webp|svg|woff2?|mp4)["']/gi);
if (left) throw new Error('unresolved local references:\n  ' + left.join('\n  '));
fs.writeFileSync(path.join(OUT, 'index.html'), html);
if (!copied.size || (ROOT_URL !== null && !fs.readdirSync(path.join(OUT, 'assets')).length)) fs.rmSync(path.join(OUT, 'assets'), { recursive: true, force: true });

const kb = (p) => (fs.statSync(p).size / 1024).toFixed(0) + ' KB';
const rels = [...copied.keys()].map((n) => (ROOT_URL !== null ? n : 'assets/' + n));
if (MODE === 'external') fs.writeFileSync(path.join(OUT, 'upload-list.json'), JSON.stringify({ root: ROOT_URL || undefined, files: rels }, null, 1));
console.log(`${path.relative(process.cwd(), path.join(OUT, 'index.html')) || 'index.html'}  ${kb(path.join(OUT, 'index.html'))}  (mode: ${MODE}${ROOT_URL ? ', root ' + ROOT_URL : ROOT_URL === '' ? ', folders kept (local)' : ''})`);
for (const r of rels) console.log(`  ${r}  ${kb(path.join(OUT, r))}`);
report.forEach((r) => console.log('  ' + r));
if (copied.size && MODE === 'inline') console.log('  ↑ videos cannot be inlined: upload them and pass --map, or host them elsewhere');
if (copied.size && ROOT_URL === '') console.log('  ↑ dist/assets is the folder to upload to RELAYTO Files; then re-pack with --root <workspace url> --out dist-relayto');
else if (copied.size && ROOT_URL) console.log(`  ↑ upload the dist/assets folder to RELAYTO Files as is (sub-folders kept); then: node check_map.mjs --root ${ROOT_URL}`);
else if (copied.size && MODE === 'external' && !Object.keys(MAP).length) console.log('  ↑ upload dist/assets/* to the host, then re-run with --map asset-urls.json (see dist/upload-list.json)');
