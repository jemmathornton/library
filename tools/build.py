"""Build the site's data: data/*.json -> site/js/data.js, then stamp fingerprints on the code files in site/index.html
(so a browser never shows an old copy after a change).

    python -X utf8 tools/build.py
"""
import hashlib, json, os, re
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA, SITE = os.path.join(ROOT, 'data'), os.path.join(ROOT, 'site')


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
        elif covers.get(key):
            b['cover'] = covers[key]['src']
    data = {'built': date.today().isoformat(), 'shelves': load('shelves.json'), 'books': books, 'toBuy': wish, 'storygraph': sg,
            'series': load('series.json', {'series': []})['series'],
            'elsewhereShelves': {k: v for k, v in load('elsewhere-shelves.json', {}).items() if not k.startswith('_')}}
    out = os.path.join(SITE, 'js', 'data.js')
    with open(out + '.tmp', 'w', encoding='utf-8', newline='\n') as fh:   # written in full first: a crash never leaves half a file
        fh.write('// Generated by tools/build.py from data/. Never edit by hand.\nconst DATA = ')
        json.dump(data, fh, ensure_ascii=False, separators=(',', ':'))
        fh.write(';\n')
    os.replace(out + '.tmp', out)
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
        with open(page_path + '.tmp', 'w', encoding='utf-8', newline='\n') as fh:
            fh.write(new)
        os.replace(page_path + '.tmp', page_path)


if __name__ == '__main__':
    build()
    stamp_page()
