// Device / browser QA of the built page, with motion on (reveals and counters run as for a real visitor).
//
// Usage: node qa.mjs dist [--only iphone,desktop-1440] [--out reference/qa] [--allow-hosts cdn-3.relayto.com,fonts.gstatic.com]
//        node qa.mjs https://… (a published page)
// Per profile: top + full-page screenshots, and checks:
//   horizontal overflow (with the offending elements) · broken images · JS errors · third-party requests before
//   any interaction (players, trackers; hosts in --allow-hosts are fine) · reveal elements still hidden after
//   scrolling through · mobile: tap targets < 40px, text < 12px · desktop: visible focus ring when tabbing
// Needs the three engines: npx playwright install chromium webkit firefox
import fs from 'node:fs';
import path from 'node:path';
import { loadPlaywright, startServer, args, writeJSON } from './_lib.mjs';

const a = args();
const target = a._[0] || 'dist';
const OUT = a.out || 'reference/qa';
fs.mkdirSync(OUT, { recursive: true });
const allowHosts = String(a['allow-hosts'] || 'cdn-3.relayto.com,cdn.relayto.com,fonts.googleapis.com,fonts.gstatic.com').split(',').filter(Boolean);
const pw = loadPlaywright();
const { chromium, webkit, firefox, devices } = pw;

