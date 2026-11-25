// Compares the result against the source content. Exit code 1 if anything fails.
//
// Usage:
//   node compare.mjs <source-inventory.json | content.json> <result-inventory.json>
//        [--allow ui-strings.json] [--link-map link-map.json] [--skip alt,title] [--no-ids] [--no-counts] [--report compare.md]
//
// Source can be:
//   - an inventory.json (input = HTML or web page)
//   - a content.json  (input = PDF): every string value under keys like text/title/label/value/... is a source string
// ui-strings.json   ["Skip to content", "Show table", ...]  strings that may appear in the result without being in the source
// link-map.json     {"<source href>": "<result href>"}        deliberate link replacements (e.g. PDF → RELAYTO document)
import fs from 'node:fs';
import { args, norm, numTokens } from './_lib.mjs';

const a = args();
const [srcPath, resPath] = a._;
if (!srcPath || !resPath) { console.error('usage: node compare.mjs <source.json> <result-inventory.json> [--allow ui.json] [--link-map map.json]'); process.exit(1); }
const S = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
const R = JSON.parse(fs.readFileSync(resPath, 'utf8'));
const allow = new Set((a.allow ? JSON.parse(fs.readFileSync(a.allow, 'utf8')) : []).map(norm));
const linkMap = a['link-map'] ? JSON.parse(fs.readFileSync(a['link-map'], 'utf8')) : {};
const skipKinds = new Set(String(a.skip || '').split(',').filter(Boolean));

const isInventory = Array.isArray(S.blocks);
const TEXT_KEYS = new Set(['t', 'text', 'title', 'label', 'value', 'badge', 'attribution', 'caption', 'description', 'footnote', 'qualifier', 'name', 'role', 'subtitle', 'number', 'detail', 'question', 'answer', 'quote', 'cta', 'heading', 'lead', 'body', 'items', 'cells', 'rows', 'columns']);
const SKIP_KEYS = new Set(['note', 'alt', 'src', 'href', 'url', 'icon', 'id', 'type', 'variant', 'theme', 'page', 'pages', 'meta', 'relayto', 'extra', 'hotspot', 'width', 'height', 'angle', 'bbox']);

// ---- source strings
let srcStrings = [];
if (isInventory) {
  srcStrings = S.blocks.map((b) => ({ t: b.t, at: b.at, kind: 'text' }))
    .concat(S.attrs.filter((x) => !skipKinds.has(x.kind) && x.kind !== 'alt').map((x) => ({ t: x.t, at: x.at, kind: x.kind })));
  if (S.meta) for (const [k, v] of Object.entries(S.meta)) if (v && k !== 'lang') srcStrings.push({ t: v, at: 'meta', kind: 'meta:' + k });
} else {
  const walk = (o, at) => {
    if (Array.isArray(o)) return o.forEach((v) => (typeof v === 'string' ? srcStrings.push({ t: norm(v), at, kind: 'text' }) : walk(v, at)));
    if (!o || typeof o !== 'object') return;
    if (/^(image|logo|logos|photo|icon|video)$/.test(o.type)) return;   // media descriptors are not visible copy
    const here = o.id ? (at ? at + '/' : '') + o.id : at;
    for (const [k, v] of Object.entries(o)) {
      if (SKIP_KEYS.has(k)) continue;
      if (typeof v === 'string') { if (TEXT_KEYS.has(k)) srcStrings.push({ t: norm(v), at: here || '', kind: 'text' }); }
      else walk(v, here);
    }
  };
  walk(S.sections || S, '');
}
srcStrings = srcStrings.filter((x) => x.t);

// ---- result strings
const resBlocks = R.blocks.map((b) => b.t);
const resAttrs = R.attrs.filter((x) => !skipKinds.has(x.kind) && x.kind !== 'alt').map((x) => x.t);
const resMeta = Object.entries(R.meta || {}).filter(([k]) => k !== 'lang').map(([, v]) => v);
const resAll = [...resBlocks, ...resAttrs, ...resMeta];
const resStream = ' ' + resAll.join(' \u2063 ') + ' ';
const srcStream = ' ' + srcStrings.map((x) => x.t).join(' \u2063 ') + ' ';
const squash = (s) => s.replace(/\s+/g, '');
// two consecutive source strings shown as one line (label + qualifier, value + unit…) are fine
const srcPairs = new Set(srcStrings.slice(1).map((x, i) => srcStrings[i].t + ' ' + x.t));
const resSquash = squash(resStream), srcSquash = squash(srcStream);

