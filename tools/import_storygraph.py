"""Import Jemma's StoryGraph export (Manage Account > Export StoryGraph Library, a CSV) as her reading record.

    python -X utf8 tools/import_storygraph.py <export.csv>            report only, changes nothing
    python -X utf8 tools/import_storygraph.py <export.csv> --matches  the report plus every match, to check them
    python -X utf8 tools/import_storygraph.py <export.csv> --apply    copies the CSV into imports/ and writes data/storygraph.json

StoryGraph is where she tracks her reading (18 Oct), so it is the reading record for every book it knows: status, dates,
stars, review, moods. Each StoryGraph book is matched to a book on her shelves by ISBN (10 or 13), then by title and
surname, then by title alone when only one book has it; a match covers every copy she owns of that book (reading is
about the book, not the edition). Books with no match (ebooks, library books, ones not owned) are kept too; the site
lists them as read elsewhere. The export is the whole library every time, so a new import replaces the old.
"""
import csv, html, json, os, re, shutil, sys
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')
STATUS = {'read': 'read', 'currently-reading': 'reading', 'to-read': 'to-read', 'did-not-finish': 'stopped', 'paused': 'paused'}


def norm(s):
    return re.sub(r'[^a-z0-9]', '', re.sub(r'\(.*?\)|\[.*?\]', '', (s or '').lower().replace('&', ' and ')))


def tkey(s):
    """A title for matching: as norm(), with doubled letters made single, so British and US spellings meet (Traveller/Traveler)."""
    return re.sub(r'(.)\1', r'\1', norm(s))


def short_title(s):
    """'Harry Potter and the Goblet of Fire: 4/7' and '... (Harry Potter 4)' -> 'harypoterandthegobletofire';
    a leading series number goes ('09: The Sixth Form at St Clare's' -> 'thesixthformatstclares')."""
    s = re.sub(r'^\s*\d+\s*[:.]\s*', '', re.sub(r'\(.*?\)', '', s or ''))
    return tkey(re.split(r':\s', s)[0])


def after_colon(s):
    """'Comic Relief: Quidditch Through the Ages (...)' -> 'quiditchthroughtheages' (another way the title may be written)."""
    parts = re.split(r':\s', re.sub(r'\(.*?\)', '', s or ''), maxsplit=1)
    return tkey(parts[1]) if len(parts) > 1 else ''


def isbn13(s):
    s = re.sub(r'[^0-9Xx]', '', s or '').upper()
    if len(s) == 13 and s.isdigit():
        return s
    if len(s) == 10:
        core = '978' + s[:9]
        check = (10 - sum((3 if i % 2 else 1) * int(c) for i, c in enumerate(core)) % 10) % 10
        return core + str(check)
    return ''


def col(row, *names):
    """A column by any of its names, ignoring case and punctuation (StoryGraph has renamed some over time)."""
    keys = {norm(k): k for k in row}
    for n in names:
        if norm(n) in keys:
            return (row[keys[norm(n)]] or '').strip()
    return ''


def dates_read(s):
    """'2024/01/02-2024/01/20, 2025/03/01-' -> [['2024-01-02', '2024-01-20'], ['2025-03-01', '']]
    (splitting on the first '-' works because StoryGraph writes dates with '/')."""
    out = []
    for part in re.split(r',\s*', s or ''):
        part = part.strip()
        if not part:
            continue
        ends = [d.strip().replace('/', '-') for d in part.split('-', 1)] if re.match(r'^\d{4}/', part) else [part, '']
        out.append((ends + [''])[:2])
    return out


NL = chr(10)


def review_text(s):
    """StoryGraph reviews are HTML: keep the words and line breaks; spoilers become [spoiler]...[/spoiler] for the site to hide."""
    s = re.sub(r'<br\s*/?>|</p>|</div>', NL, s or '', flags=re.I)
    s = re.sub(r'<[^>]+>', '', s)
    s = html.unescape(s).replace(chr(160), ' ')
    s = re.sub(r'<\s*spoiler\s*>', '[spoiler]', s, flags=re.I)
    s = re.sub(r'<\s*/\s*spoiler\s*>', '[/spoiler]', s, flags=re.I)
    return re.sub(NL + '{3,}', NL * 2, s).strip()


