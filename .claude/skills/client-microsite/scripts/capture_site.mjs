// Phase "design capture": the client's site → screenshots, computed styles, design-token candidates, fonts,
// and a list of every image/video/logo with its best (original-resolution) URL and a placeholder flag.
//
// Usage:
//   node capture_site.mjs https://client.com [https://client.com/about ...] [--crawl 6] [--out reference/site]
//                         [--widths 1440,768,375] [--download assets-pool]
//   --crawl N      also visit up to N same-site pages linked from header/nav/footer (more photos to choose from);
//                  language versions (/ar/, /fr/…) are skipped
//   --download D   download every non-suspect asset (best URL) into D/ and write D/manifest.json
//   WordPress sites: the whole media library is listed too (/wp-json/wp/v2/media) — photos used on pages the
//   crawler never reached (articles, galleries) show up with original URLs. --no-wp to skip.
// Output: <out>/<page>-<width>.png (+ -full.png at 1440), <out>/styles.json, <out>/assets.json, <out>/logos/*.svg
import fs from 'node:fs';
import path from 'node:path';
import { loadPlaywright, args, writeJSON, UA } from './_lib.mjs';

const a = args();
if (!a._.length) { console.error('usage: node capture_site.mjs <url> [more urls] [--crawl N] [--download dir]'); process.exit(1); }
const OUT = a.out || 'reference/site';
const WIDTHS = String(a.widths || '1440,768,375').split(',').map(Number);
fs.mkdirSync(path.join(OUT, 'logos'), { recursive: true });

// consent / chat overlays: try "reject" first (privacy-preserving), then hide whatever is left
const REJECT = /^(reject all|reject|decline( all)?|deny( all)?|only (necessary|essential)|necessary only|use necessary cookies only|refuse|отклонить( все)?|только необходимые)$/i;
const HIDE_CSS = `[id*="cookie" i],[class*="cookie" i],[id*="consent" i],[class*="consent" i],[class^="cky-"],[id^="onetrust"],#CybotCookiebotDialog,
  .cmplz-cookiebanner,#hubspot-messages-iframe-container,[id*="intercom" i],.drift-frame-controller,#credential_picker_container{display:none!important}
  html,body{overflow:auto!important}`;
// bot / human checks (Cloudflare, Sucuri, Imperva…): never try to get around them — stop and say so
const CHALLENGE = /checking your browser|confirm you are human|verify you are human|just a moment|attention required|are you a robot|ddos protection|cf-chl|challenge-platform|captcha/i;
const PLACEHOLDER_FILE = /placeholder|dummy|sample-?image|lorem|mask-group|elementor\/assets\/images|default-image|no-image|spacer|blank\.(gif|png)|1x1|pixel\.gif/i;
const PLACEHOLDER_TEXT = /lorem ipsum|description description|this is a paragraph|paragraph area|musician name|here is a description|your (title|text) here|sample text/i;

const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1440, height: 900 } });

async function settle(page) {
  for (const f of page.frames()) {
    const btns = await f.$$('button, a[role="button"], [role="button"]').catch(() => []);
    for (const b of btns) {
      const t = ((await b.innerText().catch(() => '')) || '').trim();
      if (REJECT.test(t) && await b.isVisible().catch(() => false)) { await b.click({ timeout: 2000 }).catch(() => {}); break; }
    }
  }
  await page.addStyleTag({ content: HIDE_CSS }).catch(() => {});
  // scroll through to trigger lazy images, then back
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } scrollTo(0, 0); });
  await page.waitForTimeout(800);
}

