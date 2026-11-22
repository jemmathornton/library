"""Cover shapes check (22 Nov, her note: “display TJ Klune books should all be same size and they aren't”).
Run: python -B -X utf8 tools/check_cover_shapes.py   (writes for-jemma/cover-shapes-to-check.md; changes no cover)

Two checks, on the built site/js/data.js and the covers in site/covers:

1. Shapes: books that should share a cover shape (height ÷ width, `coverRatio`) but don't. Groups:
   - the same special edition line by the same author (Illumicrate, FairyLoot, Collector’s, Illustrated, …: the book’s
     `special`, or a title such as “(Illumicrate Edition)”);
   - the same series (data/series.json) from the same publisher;
   - the same author and publisher within a few years (books in a series group, special editions and the old books left out).
   A group is flagged when its shapes differ by more than TOLERANCE; each book more than half that from the group’s usual
   shape (the median) is listed, with the crop that would bring it to the usual shape.
2. Edges: covers with a blank (near-white) margin, or a strip down one side of a very different colour from what is
   next to it (a spine or a page edge in a photo). Cheap checks, so some are the cover’s own design: for her to look at.

Pure functions (edition_line, shape_groups, flag_groups, blank_margins, side_strip) are tested in
tests/unit/test_cover_shapes.py."""
import json, os, re, statistics, sys
import numpy as np
from PIL import Image, ImageStat

ROOT = os.environ.get('LIBRARY_ROOT') or os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, 'site')
OUT = os.path.join(ROOT, 'for-jemma', 'cover-shapes-to-check.md')
TOLERANCE = 0.03     # shapes within 3% count as the same
YEARS = 3            # “within a few years” for the same author and publisher
LINES = ('illumicrate', 'fairyloot', 'owlcrate', 'goldsboro', 'waterstones', 'folio', 'collector', 'illustrated',
         'deluxe', 'anniversary', 'special edition', 'signed edition', 'exclusive')
HOUSES = ('gryffindor', 'hufflepuff', 'ravenclaw', 'slytherin')


def edition_line(book):
    """The special edition line a book belongs to ('illumicrate', 'collector', …), or None for an ordinary copy."""
    text = ' '.join([book.get('special') or '', book.get('title') or '']).lower().replace('’', "'")
    if any(h in text for h in HOUSES) and 'edition' in text:
        return 'house edition'
    for line in LINES:
        if line in text:
            return line
    m = re.search(r'\(([^)]*edition[^)]*)\)', text)
    return m.group(1).strip() if m else None


def publisher_key(p):
    """Publisher names as Libib spells them vary: compare only the main words."""
    words = re.sub(r'[^a-z ]', ' ', (p or '').lower().replace('&', ' ')).split()
    drop = {'ltd', 'llc', 'inc', 'plc', 'limited', 'publishing', 'publishers', 'books', 'book', 'group', 'uk', 'us', 'co',
            'company', 'the', 'and', 'of', 'children', 'childrens', 's', 'press', 'imprint', 'an', 'associates'}
    return ' '.join(w for w in words if w not in drop)


def _norm(t):
    return re.sub(r'[^a-z0-9]+', ' ', (t or '').lower().replace('’', "'").replace("'", '')).strip()


def _year(b):
    m = re.match(r'(\d{4})', b.get('published') or '')
    return int(m.group(1)) if m else None