def surname(authors):
    first = re.split(r',\s*', authors or '')[0].strip()
    return norm(first.split()[-1]) if first else ''


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if not args:
        sys.exit('Give the StoryGraph export, e.g. "C:/Users/Jemma/Downloads/<file>.csv"')
    src = args[0]
    with open(src, encoding='utf-8-sig', newline='') as fh:
        rows = list(csv.DictReader(fh))
    if not rows:
        sys.exit('The export is empty.')
    print('Columns:', ', '.join(rows[0].keys()))

    books = json.load(open(os.path.join(DATA, 'books.json'), encoding='utf-8'))
    if os.path.exists(os.path.join(DATA, 'added.json')):   # books added on the site since the Libib import
        books += json.load(open(os.path.join(DATA, 'added.json'), encoding='utf-8'))
    by_isbn, by_ts, by_t = {}, {}, {}
    for b in books:
        for i in (b.get('isbn13'), isbn13(b.get('isbn10', ''))):
            if i:
                by_isbn.setdefault(i, b['id'])
        t = short_title(b.get('displayTitle') or b['title'])
        by_ts.setdefault(t + '|' + norm(b.get('surname', '')), []).append(b['id'])
        for k in (t, after_colon(b.get('displayTitle') or b['title'])):
            if k:
                by_t.setdefault(k, set()).add(b['id'])
    group, key_of = {}, {}   # every copy of the same book: same short title and surname
    for k, ids in by_ts.items():
        for i in ids:
            group[i], key_of[i] = ids, k.split('|')[0]

    links_path = os.path.join(DATA, 'storygraph-links.json')
    links = {k: v for k, v in json.load(open(links_path, encoding='utf-8')).items() if not k.startswith('_')} if os.path.exists(links_path) else {}
    known = {b['id'] for b in books}
    out, how = [], {'by hand': 0, 'isbn': 0, 'title and author': 0, 'title': 0, None: 0}
    for r in rows:
        title, authors = col(r, 'Title'), col(r, 'Authors', 'Author')
        e = {'title': title, 'authors': authors}
        for k, names in (('contributors', ('Contributors',)), ('format', ('Format',)), ('added', ('Date Added',)),
                         ('lastRead', ('Last Date Read',)), ('moods', ('Moods',)), ('pace', ('Pace',)),
                         ('review', ('Review',)), ('tags', ('Tags',)), ('owned', ('Owned?', 'Owned'))):
            v = col(r, *names)
            if v:
                e[k] = v.replace('/', '-') if k in ('added', 'lastRead') else review_text(v) if k == 'review' else v
        raw_status = col(r, 'Read Status', 'Status').lower()
        e['status'] = STATUS.get(raw_status, raw_status or 'to-read')
        if col(r, 'Dates Read'):
            e['dates'] = dates_read(col(r, 'Dates Read'))
        if col(r, 'Read Count').isdigit() and int(col(r, 'Read Count')) > 0:
            e['readCount'] = int(col(r, 'Read Count'))
        try:
            if col(r, 'Star Rating'):
                e['rating'] = float(col(r, 'Star Rating'))
        except ValueError:
            pass
        isbn = isbn13(col(r, 'ISBN/UID', 'ISBN'))
        if isbn:
            e['isbn13'] = isbn
        t = short_title(title)
        match, way = None, None
        if title in links:   # linked by hand (data/storygraph-links.json): a boxed set, a US title, a Libib typo
            match, way = [i for i in links[title] if i in known], 'by hand'
        elif isbn and isbn in by_isbn:
            # her other copies too, but only when StoryGraph's title is that book's ("Veronica Mars: The Thousand-Dollar
            # Tan Line" must not pull in "Veronica Mars (2): ... Mr. Kiss and Tell")
            b0 = by_isbn[isbn]
            match, way = (group[b0] if t == key_of[b0] else [b0]), 'isbn'
        elif t + '|' + surname(authors) in by_ts:
            match, way = by_ts[t + '|' + surname(authors)], 'title and author'
        elif by_t.get(t) and len({tuple(group[i]) for i in by_t[t]}) == 1:   # one book, maybe in several copies
            match, way = group[next(iter(by_t[t]))], 'title'
        how[way] += 1
        if match:
            e['books'] = match
        out.append(e)

    counts = {}
    for e in out:
        counts[e['status']] = counts.get(e['status'], 0) + 1
    print(f'{len(out)} StoryGraph books: ' + ', '.join(f'{n} {s}' for s, n in sorted(counts.items(), key=lambda x: -x[1])))
    print(f"On her shelves: {len(out) - how[None]} (by hand {how['by hand']}, by ISBN {how['isbn']}, title and author {how['title and author']}, "
          f"title only {how['title']}); not on the shelves: {how[None]}")
    owned_unmatched = [e for e in out if 'books' not in e and (e.get('owned', '').lower() in ('yes', 'true'))]
    if owned_unmatched:
        print(f'{len(owned_unmatched)} marked owned on StoryGraph but not found on the shelves, e.g.:')
        for e in owned_unmatched[:15]:
            print('  ', e['title'], '|', e['authors'])
    linked = {}
    for e in out:
        for b in e.get('books', []):
            linked.setdefault(b, []).append(e['title'])
    twice = {k: v for k, v in linked.items() if len(v) > 1}
    if twice:
        print(f'{len(twice)} shelf books matched by more than one StoryGraph entry (the site joins them).')
    if '--matches' in sys.argv:
        titles = {b['id']: b['title'] for b in books}
        for e in out:
            if 'books' in e:
                print(f"  {e['title']}  ->  {' / '.join(titles[i] for i in e['books'])}")

    if '--apply' in sys.argv:
        today = date.today().isoformat()
        dest = os.path.join(ROOT, 'imports', f'storygraph-{today}')
        os.makedirs(dest, exist_ok=True)
        if os.path.abspath(os.path.dirname(src)) != os.path.abspath(dest):   # re-importing the copy already kept here
            shutil.copy2(src, dest)
        with open(os.path.join(DATA, 'storygraph.json'), 'w', encoding='utf-8', newline='\n') as fh:
            json.dump({'imported': today, 'file': os.path.basename(src), 'books': out}, fh, ensure_ascii=False, indent=1)
            fh.write('\n')
        print(f'Copied the export into imports/storygraph-{today}/ and wrote data/storygraph.json.')
    else:
        print('Report only. Add --apply to write data/storygraph.json.')


if __name__ == '__main__':
    main()