function collect() {
  const hex = (c) => { const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return c; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(parseFloat); const h = '#' + p.slice(0, 3).map((x) => Math.round(x).toString(16).padStart(2, '0')).join(''); return p.length > 3 && p[3] < 1 ? `${h}/${p[3]}` : h; };
  const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; };
  const style = (e) => {
    const cs = getComputedStyle(e), r = e.getBoundingClientRect();
    return {
      tag: e.tagName.toLowerCase(), cls: String(e.className?.baseVal ?? e.className ?? '').slice(0, 80), text: (e.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 50),
      font: `${cs.fontWeight} ${cs.fontSize}/${cs.lineHeight} ${cs.fontFamily}`, ls: cs.letterSpacing, tt: cs.textTransform !== 'none' ? cs.textTransform : undefined,
      color: hex(cs.color), bg: cs.backgroundColor !== 'rgba(0, 0, 0, 0)' ? hex(cs.backgroundColor) : undefined,
      radius: cs.borderTopLeftRadius !== '0px' ? cs.borderTopLeftRadius : undefined, pad: cs.padding, shadow: cs.boxShadow !== 'none' ? cs.boxShadow : undefined,
      border: cs.borderTopWidth !== '0px' ? `${cs.borderTopWidth} ${cs.borderTopStyle} ${hex(cs.borderTopColor)}` : undefined, w: Math.round(r.width), h: Math.round(r.height),
    };
  };
  const pick = (sel, n = 3) => [...document.querySelectorAll(sel)].filter(vis).slice(0, n).map(style);
  const elements = {
    body: [style(document.body)], h1: pick('h1'), h2: pick('h2'), h3: pick('h3'), h4: pick('h4'), p: pick('main p, p', 4), a: pick('main a, a', 4),
    button: pick('button, .btn, [class*="button" i], a[class*="btn" i]', 6), header: pick('header', 1), nav: pick('nav a', 4), footer: pick('footer', 1),
    card: pick('[class*="card" i]', 3), eyebrow: pick('[class*="eyebrow" i], [class*="overline" i], [class*="subtitle" i], [class*="kicker" i]', 3),
    input: pick('input[type="email"], input[type="text"]', 2), blockquote: pick('blockquote, [class*="quote" i]', 2), table: pick('table, th, td', 3),
  };
  // frequency of colours and fonts across visible elements
  const colors = {}, fonts = {}, radii = {};
  for (const e of [...document.querySelectorAll('body *')].filter(vis).slice(0, 4000)) {
    const cs = getComputedStyle(e);
    for (const c of [cs.color, cs.backgroundColor, cs.borderTopWidth !== '0px' ? cs.borderTopColor : null]) if (c && c !== 'rgba(0, 0, 0, 0)') colors[hex(c)] = (colors[hex(c)] || 0) + 1;
    fonts[cs.fontFamily.split(',')[0].replace(/["']/g, '').trim() + ' ' + cs.fontWeight] = (fonts[cs.fontFamily.split(',')[0].replace(/["']/g, '').trim() + ' ' + cs.fontWeight] || 0) + 1;
    if (cs.borderTopLeftRadius !== '0px') radii[cs.borderTopLeftRadius] = (radii[cs.borderTopLeftRadius] || 0) + 1;
  }
  const top = (o, n) => Object.entries(o).sort((x, y) => y[1] - x[1]).slice(0, n);
  const vars = {};
  for (const sh of document.styleSheets) { let rules; try { rules = sh.cssRules; } catch { continue; } for (const r of rules || []) if (r.selectorText === ':root' || r.selectorText === 'html') for (const p of r.style) if (p.startsWith('--')) vars[p] = r.style.getPropertyValue(p).trim(); }
  const fontFaces = [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family.replace(/["']/g, '')} ${f.weight} ${f.style}`);

  // assets
  const near = (e) => { for (let x = e; x && x !== document.body; x = x.parentElement) { const t = (x.innerText || '').trim(); if (t.length > 10) return t.replace(/\s+/g, ' ').slice(0, 140); } return ''; };
  const biggest = (set) => { if (!set) return null; let best = null, bw = 0; for (const part of set.split(',')) { const [u, d] = part.trim().split(/\s+/); const w = parseFloat(d) || 1; if (w >= bw) { bw = w; best = u; } } return best ? new URL(best, location.href).href : null; };
  const assets = [];
  for (const img of document.querySelectorAll('img')) {
    const r = img.getBoundingClientRect();
    const src = img.currentSrc || img.src; if (!src || src.startsWith('data:')) continue;
    assets.push({ kind: /logo/i.test(src + img.alt + img.className + (img.closest('header,footer') ? ' logo-zone' : '')) && (img.closest('header,footer') || /logo/i.test(src + img.alt)) ? 'logo' : 'image',
      src, srcsetMax: biggest(img.srcset || img.dataset.srcset) || undefined, alt: img.alt || undefined, natural: [img.naturalWidth, img.naturalHeight], shown: [Math.round(r.width), Math.round(r.height)],
      near: near(img), inHeader: !!img.closest('header') || undefined, inFooter: !!img.closest('footer') || undefined });
  }
  for (const e of document.querySelectorAll('body *')) {
    const bg = getComputedStyle(e).backgroundImage; if (!bg || bg === 'none') continue;
    for (const m of bg.matchAll(/url\(["']?([^"')]+)["']?\)/g)) if (!m[1].startsWith('data:')) { const r = e.getBoundingClientRect(); assets.push({ kind: 'background', src: new URL(m[1], location.href).href, shown: [Math.round(r.width), Math.round(r.height)], near: near(e) }); }
  }
  for (const v of document.querySelectorAll('video')) {
    const src = v.currentSrc || v.src || v.querySelector('source')?.src; if (src) assets.push({ kind: 'video', src, poster: v.poster || undefined, near: near(v) });
  }
  const og = document.querySelector('meta[property="og:image"]')?.content; if (og) assets.push({ kind: 'og-image', src: og });
  const icon = document.querySelector('link[rel~="icon"]')?.href; if (icon) assets.push({ kind: 'favicon', src: icon });
  const svgs = [...document.querySelectorAll('header svg, footer svg, [class*="logo" i] svg, a[class*="logo" i] svg, a[href="/"] svg')].filter((s) => s.getBoundingClientRect().width > 40).slice(0, 6).map((s) => s.outerHTML);
  return { elements, colors: top(colors, 24), fonts: top(fonts, 12), radii: top(radii, 8), vars, fontFaces: [...new Set(fontFaces)], assets, svgs,
    links: [...document.querySelectorAll('header a[href], nav a[href], footer a[href], [class*="menu" i] a[href], [class*="nav" i] a[href]')].map((l) => l.href) };
}

// WordPress/Jetpack/CDN resize params → the original file
function original(u) {
  try {
    const url = new URL(u);
    if (/^i\d\.wp\.com$/.test(url.hostname)) { const [, host, ...rest] = url.pathname.split('/'); return `https://${host}/${rest.join('/')}`; }
    let out = url.origin + url.pathname.replace(/-\d{2,4}x\d{2,4}(?=\.\w+$)/, '').replace(/-scaled(?=\.\w+$)/, '');
    const keep = [...url.searchParams].filter(([k]) => !/^(w|h|width|height|fit|resize|quality|q|format|fm|auto|crop|rmode|ssl|dpr)$/i.test(k));
    if (keep.length) out += '?' + new URLSearchParams(keep);
    return out;
  } catch { return u; }
}

const pages = [];
const queue = [...a._];
const seen = new Set();
const all = { styles: {}, assets: [] };
const crawl = +(a.crawl || 0);
while (queue.length) {
  const url = queue.shift();
  if (seen.has(url)) continue; seen.add(url);
  const name = (new URL(url).pathname.replace(/\/$/, '').split('/').pop() || 'home').replace(/[^\w-]/g, '_').slice(0, 40);
  console.log('→', url);
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 }).catch((e) => console.warn('  goto:', e.message));
  const challenged = async () => CHALLENGE.test((await page.title().catch(() => '')) + ' ' + (await page.evaluate(() => document.body?.innerText.slice(0, 600) || '').catch(() => '')));
  if (await challenged()) {
    await page.waitForTimeout(12000);                       // some checks clear by themselves
    if (await challenged()) {
      console.error(`\nSTOP  ${url} answers with a bot / human check. It is not bypassed.\n` +
        '      Options: reuse a capture from an earlier project for this client (reference/site, assets-pool);\n' +
        '      or ask the user to open the pages in their own browser and save them (Ctrl+S, "Webpage, complete")\n' +
        '      plus screenshots, and run inventory/capture on the saved files; or ask the client for brand assets.');
      await browser.close();
      process.exit(3);
    }
  }
  await settle(page);
  const data = await page.evaluate(collect);
  if (!pages.length || pages.length <= 1) {   // screenshots of the pages given explicitly (first ones)
    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w, height: w < 600 ? 844 : 900 });
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(OUT, `${name}-${w}.png`) });
      if (w === WIDTHS[0]) await page.screenshot({ path: path.join(OUT, `${name}-${w}-full.png`), fullPage: true }).catch(() => {});
    }
    await page.setViewportSize({ width: 1440, height: 900 });
  }
  all.styles[name] = { url, elements: data.elements, colors: data.colors, fonts: data.fonts, radii: data.radii, vars: data.vars, fontFaces: data.fontFaces };
  data.svgs.forEach((s, i) => fs.writeFileSync(path.join(OUT, 'logos', `${name}-${i + 1}.svg`), s));
  for (const x of data.assets) all.assets.push({ ...x, page: name });
  pages.push(name);
  if (pages.length <= crawl) {
    const host = new URL(a._[0]).hostname;
    for (const l of data.links) { try { const u = new URL(l); if (u.hostname === host && !u.hash && !/^\/[a-z]{2}(-[a-z]{2})?(\/|$)/i.test(u.pathname) && !/\.(pdf|jpg|png|zip)$/i.test(u.pathname) && !seen.has(u.href) && queue.length + pages.length < crawl + a._.length) queue.push(u.origin + u.pathname); } catch {} }
  }
  await page.close();
}
await browser.close();