def shape_groups(books, series=()):
    """[(kind, label, [book, …])]: every group of two or more books with a cover shape that should match."""
    books = [b for b in books if b.get('coverRatio') and b.get('cover')]
    groups, in_series = [], set()
    by_line = {}
    for b in books:
        line = edition_line(b)
        if line:
            by_line.setdefault((b.get('surname') or '', line), []).append(b)
    for (who, line), bs in by_line.items():
        if len(bs) > 1:
            groups.append(('Edition', f'{who}: {line}', bs))
    plain = [b for b in books if not edition_line(b) and b.get('shelf') != 'old-book-collection']
    for s in series:
        titles = {_norm(t) for entry in s['books'] for t in entry.split('|')}
        who = [a.lower() for a in (s.get('author') or '').split('|') if a]
        members = [b for b in plain if _norm(b.get('title')) in titles and (not who or (b.get('surname') or '').lower() in who)]
        by_pub = {}
        for b in members:
            by_pub.setdefault(publisher_key(b.get('publisher')), []).append(b)
        for pub, bs in by_pub.items():
            if len(bs) > 1 and pub:
                groups.append(('Series', f'{s["name"]} ({bs[0].get("publisher")})', bs))
                in_series.update(id(b) for b in bs)
    by_author = {}
    for b in plain:
        pub = publisher_key(b.get('publisher'))
        if id(b) in in_series or not pub or not b.get('surname') or _year(b) is None:
            continue
        by_author.setdefault((b['surname'], pub), []).append(b)
    for (who, pub), bs in by_author.items():
        bs.sort(key=_year)
        run = []
        for b in bs + [None]:
            if b is not None and (not run or _year(b) - _year(run[0]) <= YEARS):
                run.append(b)
                continue
            if len(run) > 1:
                years = f'{_year(run[0])}–{_year(run[-1])}' if _year(run[0]) != _year(run[-1]) else str(_year(run[0]))
                groups.append(('Author and publisher', f'{who}, {run[0].get("publisher")}, {years}', run))
            run = [b] if b is not None else []
    return groups


def flag_groups(groups, tolerance=TOLERANCE):
    """[(kind, label, usual, [(book, ratio), …])] for the groups whose shapes differ by more than the tolerance."""
    out = []
    for kind, label, bs in groups:
        ratios = [b['coverRatio'] for b in bs]
        if max(ratios) / min(ratios) - 1 <= tolerance:
            continue
        usual = statistics.median(ratios)
        odd = [(b, b['coverRatio']) for b in bs if abs(b['coverRatio'] / usual - 1) > tolerance / 2]
        if odd:
            out.append((kind, label, usual, odd))
    return out


def crop_advice(ratio, usual, size=None):
    """Plain words for the crop that brings a cover to the usual shape (never a stretch)."""
    off = ratio / usual - 1
    if abs(off) > 0.12:
        return 'Very different shape: check it is a picture of her edition'
    if ratio > usual:
        cut = f' (about {size[1] - round(size[0] * usual)}px)' if size else ''
        return f'Too tall: crop the height{cut}, from a margin or excess at the top or bottom'
    cut = f' (about {size[0] - round(size[1] / usual)}px)' if size else ''
    return f'Too wide: crop the width{cut}, from a margin, spine or excess at a side'


def _band(im, side, k):
    w, h = im.size
    return {'left': (k, 0, k + 1, h), 'right': (w - 1 - k, 0, w - k, h),
            'top': (0, k, w, k + 1), 'bottom': (0, h - 1 - k, w, h - k)}[side]


def blank_margins(im, white=238, spread=10):
    """Sides with a near-white, even margin that stops sharply: {side: width in pixels of `im`}."""
    im = im.convert('RGB')
    found = {}
    for side in ('left', 'right', 'top', 'bottom'):
        depth = (im.width if side in ('left', 'right') else im.height)
        run = 0
        while run < depth * 0.15:
            s = ImageStat.Stat(im.crop(_band(im, side, run)))
            if min(s.mean) >= white and max(s.stddev) <= spread:
                run += 1
            else:
                break
        if run >= 2 and run < depth * 0.15:
            inner = ImageStat.Stat(im.crop(_band(im, side, run + 1)))
            if sum(inner.mean) / 3 < white - 25:   # the art starts clearly darker: a margin, not a pale design
                found[side] = run
    return found


def side_strip(im, most=0.05, jump=40.0, rows=0.85):
    """Sides (left/right) with a straight edge running down (almost) the whole height within `most` of the width from
    the side, the colour changing sharply across it in at least `rows` of the rows: a spine, a page edge or a table in
    a photo (or a printed border). {side: width in pixels of `im` of the strip outside that edge}."""
    a = np.asarray(im.convert('RGB')).astype(float)
    if a.shape[1] < 12:
        return {}
    found = {}
    for side in ('left', 'right'):
        s = a if side == 'left' else a[:, ::-1]
        best = None
        for k in range(3, max(4, int(s.shape[1] * most)) + 1):   # 3+: a 1–2px line is usually the scan’s own edge
            out, inn = s[:, max(0, k - 2):k].mean(axis=1), s[:, k:k + 2].mean(axis=1)
            share = (np.sqrt(((out - inn) ** 2).sum(axis=1)) > jump).mean()
            if share >= rows and (best is None or share > best[1]):
                best = (k, share)
        if best:
            found[side] = best[0]
    return found


