// Content inventory of a page: every text block (including hidden tabs, accordions, offcanvas menus),
// tooltip/alt/aria/title attributes, meta, links, ids, data-* attributes, headings outline, images, sections.
// Used (1) to capture the source when the input is HTML or a web page, (2) to verify the result.
//
// Usage:
//   node inventory.mjs <file.html | https://url> [--out inventory.json] [--js] [--wait 2500] [--scope "main"]
//   --js     run page scripts (default: ON for URLs, OFF for local files — the raw DOM already holds hidden content,
//            and animated counters would be caught mid-count)
//   --scope  CSS selector to limit extraction (e.g. the article body of a live page, without the site chrome)
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadPlaywright, args, writeJSON, UA } from './_lib.mjs';

const a = args();
const input = a._[0];
if (!input) { console.error('usage: node inventory.mjs <file.html|url> [--out x.json] [--js] [--scope sel]'); process.exit(1); }
const isUrl = /^https?:/i.test(input);
const js = a.js !== undefined ? a.js !== 'false' : isUrl;
const out = a.out || 'inventory.json';

const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const ctx = await browser.newContext({ javaScriptEnabled: js, userAgent: UA, viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const url = isUrl ? input : pathToFileURL(path.resolve(input)).href;
await page.goto(url, { waitUntil: isUrl ? 'networkidle' : 'load', timeout: 90000 }).catch((e) => console.warn('goto:', e.message));
if (js) await page.waitForTimeout(+(a.wait || 2500));

const inv = await page.evaluate((scopeSel) => {
  const norm = (s) => String(s).replace(/[\u00AD\u200B-\u200D\u2060\uFEFF]/g, '').replace(/[\u00A0\u2007\u202F\u2009\u200A]/g, ' ').replace(/\s+/g, ' ').trim();
  const root = scopeSel ? document.querySelector(scopeSel) : document.body;
  if (!root) return { error: 'scope not found: ' + scopeSel };
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'SVG', 'svg', 'IFRAME', 'OBJECT', 'CANVAS']);
  const INLINE = new Set(['A', 'SPAN', 'EM', 'STRONG', 'B', 'I', 'U', 'S', 'SMALL', 'SUP', 'SUB', 'CODE', 'ABBR', 'MARK', 'TIME', 'Q', 'CITE', 'DFN', 'KBD', 'SAMP', 'VAR', 'BDI', 'BDO', 'DATA', 'LABEL', 'WBR', 'BR', 'IMG', 'PICTURE', 'SOURCE']);
  // an inline tag laid out as a box (flex/grid item, inline-block, block) is a separate piece of text,
  // e.g. <li><span>Germany</span><span>17%</span></li> rendered as two grid cells
  const isBlock = (el) => {
    if (!INLINE.has(el.tagName)) return true;
    const d = getComputedStyle(el).display;
    return !(d === 'inline' || d === 'contents');   // display:none inline = separate (e.g. toggled values)
  };
  // path like "section#tour > h3" for locating strings in reports
  const where = (el) => {
    const parts = [];
    for (let e = el; e && e !== document.body && parts.length < 4; e = e.parentElement) {
      if (e.id) { parts.unshift(e.tagName.toLowerCase() + '#' + e.id); break; }
      if (/^(SECTION|ARTICLE|HEADER|FOOTER|NAV|MAIN|ASIDE)$/.test(e.tagName)) parts.unshift(e.tagName.toLowerCase());
    }
    return parts.join(' > ') || 'body';
  };
  const hiddenNow = (el) => { for (let e = el; e; e = e.parentElement) { if (e.hidden || e.getAttribute && e.getAttribute('aria-hidden') === 'true') return true; const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return true; } return false; };

  // ---- text blocks: text of each block element, without the text of nested blocks
  const blocks = [];
  const walk = (el) => {
    if (SKIP.has(el.tagName)) return;
    let own = '';
    const collect = (node) => {
      for (const n of node.childNodes) {
        if (n.nodeType === 3) own += n.textContent;
        else if (n.nodeType === 1) {
          if (SKIP.has(n.tagName)) continue;
          if (n.tagName === 'BR') { own += ' '; continue; }
          if (isBlock(n)) { own += ' '; walk(n); } else collect(n);
        }
      }
    };
    collect(el);
    const t = norm(own);
    if (t) blocks.push({ t, tag: el.tagName.toLowerCase(), at: where(el), hidden: hiddenNow(el) || undefined });
  };
  walk(root);

  // ---- attribute texts: tooltips, alt, aria, title, placeholders
  const attrs = [];
  const TOOLTIP = ['uk-tooltip', 'data-tooltip', 'data-tippy-content', 'data-bs-original-title', 'data-title', 'data-original-title'];
  root.querySelectorAll('*').forEach((el) => {
    if (el.closest('script,style,template')) return;
    const push = (kind, v) => { v = norm(v || ''); if (v) attrs.push({ kind, t: v, tag: el.tagName.toLowerCase(), at: where(el) }); };
    for (const name of TOOLTIP) if (el.hasAttribute(name)) { let v = el.getAttribute(name); const m = /title:\s*([^;]+)/.exec(v); push('tooltip', m ? m[1] : v); }
    if (el.hasAttribute('alt')) push('alt', el.getAttribute('alt'));
    if (el.hasAttribute('aria-label')) push('aria-label', el.getAttribute('aria-label'));
    if (el.hasAttribute('title') && el.tagName !== 'IFRAME') push('title', el.getAttribute('title'));
    if (el.hasAttribute('placeholder')) push('placeholder', el.getAttribute('placeholder'));
    if (el.tagName === 'IFRAME' && el.title) push('iframe-title', el.title);
    if (el.tagName === 'INPUT' && /button|submit/.test(el.type) && el.value) push('button-value', el.value);
  });

  const meta = { title: norm(document.title), lang: document.documentElement.lang || undefined };
  document.querySelectorAll('meta[name],meta[property]').forEach((m) => {
    const k = m.getAttribute('name') || m.getAttribute('property');
    if (/^(description|og:title|og:description|twitter:title|twitter:description|keywords)$/i.test(k)) meta[k] = norm(m.content);
  });

  const links = [...root.querySelectorAll('a[href]')].map((l) => ({ href: l.getAttribute('href'), text: norm(l.textContent) || norm(l.getAttribute('aria-label') || ''), target: l.target || undefined, at: where(l) }));
  const ids = [...root.querySelectorAll('[id]')].map((e) => e.id);
  const dataAttrs = {};
  root.querySelectorAll('*').forEach((el) => { for (const at of el.attributes) if (at.name.startsWith('data-')) dataAttrs[at.name] = (dataAttrs[at.name] || 0) + 1; });
  const headings = [...root.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => ({ level: +h.tagName[1], t: norm(h.textContent), at: where(h) }));
  const sections = [...root.querySelectorAll('section, [data-section], main > *')].filter((s, i, arr) => arr.indexOf(s) === i)
    .map((s) => ({ tag: s.tagName.toLowerCase(), id: s.id || undefined, heading: norm((s.querySelector('h1,h2,h3') || {}).textContent || '') || undefined }));
  const images = [...root.querySelectorAll('img, [data-ai-slot], picture source, video')].map((e) => ({
    tag: e.tagName.toLowerCase(), src: e.currentSrc || e.getAttribute('src') || e.getAttribute('srcset') || e.getAttribute('poster') || undefined,
    alt: e.getAttribute('alt') ?? undefined, slot: e.hasAttribute('data-ai-slot') || undefined, at: where(e),
    w: e.naturalWidth || e.getAttribute('width') || undefined, h: e.naturalHeight || e.getAttribute('height') || undefined,
  }));
  // components: how many of each repeated thing (cards, list items, quotes...) — compared later
  const count = (sel) => root.querySelectorAll(sel).length;
  const components = {
    sections: count('section'), h2: count('h2'), h3: count('h3'), li: count('li'), blockquote: count('blockquote'), figure: count('figure'),
    table: count('table'), tr: count('tr'), img: count('img'), button: count('button'), details: count('details'), form: count('form'),
    iframe: count('iframe'), video: count('video'), 'a[href^="#"]': count('a[href^="#"]'),
  };
  return { meta, blocks, attrs, links, ids, dataAttrs, headings, sections, images, components };
}, a.scope || null);

await browser.close();
if (inv.error) { console.error(inv.error); process.exit(1); }
inv.source = input; inv.js = js; inv.scope = a.scope || undefined; inv.createdAt = new Date().toISOString();
writeJSON(out, inv);
const hidden = inv.blocks.filter((b) => b.hidden).length;
console.log(`${out}: ${inv.blocks.length} text blocks (${hidden} hidden right now), ${inv.attrs.length} attribute texts, ${inv.links.length} links, ${inv.headings.length} headings, ${inv.images.length} images/slots, ${inv.ids.length} ids`);
const tips = inv.attrs.filter((x) => x.kind === 'tooltip').length;
if (tips) console.log(`  tooltips: ${tips} — these are content too`);
if (Object.keys(inv.dataAttrs).length) console.log('  data-* attributes:', Object.entries(inv.dataAttrs).map(([k, v]) => `${k}×${v}`).join(', '));
