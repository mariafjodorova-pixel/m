// Reproduces how RELAYTO embeds a custom HTML page: the document goes into <iframe srcdoc>, and the host
// injects `html, body { height: 100%; margin: 0; padding: 0 }` (same simulation that was validated against
// the live RELAYTO page on the Westinghouse project). For the real thing, also open the published page.
// Checks per width: no JS errors · wheel scrolling moves the page · header stays pinned to the top
// and switches to its scrolled state · progress bar moves · every in-page link scrolls to its target
// without navigating the frame (a plain "#id" link in srcdoc resolves against the HOST url and reloads it).
//
// Usage: node hostsim.mjs dist/index.html [--header ".site-header"] [--scrolled is-scrolled,is-solid]
//                         [--progress "[data-progress]"] [--widths 1440,390] [--out reference/hostsim]
import fs from 'node:fs';
import path from 'node:path';
import { loadPlaywright, startServer, args } from './_lib.mjs';

const a = args();
const file = a._[0];
if (!file) { console.error('usage: node hostsim.mjs dist/index.html [--header sel]'); process.exit(1); }
const HEADER = a.header || 'header, [data-header], .site-header';
const SCROLLED = String(a.scrolled || 'is-scrolled,is-solid,scrolled,is-sticky').split(',');
const PROGRESS = a.progress || '[data-progress], .progress__bar';
const WIDTHS = String(a.widths || '1440,390').split(',').map(Number);
const OUT = a.out || 'reference/hostsim';
fs.mkdirSync(OUT, { recursive: true });