// WordPress media library: every uploaded image with its original URL (UAENO: 56 files vs 17 on the home page)
const usesWp = all.assets.some((x) => /\/wp-content\/uploads\//.test(x.src));
if (usesWp && !a['no-wp']) {
  const origin = new URL(a._[0]).origin;
  let n = 0;
  for (let p = 1; p <= 20; p++) {
    const res = await fetch(`${origin}/wp-json/wp/v2/media?per_page=100&page=${p}&_fields=id,date,title,alt_text,mime_type,source_url,media_details`, { headers: { 'User-Agent': UA } }).catch(() => null);
    if (!res || !res.ok) break;
    const items = await res.json().catch(() => []);
    if (!Array.isArray(items) || !items.length) break;
    for (const m of items) {
      if (!/^image\/|^video\//.test(m.mime_type || '')) continue;
      n++;
      all.assets.push({ kind: m.mime_type.startsWith('video') ? 'video' : 'wp-media', src: m.source_url, alt: m.alt_text || undefined,
        natural: m.media_details?.width ? [m.media_details.width, m.media_details.height] : undefined,
        near: (m.title?.rendered || '').replace(/<[^>]+>/g, '').replace(/&#\d+;/g, ' ').slice(0, 140), page: 'wp-media ' + (m.date || '').slice(0, 10) });
    }
    if (items.length < 100) break;
  }
  console.log(n ? `WordPress media library: ${n} files listed` : 'WordPress media API not available');
}

// merge assets by best URL, flag placeholders
const byUrl = new Map();
for (const x of all.assets) {
  const best = x.srcsetMax && x.srcsetMax !== x.src ? x.srcsetMax : x.src;
  const orig = original(best);
  const key = orig;
  const e = byUrl.get(key) || { ...x, best: orig, alsoAt: [], uses: 0, nears: new Set() };
  e.uses++; e.nears.add(x.near || ''); if (x.page !== e.page) e.alsoAt.push(x.page);
  byUrl.set(key, e);
}
const assets = [...byUrl.values()].map((e) => {
  const reasons = [];
  if (PLACEHOLDER_FILE.test(e.best)) reasons.push('placeholder-like file name');
  if ([...e.nears].some((t) => PLACEHOLDER_TEXT.test(t))) reasons.push('next to placeholder text');
  if (e.uses >= 3 && e.nears.size >= 3 && e.kind === 'image') reasons.push(`same file reused ${e.uses}× with different captions`);
  if (e.natural && e.natural[0] && e.natural[0] < 120 && /image|wp-media/.test(e.kind)) reasons.push('tiny');
  if (e.kind === 'wp-media' && /-\d{2,4}x\d{2,4}(-\d)?\.\w+$/.test(e.best) && e.natural?.[0] < 500) reasons.push('thumbnail-sized upload');
  const { nears, ...rest } = e;
  return { ...rest, near: [...nears][0] || undefined, suspect: reasons.length ? reasons : undefined };
}).sort((x, y) => (x.suspect ? 1 : 0) - (y.suspect ? 1 : 0) || (x.kind === 'wp-media' ? 1 : 0) - (y.kind === 'wp-media' ? 1 : 0) || (y.natural?.[0] || 0) - (x.natural?.[0] || 0));

writeJSON(path.join(OUT, 'styles.json'), all.styles);
writeJSON(path.join(OUT, 'assets.json'), assets);
const sus = assets.filter((x) => x.suspect).length;
console.log(`\n${pages.length} page(s) · ${assets.length} unique assets (${sus} flagged as placeholder/suspect) · ${fs.readdirSync(path.join(OUT, 'logos')).length} inline SVG logos`);
console.log(`→ ${OUT}/styles.json, ${OUT}/assets.json, screenshots in ${OUT}/`);

if (a.download) {
  const dir = a.download; fs.mkdirSync(dir, { recursive: true });
  const manifest = [];
  const used = new Set();
  for (const x of assets.filter((x) => !x.suspect && x.kind !== 'video')) {
    let url = x.best, res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'image/*,*/*' } }).catch(() => null);
    if (!res || !res.ok) { url = x.src; res = await fetch(url, { headers: { 'User-Agent': UA } }).catch(() => null); }
    if (!res || !res.ok) { manifest.push({ ...x, error: res ? res.status : 'fetch failed' }); continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    let base = decodeURIComponent(new URL(url).pathname.split('/').pop() || 'asset').replace(/[^\w.-]/g, '_').slice(-80);
    if (!/\.\w{2,4}$/.test(base)) base += '.' + ((res.headers.get('content-type') || '').split('/')[1]?.split(/[;+]/)[0] || 'bin');
    let file = base, i = 1; while (used.has(file)) file = base.replace(/(\.\w+)$/, `-${i++}$1`); used.add(file);
    fs.writeFileSync(path.join(dir, file), buf);
    manifest.push({ file, url, bytes: buf.length, kind: x.kind, page: x.page, alsoAt: x.alsoAt.length ? x.alsoAt : undefined, alt: x.alt, near: x.near, shownOnSite: x.shown });
  }
  writeJSON(path.join(dir, 'manifest.json'), manifest);
  console.log(`downloaded ${manifest.filter((m) => !m.error).length} files → ${dir}/ (manifest.json). Videos are listed in assets.json — download those deliberately.`);
  console.log('next: node contact_sheet.mjs ' + dir + '  (adds pixel sizes to the manifest, renders a preview sheet)');
}