const PROFILES = [
  { name: 'desktop-1920-chromium', engine: chromium, ctx: { viewport: { width: 1920, height: 1080 } } },
  { name: 'desktop-1440-chromium', engine: chromium, ctx: { viewport: { width: 1440, height: 900 } } },
  { name: 'desktop-1440-firefox', engine: firefox, ctx: { viewport: { width: 1440, height: 900 } } },
  { name: 'desktop-1440-safari', engine: webkit, ctx: { viewport: { width: 1440, height: 900 } } },
  { name: 'laptop-1280-chromium', engine: chromium, ctx: { viewport: { width: 1280, height: 720 } } },
  { name: 'tablet-1024-chromium', engine: chromium, ctx: { viewport: { width: 1024, height: 768 }, hasTouch: true } },
  { name: 'tablet-768-safari', engine: webkit, ctx: { ...devices['iPad Mini'] } },
  { name: 'iphone-14-safari', engine: webkit, ctx: { ...devices['iPhone 14'] }, mobile: true },
  { name: 'iphone-se-320-safari', engine: webkit, ctx: { ...devices['iPhone SE'] }, mobile: true },
  { name: 'iphone-14-landscape-safari', engine: webkit, ctx: { ...devices['iPhone 14 landscape'] }, mobile: true },
  { name: 'pixel-7-chrome', engine: chromium, ctx: { ...devices['Pixel 7'] }, mobile: true },
  { name: 'android-360-chrome', engine: chromium, ctx: { viewport: { width: 360, height: 740 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }, mobile: true },
].filter((p) => !a.only || String(a.only).split(',').some((k) => p.name.includes(k)));

let base = target, server = null;
if (!/^https?:/.test(target)) { const s = await startServer(target); server = s.server; base = s.url; }
const origin = new URL(base).origin;
const browsers = new Map();
const results = [];
let fails = 0;

for (const prof of PROFILES) {
  let browser = browsers.get(prof.engine);
  if (!browser) { try { browser = await prof.engine.launch(); } catch (e) { console.log(`SKIP ${prof.name}: ${e.message.split('\n')[0]}`); continue; } browsers.set(prof.engine, browser); }
  const ctx = await browser.newContext(prof.ctx);
  const page = await ctx.newPage();
  const errors = [], early = [];
  let interacted = false;
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (interacted || u.protocol === 'data:' || u.origin === origin || allowHosts.includes(u.hostname)) return;
    early.push(u.hostname + u.pathname.slice(0, 40));
  });
  await page.goto(base, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, `${prof.name}-1-top.png`) });

  let focus = null;
  if (!prof.mobile) {
    focus = [];
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      focus.push(await page.evaluate(() => { const el = document.activeElement; if (!el || el === document.body) return null; const cs = getComputedStyle(el); return { t: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 20), ring: (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2) || cs.boxShadow !== 'none' }; }));
    }
    await page.evaluate(() => { document.activeElement?.blur(); });
  }
  // read like a visitor: ~0.6 viewport per step
  const vh = page.viewportSize().height;
  for (let i = 0; i < 300; i++) {
    const done = await page.evaluate((st) => { const se = document.scrollingElement; const before = se.scrollTop; se.scrollBy({ top: st, behavior: 'instant' }); /* instant: pages often set scroll-behavior: smooth */ return se.scrollTop === before; }, Math.round(vh * 0.6));
    await page.waitForTimeout(140);
    if (done) break;
  }
  await page.waitForTimeout(1200);
  const st = await page.evaluate((mobile) => {
    const W = document.documentElement.clientWidth;
    const vis = (e) => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
    const wide = [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); if (r.right <= W + 1 || !vis(e)) return false; for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') return false; } return getComputedStyle(e).position !== 'fixed'; })
      .slice(0, 6).map((e) => `${e.tagName.toLowerCase()}.${String(e.className?.baseVal ?? e.className).split(' ')[0]} (right ${Math.round(e.getBoundingClientRect().right)}px)`);
    const broken = [...document.images].filter((i) => i.complete && !i.naturalWidth && !i.closest('dialog')).map((i) => i.src.slice(-60));
    const stuck = [...document.querySelectorAll('.reveal, [data-reveal], [data-aos]')].filter((e) => vis(e) && +getComputedStyle(e).opacity < 0.1 && !e.closest('dialog, [aria-hidden="true"]')).length;
    let small = [], tiny = 0;
    if (mobile) {
      small = [...document.querySelectorAll('a[href], button, [role="button"], summary, input, select')].filter((e) => { if (!vis(e)) return false; const r = e.getBoundingClientRect(); return (r.width < 40 || r.height < 40) && r.bottom + scrollY > 0 && !e.classList.contains('skip-link') && !e.closest('p, li > p, td, .table-scroll') && getComputedStyle(e).display !== 'inline'; })
        .slice(0, 8).map((e) => `${(e.getAttribute('aria-label') || e.textContent || e.tagName).trim().slice(0, 18)} ${Math.round(e.getBoundingClientRect().width)}×${Math.round(e.getBoundingClientRect().height)}`);
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n; while ((n = walker.nextNode())) { const el = n.parentElement; if (n.textContent.trim() && el && vis(el) && parseFloat(getComputedStyle(el).fontSize) < 12 && !el.closest('.visually-hidden, svg')) tiny++; }
    }
    return { sw: document.documentElement.scrollWidth, W, wide, broken, stuck, small, tiny };
  }, !!prof.mobile);
  interacted = true;
  await page.evaluate(() => document.scrollingElement.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, `${prof.name}-4-full.png`), fullPage: true }).catch(() => {});

  const checks = [
    [st.sw <= st.W + 1, `no horizontal scroll (${st.sw}px vs ${st.W}px)`, st.wide.join(', ')],
    [!st.broken.length, 'all images load', st.broken.join(', ')],
    [!errors.length, 'no JS errors', errors.slice(0, 3).join(' | ')],
    [!early.length, 'no third-party requests before interaction', [...new Set(early)].slice(0, 5).join(', ')],
    [!st.stuck, 'every .reveal became visible after scrolling', st.stuck ? `${st.stuck} still hidden` : ''],
  ];
  if (prof.mobile) {
    checks.push([!st.small.length, 'tap targets ≥ 40px', st.small.join(', ')]);
    checks.push([st.tiny < 3, 'no text smaller than 12px', st.tiny ? `${st.tiny} text nodes` : '']);
  } else if (focus) {
    const noRing = focus.filter((f) => f && !f.ring).map((f) => f.t);
    checks.push([!noRing.length, 'visible focus ring when tabbing', noRing.join(', ')]);
  }
  console.log(`\n${prof.name}`);
  for (const [ok, label, detail] of checks) { if (!ok) fails++; console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${!ok && detail ? '  — ' + detail : ''}`); }
  results.push({ profile: prof.name, checks: checks.map(([ok, label, detail]) => ({ ok, label, detail })) });
  await ctx.close();
}
for (const b of browsers.values()) await b.close();
server?.close();
writeJSON(path.join(OUT, 'qa-report.json'), results);
console.log(fails ? `\n${fails} check(s) FAILED — screenshots in ${OUT}` : `\nALL QA CHECKS PASSED — screenshots in ${OUT}`);
process.exit(fails ? 1 : 0);
