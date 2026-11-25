"""PDF → raw material for content.json.

    python pdf_extract.py source/deck.pdf [--out reference] [--zoom 2]

Writes:
  <out>/pdf-pages/page-NN.png   renders — THE reference: when extracted text disagrees with the render, the render wins
  <out>/pdf-lines.json          lines rebuilt from glyph geometry, with size / weight / colour / bbox per line
  <out>/pdf-spans.json          raw spans as the PDF stores them (for debugging)
  <out>/pdf-images/             embedded raster images (alpha merged), p<page>-<n>.<ext>
  <out>/pdf-report.md           pages, fonts, images, links, and the lines that look broken

Why lines are rebuilt from glyphs: decks exported from Chrome/Keynote/Figma often position every glyph
separately; the PDF's own spaces are missing in tight-tracked headlines ("Verifiedin seconds.Onthe")
and big numbers split into pieces interleaved with their labels. Gaps between glyphs are measured instead.
Needs: pip install pymupdf
"""
import json
import re
import sys
from pathlib import Path

try:
    import pymupdf as fitz
except ImportError:
    try:
        import fitz
    except ImportError:
        sys.exit('PyMuPDF missing: pip install pymupdf')

args = sys.argv[1:]
if not args:
    sys.exit(__doc__)
src = Path(args[0])
opt = {args[i][2:]: args[i + 1] for i in range(1, len(args) - 1) if args[i].startswith('--')}
out = Path(opt.get('out', 'reference'))
zoom = float(opt.get('zoom', 2))
(out / 'pdf-pages').mkdir(parents=True, exist_ok=True)
(out / 'pdf-images').mkdir(parents=True, exist_ok=True)

doc = fitz.open(src)
hexc = lambda c: '#%06x' % c if isinstance(c, int) else None
lines_out, spans_out, images_out, links_out, fonts = [], [], [], [], {}
suspicious = []
GLUED = re.compile(r'[a-z][A-Z]|[a-z]{3,}\.[A-Z][a-z]|[a-z],[A-Za-z]|\b\w{16,}\b')


def rebuild(line):
    """Text of a line from glyph positions: a space wherever the gap is wider than ~0.18 em."""
    chars = [c for s in line['spans'] for c in s['chars']]
    if not chars:
        return ''
    out_s, prev = '', None
    for c in chars:
        if prev is not None:
            size = max(c.get('size', 0) or 0, 1)
            gap = c['bbox'][0] - prev['bbox'][2]
            if gap > 0.18 * size and not out_s.endswith(' ') and c['c'] != ' ':
                out_s += ' '
        out_s += c['c']
        prev = c
    return re.sub(r'\s+', ' ', out_s).strip()


for pno, page in enumerate(doc, start=1):
    page.get_pixmap(matrix=fitz.Matrix(zoom, zoom)).save(out / 'pdf-pages' / f'page-{pno:02d}.png')
    raw = page.get_text('rawdict')
    for b in raw['blocks']:
        if b.get('type') != 0:
            continue
        for ln in b['lines']:
            for s in ln['spans']:
                for c in s['chars']:
                    c['size'] = s['size']
            text_geo = rebuild(ln)
            text_pdf = re.sub(r'\s+', ' ', ''.join(c['c'] for s in ln['spans'] for c in s['chars'])).strip()
            if not text_geo:
                continue
            s0 = max(ln['spans'], key=lambda s: len(s['chars']))
            rec = {
                'page': pno, 'text': text_geo, 'size': round(s0['size'], 1),
                'bold': bool(s0['flags'] & 16) or bool(re.search(r'bold|black|heavy|semibold', s0['font'], re.I)),
                'font': s0['font'], 'color': hexc(s0['color']), 'bbox': [round(v, 1) for v in ln['bbox']],
            }
            if text_pdf.replace(' ', '') == text_geo.replace(' ', '') and text_pdf != text_geo:
                rec['pdfText'] = text_pdf          # the PDF's own spacing differs — keep both
            lines_out.append(rec)
            for s in ln['spans']:
                fonts[s['font']] = fonts.get(s['font'], 0) + len(s['chars'])
                spans_out.append({'page': pno, 'text': ''.join(c['c'] for c in s['chars']), 'size': round(s['size'], 1), 'font': s['font'], 'color': hexc(s['color']), 'bbox': [round(v, 1) for v in s['bbox']]})
            if GLUED.search(text_geo) or (rec['size'] >= 28 and len(text_geo) <= 2):
                suspicious.append(rec)
    for n, img in enumerate(page.get_images(full=True), start=1):
        xref, smask = img[0], img[1]
        try:
            pix = fitz.Pixmap(doc, xref)
            if smask:
                pix = fitz.Pixmap(pix, fitz.Pixmap(doc, smask))
            if pix.n - pix.alpha >= 4:
                pix = fitz.Pixmap(fitz.csRGB, pix)
            ext = 'png' if pix.alpha or smask else 'jpg'
            name = f'p{pno:02d}-{n}.{ext}'
            pix.save(out / 'pdf-images' / name)
            rects = [[round(v, 1) for v in r] for r in page.get_image_rects(xref)]
            images_out.append({'page': pno, 'file': name, 'size': [pix.width, pix.height], 'alpha': bool(pix.alpha), 'placedAt': rects})
        except Exception as e:  # noqa: BLE001
            images_out.append({'page': pno, 'xref': xref, 'error': str(e)})
    for l in page.get_links():
        links_out.append({'page': pno, 'uri': l.get('uri'), 'toPage': l.get('page'), 'bbox': [round(v, 1) for v in l['from']]})

