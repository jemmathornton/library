"""Build the site's data: data/*.json -> site/js/data.js, then stamp fingerprints on the code files in site/index.html
(so a browser never shows an old copy after a change).

    python -X utf8 tools/build.py
"""
import hashlib, json, os, re, time
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA, SITE = os.path.join(ROOT, 'data'), os.path.join(ROOT, 'site')


TMP = f'.{os.getpid()}.tmp'   # each build its own temporary file (review, 2 Nov: two builds at once wrote into the same one)


def swap(tmp, path):
    """Put the finished file in place; Windows refuses while the server is sending it, so try again for a moment."""
    for n in range(10):
        try:
            os.replace(tmp, path)
            return
        except PermissionError:
            if n == 9:
                raise
            time.sleep(.2)



def cloth(path):
    """The colour of a book's cloth or jacket for its spine (her yes, 6 Nov: the main colour, not the average): the
    commonest colour family on the cover (inside a small margin, leaving out paper-white and deep shadow), as #rrggbb."""
    from PIL import Image
    im = Image.open(path).convert('RGB')
    w, h = im.size
    px = im.crop((int(w * .06), int(h * .06), int(w * .94), int(h * .94))).resize((40, 60)).getdata()
    bins = {}
    for r, g, b in px:
        if (r + g + b) / 3 > 225 or max(r, g, b) < 28:
            continue
        k = (r >> 5, g >> 5, b >> 5)
        n, sr, sg, sb = bins.get(k, (0, 0, 0, 0))
        bins[k] = (n + 1, sr + r, sg + g, sb + b)
    if not bins:
        r, g, b = im.resize((1, 1), Image.BOX).getpixel((0, 0))
        return f'#{r:02x}{g:02x}{b:02x}'
    n, sr, sg, sb = max(bins.values())
    return f'#{sr // n:02x}{sg // n:02x}{sb // n:02x}'

def load(name, default=None):
    p = os.path.join(DATA, name)
    return json.load(open(p, encoding='utf-8')) if os.path.exists(p) else default


def shape(path):
    """A picture's height divided by its width (Pillow reads only the header)."""
    from PIL import Image
    with Image.open(path) as im:
        return round(im.height / im.width, 3)


def fix_names(books, fixes):
    """Libib's author names tidied (data/name-fixes.json); the surname the shelves file by follows the tidied first author."""
    for b in books:
        b['title'] = fixes.get('titles', {}).get(b['title'], b['title'])
        authors = fixes['books'].get(b['title']) or b.get('authors') or []
        out, seen = [], set()
        for a in authors:
            name = fixes['names'].get(a['name'], a['name'])
            if name in fixes['remove'] or name in seen:
                continue
            seen.add(name)
            a = {**a, 'name': name}
            if a.get('role'):
                a['role'] = fixes['roles'].get(a['role'], a['role'])
            out.append(a)
        if out or b.get('authors'):
            b['authors'] = out
        lead = next((a['name'] for a in out if not a.get('role')), out[0]['name'] if out else '')
        if lead:
            b['surname'] = fixes['surnames'].get(lead, lead.split()[-1])