def edge_findings(path):
    """Words for what the edge checks see on a cover file, or []."""
    try:
        im = Image.open(path)
        im.load()
    except Exception:
        return []
    scale = min(1.0, 400 / im.height)
    small = im.convert('RGB').resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))))
    said = []
    for side, n in blank_margins(small).items():
        said.append(f'white margin, {side} (about {round(n / scale)}px)')
    for side, n in side_strip(small).items():
        said.append(f'strip of another colour down the {side} (about {round(n / scale)}px)')
    return said


def load_built():
    text = open(os.path.join(SITE, 'js', 'data.js'), encoding='utf-8').read()
    return json.loads(text.split('const DATA = ', 1)[1].rsplit(';', 1)[0])


def cover_path(b):
    c = (b.get('cover') or '').split('?')[0]
    return os.path.join(SITE, c) if c and not c.startswith('http') else None


def title(b):
    return (b.get('displayTitle') or b.get('title') or '').replace("'", '’')


def cell(t):
    return str(t).replace('|', '/').replace("'", '’')


def main():
    D = load_built()
    shelves = {s['id']: s['name'] for s in D['shelves']}
    books = D['books']
    flagged = flag_groups(shape_groups(books, D.get('series', [])))
    rows = []
    for kind, label, usual, odd in flagged:
        for b, r in odd:
            p = cover_path(b)
            size = Image.open(p).size if p and os.path.exists(p) else None
            rows.append((abs(r / usual - 1), kind, label, b, r, usual, crop_advice(r, usual, size)))
    rows.sort(key=lambda x: -x[0])
    edges = []
    for b in books:
        p = cover_path(b)
        if p and os.path.exists(p) and b.get('shelf') != 'old-book-collection':
            said = edge_findings(p)
            if said:
                edges.append((b, said))
    lines = ['# Cover shapes to check', '',
             f'Made by `tools/check_cover_shapes.py` on {D.get("built", "")}. Nothing has been changed: '
             'tick the ones you’d like fixed. Every crop keeps the original in `imports/cover-originals/`; nothing is stretched.', '',
             f'## Shapes that don’t match their group ({len(rows)} books in {len(flagged)} groups)', '',
             'Shape is height ÷ width. Groups: the same special edition line by the same author, the same series from the '
             f'same publisher, and the same author and publisher within {YEARS} years. A group is listed when its shapes differ by '
             f'more than {round(TOLERANCE * 100)}%. Some of these are different formats (hardback and paperback) and are right as they are.', '',
             '| Book | Shelf | Shape | Group’s usual | Group | Suggested fix |', '|---|---|---|---|---|---|']
    for _, kind, label, b, r, usual, fix in rows:
        lines.append(f'| {cell(title(b))} | {cell(shelves.get(b.get("shelf"), b.get("shelf")))} | {r:.3f} | {usual:.3f} | '
                     f'{cell(kind)}: {cell(label)} | {cell(fix)} |')
    lines += ['', f'## Edges to look at ({len(edges)} covers)', '',
              'A near-white margin, or a strip of another colour down one side (a spine or page edge in a photo). '
              'Cheap checks, so some will be the cover’s own design.', '',
              '| Book | Shelf | Shape | What the check saw | Suggested fix |', '|---|---|---|---|---|']
    for b, said in edges:
        lines.append(f'| {cell(title(b))} | {cell(shelves.get(b.get("shelf"), b.get("shelf")))} | {b.get("coverRatio", 0):.3f} | '
                     f'{cell("; ".join(said))} | Crop it off if it isn’t part of the cover |')
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write('\n'.join(lines) + '\n')
    print(f'{len(rows)} books in {len(flagged)} shape groups; {len(edges)} covers with edges to look at. '
          f'Written to {os.path.relpath(OUT, ROOT)}')


if __name__ == '__main__':
    sys.exit(main())