(out / 'pdf-lines.json').write_text(json.dumps(lines_out, ensure_ascii=False, indent=1), encoding='utf-8')
(out / 'pdf-spans.json').write_text(json.dumps(spans_out, ensure_ascii=False, indent=1), encoding='utf-8')

w, h = doc[0].rect.width, doc[0].rect.height
# page classes: text / image-only (outlined lettering, photos, collages) / blank
img_pages = {i['page'] for i in images_out}
no_text = [i + 1 for i, p in enumerate(doc) if not p.get_text().strip()]
blank = [n for n in no_text if n not in img_pages and not doc[n - 1].get_drawings()]
image_only = [n for n in no_text if n not in blank]
# scripts per page: RTL text layers (Arabic, Hebrew, Persian…) are often unreliable
RTL = re.compile(r'[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]')
rtl_pages = sorted({l['page'] for l in lines_out if RTL.search(l['text'])})
rtl_fonts = sorted({l['font'] for l in lines_out if RTL.search(l['text'])})
presentation_forms = sum(1 for l in lines_out if re.search(r'[\uFB50-\uFDFF\uFE70-\uFEFF]', l['text']))
type3 = [f for f in fonts if 'Type3' in f or f.startswith('T3')]
rep = [f'# PDF extraction — {src.name}', '',
       f'{len(doc)} pages, {w:.0f}×{h:.0f} pt ({"slides 16:9" if abs(w / h - 16 / 9) < 0.05 else "document"}). Metadata title: {doc.metadata.get("title") or "—"} (not content).', '',
       f'Text lines: {len(lines_out)} · images: {len(images_out)} · links: {len(links_out)}', '']
if blank:
    rep += [f'Blank pages: {blank}.', '']
if image_only:
    rep += [f'**No text layer on pages {image_only}** — outlined lettering, photos or scans. Any words there (cover titles, lettering inside collages) '
            'are transcribed from the render; words baked into an image go to its alt, not to page text.', '']
if rtl_pages:
    rep += [f'**Right-to-left script on pages {rtl_pages}** (fonts: {", ".join(rtl_fonts)}). Treat this text layer as unreliable: '
            'ligature pairs may be swapped, shadda/ligatures duplicated, display fonts may come out as garbage'
            + (f', {presentation_forms} lines use presentation forms' if presentation_forms else '') + '. '
            'Transcribe from high-zoom renders and check each page with `pdf_letters.py` (same letters, any order). '
            'Kashida (U+0640) is print justification, not text. Mark the result for a native-speaker proofread.', '']
if len(doc) >= 8 and rtl_pages and len(rtl_pages) < len(doc) - len(no_text):
    rep += ['Mixed LTR/RTL document: check whether it is a bilingual booklet read from both ends (second half = mirror of the first). '
            'Then build one content tree with both languages per block, not two separate documents.', '']
rep += ['## Fonts (by glyph count)', ''] + [f'- {f}: {n}' for f, n in sorted(fonts.items(), key=lambda x: -x[1])[:15]] + ['']
if type3:
    rep += ['Type3 fonts present: glyphs are drawn individually — expect broken spacing; trust pdf-lines.json + renders.', '']
rep += ['## Lines that need a look (glued words, tiny fragments of big text)', '',
        'Compare each with its page render and repair in content.json; record before → after in the phase report.', '']
rep += [f'- p{s["page"]} · {s["size"]}pt · `{s["text"][:120]}`' + (f'  (PDF spacing: `{s["pdfText"][:80]}`)' if 'pdfText' in s else '') for s in suspicious[:120]]
rep += ['', '## Images', ''] + [f'- p{i["page"]} {i.get("file", "?")} {i.get("size", "")}' + (' alpha' if i.get('alpha') else '') + (f' ERROR {i["error"]}' if 'error' in i else '') for i in images_out]
rep += ['', '## Links / annotations', ''] + ([f'- p{l["page"]} → {l["uri"] or ("page " + str(l["toPage"] + 1))}' for l in links_out] or ['none (interactive layer, if any, lives elsewhere — e.g. the RELAYTO version of the deck)'])
(out / 'pdf-report.md').write_text('\n'.join(rep), encoding='utf-8')
print(f'{len(doc)} pages → {out}/pdf-pages, {len(lines_out)} lines, {len(images_out)} images, {len(links_out)} links; '
      f'{len(suspicious)} lines flagged → {out}/pdf-report.md')
