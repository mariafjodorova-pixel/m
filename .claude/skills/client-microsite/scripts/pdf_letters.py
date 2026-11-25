"""Checks a transcription against the PDF text layer letter by letter — order ignored.

    python pdf_letters.py source/deck.pdf transcription.json [--pages 16-26] [--skip-fonts Manchette] [--exclude "\\|"]

transcription.json: {"16": "full text of page 16 as transcribed", "18": "...", ...}
                    (a list of strings per page is fine too)

Why: in some PDFs (Arabic in many Arabic fonts, Type3 exports, heavy ligatures) the text layer keeps every
letter but in the wrong order, so the text cannot be copied — yet it is still evidence. If the multiset of
letters on a page equals the multiset in your transcription, nothing was lost or invented; only the order
(read from the render) differs. Spaces, punctuation, digits, diacritics (harakat), kashida and compatibility
forms are normalised away. Lines set in fonts listed in --skip-fonts (display faces whose text layer is
garbage) are excluded from the PDF side — check those by eye against the render and say so in the report;
with --skip-fonts only LOST letters fail the page (your transcription legitimately has more: those lines).
--exclude REGEX drops PDF lines such as running footers ("27/26 | 13") that are not part of the content.
Needs: pip install pymupdf
"""
import json
import re
import sys
import unicodedata
from collections import Counter

try:
    import pymupdf as fitz
except ImportError:
    import fitz

args = sys.argv[1:]
if len(args) < 2:
    sys.exit(__doc__)
pdf, tr_path = args[0], args[1]
opt = {args[i][2:]: args[i + 1] for i in range(2, len(args) - 1) if args[i].startswith('--')}
skip_fonts = [f for f in opt.get('skip-fonts', '').split(',') if f]
exclude = re.compile(opt['exclude']) if 'exclude' in opt else None
pages = None
if 'pages' in opt:
    a, _, b = opt['pages'].partition('-')
    pages = set(range(int(a), int(b or a) + 1))

DIAC = re.compile(r'[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640\u0300-\u036F]')   # harakat, kashida, combining marks


def letters(t):
    t = unicodedata.normalize('NFKC', t)          # presentation forms → base letters
    t = DIAC.sub('', t)
    return Counter(ch for ch in t if unicodedata.category(ch).startswith('L'))


tr = json.load(open(tr_path, encoding='utf-8'))
doc = fitz.open(pdf)
bad = 0
for key in sorted(tr, key=lambda k: int(k)):
    n = int(key)
    if pages and n not in pages:
        continue
    text = tr[key] if isinstance(tr[key], str) else ' '.join(tr[key])
    src = ''
    for b in doc[n - 1].get_text('dict')['blocks']:
        for ln in b.get('lines', []):
            line = ''.join(sp['text'] for sp in ln['spans'] if not any(f.lower() in sp['font'].lower() for f in skip_fonts))
            if exclude and exclude.search(''.join(sp['text'] for sp in ln['spans'])):
                continue
            src += line + ' '
    a, b = letters(src), letters(text)
    missing, extra = a - b, b - a
    ok = not missing and (not extra or bool(skip_fonts))
    bad += not ok
    fmt = lambda c: ' '.join(f'{ch}×{k}' for ch, k in c.most_common(12))
    print(f'p{n:>3}  {"OK  " if ok else "DIFF"}  {sum(a.values())} letters in PDF, {sum(b.values())} in transcription'
          + ('' if ok and not extra else f'\n      missing from transcription: {fmt(missing) or "—"}\n      not in the PDF{" (skipped fonts / footers — check by eye)" if skip_fonts else ""}: {fmt(extra) or "—"}'))
print('\nall pages match' if not bad else f'\n{bad} page(s) differ — re-read those lines on the render')
sys.exit(1 if bad else 0)