def build():
    covers = load('covers.json', {})
    # books.json is the Libib import (a re-import overwrites it); added.json holds books added on the site since
    books, wish = load('books.json') + load('added.json', []), load('to-buy.json', [])
    details = load('details.json', {})   # Open Library's description, pages, publisher: only where the book has none
    for b in books:
        for f, v in details.get(b['id'], {}).items():
            if not b.get(f):
                b[f] = v
    blurbs, put_right = load('description-fixes.json', {}), load('detail-fixes.json', {})   # replace Libib's seller notes and wrong pages/dates
    for b in books:
        if b['id'] in blurbs:
            b['description'] = blurbs[b['id']]
        b.update(put_right.get(b['id'], {}))
    gone = {x['id'] for x in load('removed.json', [])}   # duplicates she has said aren't real copies
    books = [b for b in books if b['id'] not in gone]
    editions = load('editions.json', {})   # editions Libib doesn't say (her Illumicrate copies)
    for b in books:
        if b['id'] in editions and not b['id'].startswith('_'):
            if editions[b['id']].lower() not in b['title'].lower():
                b['title'] += f" ({editions[b['id']]})"
            b['special'] = editions[b['id']]
    signed = {k: v for k, v in load('signed.json', {}).items() if not k.startswith('_')}   # her signed copies (1 Nov)
    for b in books:
        if signed.get(b['id']) in ('signed', 'to-you'):
            b['signed'] = signed[b['id']]
    condition = {k: v for k, v in load('condition.json', {}).items() if not k.startswith('_')}   # her old books' condition (5 Nov)
    for b in books:
        if condition.get(b['id']):
            b['condition'] = condition[b['id']]
    moves = load('shelf-moves.json', {})   # shelves she chose for books Libib has on no genre shelf
    for b in books:
        b['shelf'] = moves.get(b['id'], b['shelf'])
    # to-buy entries added here (her yes, 1 Nov), kept apart because a Libib re-import rewrites to-buy.json;
    # an entry with "splitFrom" replaces one of her notes ("Famous Five old except ...") with a book of its own
    extra = load('to-buy-added.json', [])
    split = {x['splitFrom'] for x in extra if x.get('splitFrom')}
    wish = [w for w in wish if w['id'] not in split] + extra
    bought = {x['wish'] for x in load('bought.json', [])}   # to-buy books she has since added to a shelf
    wish = [w for w in wish if w['id'] not in bought]
    # old printings to find second-hand go on a list of their own (her ask, 5 Nov)
    old_ids = set(load('to-buy-old.json', {'ids': []}).get('ids', []))
    for w in wish:
        if w['id'] in old_ids or re.search(r'\((old|original paperback)\)', w['title'], re.I):
            w['old'] = True
    fixes = load('name-fixes.json', {'names': {}, 'remove': [], 'roles': {}, 'books': {}, 'surnames': {}})
    fix_names(books + wish, fixes)
    sg = load('storygraph.json', {'books': []})
    fixes_r = {k: v for k, v in load('reading-fixes.json', {}).items() if not k.startswith('_')}   # statuses she has corrected
    for e in sg['books']:
        e['status'] = fixes_r.get(e['title'], e['status'])
    no_cover = {x['id'] for x in load('no-cover.json', {'books': []})['books']}   # old books: no modern reprint covers
    trial = {k: v for k, v in load('covers-trial.json', {}).items() if not k.startswith('_')}   # proposed covers, shown only with the switch on (28 Oct)
    for b in books + wish + [e for e in sg['books'] if 'books' not in e]:
        isbn = b.get('isbn13', '')
        # a cover is found by ISBN, or by title for books without one (stored as "id-<id>", tools/find_covers.py)
        # (books read elsewhere have no id: theirs is "sg-<title>")
        own = 'id-' + str(b['id']) if b.get('id') else 'sg-' + re.sub(r'[^a-z0-9]+', '-', b.get('title', '').lower()).strip('-')
        for k in (isbn, own):
            pic = os.path.join(SITE, 'covers-trial', k + '.jpg')
            if k in trial and os.path.exists(pic):
                b['coverTrial'] = f"covers-trial/{k}.jpg?v={hashlib.md5(open(pic, 'rb').read()).hexdigest()[:8]}"
                b['coverTrialWhy'] = trial[k]['reason']
                b['coverTrialRatio'] = shape(pic)
                break
        if b.get('id') in no_cover:
            continue
        key = isbn if isbn and (covers.get(isbn) or os.path.exists(os.path.join(SITE, 'covers', isbn + '.jpg'))) else own
        local = os.path.join(SITE, 'covers', key + '.jpg')
        if os.path.exists(local):   # the copy in site/covers (tools/copy_covers.py), fingerprinted so a new copy shows at once
            b['cover'] = f"covers/{key}.jpg?v={hashlib.md5(open(local, 'rb').read()).hexdigest()[:8]}"
            b['coverRatio'] = shape(local)   # height / width: the site shows the whole cover at its own shape (30 Oct)
            if b.get('shelf') == 'old-book-collection':   # the old books' ledger shows the cloth colour (5 Nov)
                b['cloth'] = cloth(local)
        elif covers.get(key):
            b['cover'] = covers[key]['src']
    data = {'built': date.today().isoformat(), 'shelves': load('shelves.json'), 'books': books, 'toBuy': wish, 'storygraph': sg,
            'series': load('series.json', {'series': []})['series'],
            'elsewhereShelves': {k: v for k, v in load('elsewhere-shelves.json', {}).items() if not k.startswith('_')},
            'oldKinds': {k: v for k, v in load('old-books-kinds.json', {}).items() if not k.startswith('_')}}
    out = os.path.join(SITE, 'js', 'data.js')
    with open(out + TMP, 'w', encoding='utf-8', newline='\n') as fh:   # written in full first: a crash never leaves half a file
        fh.write('// Generated by tools/build.py from data/. Never edit by hand.\nconst DATA = ')
        json.dump(data, fh, ensure_ascii=False, separators=(',', ':'))
        fh.write(';\n')
    swap(out + TMP, out)
    print(f"site/js/data.js: {len(books)} books, {len(wish)} to buy, {sum(1 for b in books if 'cover' in b)} with covers "
          f"({sum(1 for b in books if b.get('cover', '').startswith('covers/'))} copied into site/covers)")


def stamp_page():
    page_path = os.path.join(SITE, 'index.html')
    page = open(page_path, encoding='utf-8').read()

    def fp(m):
        f = os.path.join(SITE, m.group(2))
        return f'{m.group(1)}{m.group(2)}?v={hashlib.md5(open(f, "rb").read()).hexdigest()[:8]}"' if os.path.exists(f) else m.group(0)
    new = re.sub(r'((?:href|src)=")((?:js/[\w.-]+\.js)|site\.css)(?:\?v=\w+)?"', fp, page)
    if new != page:
        with open(page_path + TMP, 'w', encoding='utf-8', newline='\n') as fh:
            fh.write(new)
        swap(page_path + TMP, page_path)


if __name__ == '__main__':
    build()
    stamp_page()
