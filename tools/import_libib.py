"""Import Jemma's Libib exports (one CSV per collection) into data/.

    python -X utf8 tools/import_libib.py imports/libib-2026-10-18            report only, changes nothing
    python -X utf8 tools/import_libib.py imports/libib-2026-10-18 --apply    writes data/books.json and data/to-buy.json

How the collections are read (18 Oct 2026):
- The genre collections (data/shelves.json, "libib") are the library: one book per row, each on its shelf.
- "Jemma's Library" was the old catch-all before she split everything into genres. A row there that matches a genre book
  (same ISBN-13, or same title and surname) is the same book and is skipped; the rest go on the "unsorted" shelf.
- "Books to Buy" is her wishlist (data/to-buy.json).
Same-title books on the shelves are kept apart: they are usually different editions she owns on purpose (see TODO.md).
"""
import csv, glob, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')
CATCH_ALL, WISHLIST = "Jemma's Library", 'Books to Buy'


def norm(s):
    """Loose key for matching titles: bracketed bits, punctuation and case don't count."""
    return re.sub(r'[^a-z0-9]', '', re.sub(r'\(.*?\)', '', s.lower()))


def creators(s):
    """'Enid Blyton, Eileen Soper (Illustrator)' -> [{'name': 'Enid Blyton'}, {'name': 'Eileen Soper', 'role': 'Illustrator'}]"""
    out = []
    for part in re.split(r',\s*(?![^()]*\))', s or ''):
        part = part.strip()
        if not part:
            continue
        m = re.match(r'^(.*?)\s*\(([^)]*)\)$', part)
        out.append({'name': m.group(1).strip(), 'role': m.group(2).strip()} if m else {'name': part})
    return out


def keys(r):
    k = ['t:' + norm(r['title']) + '|' + norm(r['last_name'])]
    if r['ean_isbn13'].strip():
        k.append('isbn:' + r['ean_isbn13'].strip())
    return k


def book(r, shelf):
    b = {'id': r['id'], 'title': r['title'].strip(), 'authors': creators(r['creators']), 'surname': r['last_name'].strip(), 'shelf': shelf,
         'isbn13': r['ean_isbn13'].strip(), 'isbn10': r['upc_isbn10'].strip(), 'publisher': r['publisher'].strip(),
         'published': r['publish_date'].strip(), 'pages': int(r['length']) if r['length'].strip().isdigit() else None,
         'description': r['description'].strip(), 'added': r['added'].strip(), 'copies': int(r['copies'] or 1)}
    status = r['status'].strip().lower()
    if status in ('in progress', 'completed', 'abandoned'):
        b['status'] = {'in progress': 'reading', 'completed': 'read', 'abandoned': 'stopped'}[status]
    for f in ('began', 'completed', 'rating', 'review', 'notes', 'tags'):
        if r[f].strip():
            b[f] = r[f].strip()
    return {k: v for k, v in b.items() if v not in ('', None)}


def main():
    folder = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('--') else None
    if not folder:
        sys.exit('Give the folder of Libib CSVs, e.g. imports/libib-2026-10-18')
    shelves = json.load(open(os.path.join(DATA, 'shelves.json'), encoding='utf-8'))
    shelf_of = {s['libib']: s['id'] for s in shelves if s['libib']}
    rows = []
    for f in sorted(glob.glob(os.path.join(folder, '*.csv'))):
        with open(f, encoding='utf-8-sig', newline='') as fh:
            rows += list(csv.DictReader(fh))
    unknown = sorted({r['collection'] for r in rows} - set(shelf_of) - {CATCH_ALL, WISHLIST})
    if unknown:
        sys.exit(f'Collections not in data/shelves.json yet: {unknown}')

    books, seen = [], {}
    for r in rows:
        if r['collection'] in shelf_of:
            b = book(r, shelf_of[r['collection']])
            books.append(b)
            for k in keys(r):
                seen.setdefault(k, b)
    unsorted, merged = [], 0
    for r in rows:
        if r['collection'] != CATCH_ALL:
            continue
        match = next((seen[k] for k in keys(r) if k in seen), None)
        if match:
            merged += 1
            extra = book(r, match['shelf'])   # anything she only filled in on the old copy (e.g. "In progress")
            for f in ('status', 'began', 'completed', 'rating', 'review', 'notes', 'tags'):
                if f in extra and f not in match:
                    match[f] = extra[f]
        else:
            unsorted.append(book(r, 'unsorted'))
    books += unsorted

    owned = {}
    for b in books:
        owned.setdefault('t:' + norm(b['title']) + '|' + norm(b.get('surname', '')), []).append(b['id'])
    wish = []
    for r in rows:
        if r['collection'] != WISHLIST:
            continue
        w = book(r, None)
        w.pop('shelf', None)
        maybe = owned.get(keys(r)[0], [])
        if maybe:
            w['maybeOwned'] = maybe
        wish.append(w)

    print(f'{len(rows)} rows read: {len(books)} books on shelves ({len(unsorted)} not on a shelf yet), '
          f'{merged} old Jemma’s Library copies matched to a shelf, {len(wish)} on the to-buy list.')
    for b in unsorted:
        print('  not on a shelf:', b['title'])
    for w in wish:
        if 'maybeOwned' in w:
            print('  to buy but maybe owned:', w['title'])
    if '--apply' in sys.argv:
        books.sort(key=lambda b: ([s['id'] for s in shelves].index(b['shelf']), b['title'].lower()))
        for name, obj in (('books.json', books), ('to-buy.json', wish)):
            with open(os.path.join(DATA, name), 'w', encoding='utf-8', newline='\n') as fh:
                json.dump(obj, fh, ensure_ascii=False, indent=1)
                fh.write('\n')
        print('Written data/books.json and data/to-buy.json.')
    else:
        print('Report only. Add --apply to write data/.')


if __name__ == '__main__':
    main()