let fails = 0;
const lines = [];
const log = (ok, label, detail = '') => { if (!ok) fails++; lines.push(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '\n' + detail : ''}`); };
const list = (arr, n = 40) => arr.slice(0, n).map((x) => '   - ' + x).join('\n') + (arr.length > n ? `\n   … +${arr.length - n} more` : '');

// 1. every source string exists in the result (exact block, or contiguous inside the result text stream)
const resSet = new Set(resAll);
const missing = [];
const looseOnly = [];
for (const x of srcStrings) {
  if (resSet.has(x.t) || resStream.includes(' ' + x.t + ' ') || resStream.includes(x.t)) continue;
  if (resSquash.includes(squash(x.t))) { looseOnly.push(`[${x.at}] ${x.t.slice(0, 120)}`); continue; }
  missing.push(`[${x.kind} @ ${x.at}] ${x.t.slice(0, 160)}`);
}
log(missing.length === 0, `source text present in result (${srcStrings.length - missing.length}/${srcStrings.length})`, missing.length ? list(missing) : '');
if (looseOnly.length) lines.push(`WARN  ${looseOnly.length} source strings match only when spaces are ignored (check word breaks/spacing):\n${list(looseOnly, 15)}`);

// 2. nothing in the result that is not in the source (except allowed UI strings)
const extra = [];
for (const t of new Set(resAll)) {
  if (allow.has(t) || srcPairs.has(t) || srcStream.includes(t) || srcSquash.includes(squash(t))) continue;
  // allow a result block that is a concatenation of allowed strings / source strings split differently
  const parts = t.split(/\s*[·|•]\s*/);
  if (parts.length > 1 && parts.every((p) => !p || allow.has(p) || srcStream.includes(p))) continue;
  extra.push(t.slice(0, 160));
}
log(extra.length === 0, 'no text in result that is absent from source (except --allow list)', extra.length ? list(extra) + '\n   → either remove, or add deliberate UI strings to ui-strings.json' : '');

// 3. numbers: every number shown in the result exists in the source
const srcNums = new Set(numTokens(srcStream));
const badNums = [...new Set(numTokens(resStream))].filter((n) => !srcNums.has(n) && !allow.has(n));
log(badNums.length === 0, 'every number in the result exists in the source', badNums.length ? list(badNums) : '');

// 4. headings order (inventory sources only)
if (isInventory && S.headings && R.headings) {
  const sh = S.headings.map((h) => h.t), rh = R.headings.map((h) => h.t);
  let j = 0; const outOfOrder = [];
  for (const h of sh) { const k = rh.indexOf(h, j); if (k === -1) { if (!rh.includes(h)) outOfOrder.push('missing heading: ' + h); else outOfOrder.push('out of order: ' + h); } else j = k + 1; }
  log(outOfOrder.length === 0, 'headings present and in source order', outOfOrder.length ? list(outOfOrder) : '');
  const lvl = S.headings.filter((h) => { const r = R.headings.find((x) => x.t === h.t); return r && r.level !== h.level; }).map((h) => `${h.t}: h${h.level} → h${R.headings.find((x) => x.t === h.t).level}`);
  if (lvl.length) lines.push(`WARN  heading levels changed:\n${list(lvl, 20)}`);
}

// 5. links
if (isInventory && S.links && R.links) {
  const resHrefs = new Set(R.links.map((l) => l.href));
  const lost = [...new Set(S.links.map((l) => l.href))].filter((h) => !resHrefs.has(linkMap[h] || h));
  log(lost.length === 0, 'all source links present (after --link-map)', lost.length ? list(lost) : '');
}

// 6. ids and data-* attributes preserved
if (isInventory && !a['no-ids']) {
  const rid = new Set(R.ids);
  const lostIds = S.ids.filter((i) => !rid.has(i));
  log(lostIds.length === 0, 'all source ids preserved', lostIds.length ? list(lostIds) : '');
  const lostData = Object.entries(S.dataAttrs || {}).filter(([k, v]) => (R.dataAttrs?.[k] || 0) < v).map(([k, v]) => `${k}: ${v} → ${R.dataAttrs?.[k] || 0}`);
  log(lostData.length === 0, 'data-* attributes preserved', lostData.length ? list(lostData) : '');
}

// 7. component counts (informational unless they drop)
if (isInventory && !a['no-counts'] && S.components && R.components) {
  const diff = Object.keys(S.components).filter((k) => S.components[k] !== R.components[k]).map((k) => `${k}: ${S.components[k]} → ${R.components[k]}`);
  if (diff.length) lines.push(`INFO  component counts differ (expected if markup was restructured — check each is deliberate):\n${list(diff, 20)}`);
}

// 8. alt texts — reported, not failed (alt changes when images are replaced)
if (isInventory) {
  const sAlt = S.attrs.filter((x) => x.kind === 'alt').map((x) => x.t), rAlt = R.attrs.filter((x) => x.kind === 'alt').map((x) => x.t);
  const emptyAlt = (R.images || []).filter((i) => i.tag === 'img' && (i.alt === undefined)).length;
  lines.push(`INFO  alt texts: source ${sAlt.length}, result ${rAlt.length}${emptyAlt ? `; ${emptyAlt} <img> without alt attribute` : ''}`);
}

const report = lines.join('\n');
console.log(report);
console.log(fails ? `\n${fails} check(s) FAILED` : '\nALL CHECKS PASSED');
if (a.report) fs.writeFileSync(a.report, '```\n' + report + '\n```\n');
process.exit(fails ? 1 : 0);