const doc = fs.readFileSync(file, 'utf8');
const HOST = { relayto: 'html, body { height: 100%; margin: 0; padding: 0; }' };
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
// wrapper pages live next to the HTML so relative asset paths resolve (locally); inside RELAYTO they would NOT —
// srcdoc resolves them against the host page. Hence the warning below.
const htmlDir = path.dirname(path.resolve(file));
const tmp = fs.mkdtempSync(path.join(htmlDir, '.hostsim-'));
const relRefs = [...new Set((doc.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').match(/\b(?:src|poster|srcset|href)=["'](?!https?:|data:|#|mailto:|tel:|\/\/|javascript:)([^"'\s]+\.(?:png|jpe?g|webp|avif|gif|svg|mp4|webm|woff2?|css|js))|url\(["']?(?!https?:|data:)([^"')]+)/gi) || []))];
if (relRefs.length) console.log(`WARN  ${relRefs.length} relative asset reference(s) — fine for a local preview, but they will 404 inside RELAYTO.\n      Test the version packed with --root <cdn url> (or --mode inline / --map). e.g. ${relRefs.slice(0, 2).join(', ')}`);
for (const [mode, css] of Object.entries(HOST)) {
  const inner = doc.includes('</head>') ? doc.replace('</head>', `<style>${css}</style></head>`) : `<style>${css}</style>` + doc;
  fs.writeFileSync(path.join(htmlDir, `.hostsim-${mode}.html`), `<!doctype html><html><head><meta charset="utf-8"><title>host</title></head><body style="margin:0;height:100vh;overflow:hidden;font:14px sans-serif">
<div style="height:56px;background:#e9e9ef;display:flex;align-items:center;padding:0 16px">HOST CHROME (simulated)</div>
<iframe id="f" style="border:0;width:100%;height:calc(100vh - 56px);display:block" allow="autoplay; fullscreen" srcdoc="${esc(inner)}"></iframe></body></html>`);
}

const { chromium } = loadPlaywright();
const { server, url } = await startServer(htmlDir);
const browser = await chromium.launch();
let fails = 0;
const say = (ok, msg) => { if (!ok) fails++; console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${msg}`); };

for (const mode of Object.keys(HOST)) for (const w of WIDTHS) {
  console.log(`\n[${mode} srcdoc] ${w}px`);
  const page = await browser.newPage({ viewport: { width: w, height: w < 600 ? 844 : 900 }, hasTouch: w < 600 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // third-party players (YouTube…) log permission-policy noise inside their own frames — not ours
  page.on('console', (m) => { if (m.type() === 'error' && !/Permissions policy violation|youtube|ytimg|doubleclick/i.test(m.text() + (m.location()?.url || ''))) errors.push(m.text()); });
  await page.goto(url + `.hostsim-${mode}.html`, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const getFrame = () => page.frames().find((f) => f.parentFrame() === page.mainFrame());
  let frame = getFrame();
  const state = () => frame.evaluate(([H, S, P]) => {
    const se = document.scrollingElement || document.documentElement;
    const y = Math.max(window.scrollY, se.scrollTop, document.body.scrollTop);
    const h = document.querySelector(H);
    const p = document.querySelector(P);
    return {
      y: Math.round(y), url: location.href,
      headerTop: h ? Math.round(h.getBoundingClientRect().top) : null, headerH: h ? h.offsetHeight : 0,
      scrolled: h ? S.some((c) => h.classList.contains(c)) : null,
      progress: p ? (p.style.transform || getComputedStyle(p).transform || p.style.width) : null,
    };
  }, [HEADER, SCROLLED, PROGRESS]);

  const s0 = await state();
  await page.mouse.move(w / 2, 400);
  for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, 700); await page.waitForTimeout(350); }
  await page.waitForTimeout(600);
  const s1 = await state();
  say(s1.y > s0.y + 500, `wheel scroll moves the page (scrollTop ${s0.y} → ${s1.y})`);
  if (s1.headerTop !== null) {
    say(Math.abs(s1.headerTop) <= 1, `header pinned at top after scrolling (top=${s1.headerTop})`);
    say(s1.scrolled === true, `header switched to scrolled state (${SCROLLED.join('/')})`);
  } else console.log('  SKIP  no header found for selector ' + HEADER);
  if (s1.progress !== null) say(s1.progress !== s0.progress, `progress bar moved (${s0.progress} → ${s1.progress})`);
  await page.screenshot({ path: path.join(OUT, `${mode}-${w}.png`) });

  // in-page links: visible ones first (nav), then the rest
  // scroll links only: toggles ("#mobile-nav" with aria-controls / uk-toggle) and fixed/dialog targets are skipped
  const hrefs = await frame.evaluate(() => [...new Set([...document.querySelectorAll('a[href^="#"]')]
    .filter((x) => !x.hasAttribute('aria-controls') && !x.hasAttribute('uk-toggle') && !x.matches('[data-toggle],[data-bs-toggle],[role="button"]'))
    .map((x) => x.getAttribute('href'))
    .filter((h) => { if (h.length < 2) return false; const t = document.getElementById(decodeURIComponent(h.slice(1))); return t && getComputedStyle(t).position !== 'fixed' && !t.closest('dialog'); }))]);
  const bad = [];
  for (const href of hrefs) {
    await frame.evaluate((h) => { const el = [...document.querySelectorAll(`a[href="${h}"]`)][0]; el.click(); }, href).catch(() => {});
    await page.waitForTimeout(1100);
    frame = getFrame();
    if (frame.url() !== 'about:srcdoc') {
      bad.push(`${href}: FRAME NAVIGATED to ${frame.url()} — handle in-page links with JS (scrollIntoView + preventDefault)`);
      await page.reload(); await page.waitForTimeout(1500); frame = getFrame();
      continue;
    }
    const ok = await frame.evaluate(([h, H]) => {
      const t = document.getElementById(decodeURIComponent(h.slice(1)));
      const head = document.querySelector(H);
      const top = t.getBoundingClientRect().top, hh = head ? head.getBoundingClientRect().bottom : 0;
      const se = document.scrollingElement || document.documentElement, sc = document.body.scrollTop > 0 ? document.body : se;
      const atEdge = sc.scrollTop <= 1 || sc.scrollTop >= sc.scrollHeight - sc.clientHeight - 2;   // page top / bottom: target can't move further
      const placed = (top >= hh - 2 && top <= hh + 120) || (atEdge && top >= -2);
      return { url: location.href, top: Math.round(top), hh: Math.round(hh), ok: location.href === 'about:srcdoc' && placed };
    }, [href, HEADER]).catch(() => ({ ok: false, url: 'frame navigated away' }));
    if (!ok.ok) bad.push(`${href}: target at ${ok.top}px, header bottom ${ok.hh}px`);
  }
  say(bad.length === 0, `${hrefs.length - bad.length}/${hrefs.length} in-page links land below the header without reloading the frame${bad.length ? '\n        ' + bad.slice(0, 8).join('\n        ') : ''}`);
  say(errors.length === 0, `no JS errors${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
  await page.close();
}
await browser.close();
server.close();
fs.rmSync(tmp, { recursive: true, force: true });
for (const mode of Object.keys(HOST)) fs.rmSync(path.join(htmlDir, `.hostsim-${mode}.html`), { force: true });
console.log(fails ? `\n${fails} check(s) FAILED — screenshots in ${OUT}` : `\nALL HOST CHECKS PASSED — screenshots in ${OUT}`);
process.exit(fails ? 1 : 0);
