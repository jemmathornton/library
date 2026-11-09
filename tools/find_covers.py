"""Find a cover picture for every book with an ISBN-13 (shelves, to-buy list, StoryGraph books not on the shelves) and remember it in data/covers.json.

    python -X utf8 tools/find_covers.py            looks up only books not tried before
    python -X utf8 tools/find_covers.py --retry    tries the ones with no cover found again

Open Library first (50 ISBNs per request; its cover links are by picture id, which it doesn't rate-limit), then Open Library's
search for a cover of another edition of the same book, then Google Books for the rest, one request a second. Covers are publishers' own pictures, linked, not copied, so the site needs the
internet to show them; books with no cover get a plain title card drawn by the site.
"""
import json, os, re, sys, time, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')
OUT = os.path.join(DATA, 'covers.json')
UA = {'User-Agent': "Jemma's Home Library (private prototype)"}


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
        return json.load(r)


def main():
    covers = json.load(open(OUT, encoding='utf-8')) if os.path.exists(OUT) else {}
    isbns = []
    sg = os.path.join(DATA, 'storygraph.json')   # books read elsewhere (not on her shelves) get covers too
    extra = [e for e in json.load(open(sg, encoding='utf-8'))['books'] if 'books' not in e] if os.path.exists(sg) else []
    for name in ('books.json', 'to-buy.json', extra):
        for b in (json.load(open(os.path.join(DATA, name), encoding='utf-8')) if isinstance(name, str) else name):
            i = b.get('isbn13')
            if i and i not in isbns and (i not in covers or (covers[i] is None and '--retry' in sys.argv)):
                isbns.append(i)
    print(f'{len(isbns)} ISBNs to look up')

    for n in range(0, len(isbns), 50):
        chunk = isbns[n:n + 50]
        res = get('https://openlibrary.org/api/books?format=json&jscmd=data&bibkeys=' + ','.join('ISBN:' + i for i in chunk))
        for i in chunk:
            c = res.get('ISBN:' + i, {}).get('cover')
            if c:
                covers[i] = {'src': c.get('large') or c.get('medium'), 'from': 'Open Library'}
        time.sleep(1)
    found_ol = sum(1 for i in isbns if covers.get(i))
    print(f'Open Library: {found_ol}')

    for i in isbns:
        if covers.get(i):
            continue
        try:
            docs = get('https://openlibrary.org/search.json?fields=cover_i&limit=1&isbn=' + i).get('docs', [])
        except Exception as e:
            print('  Open Library search stopped:', e)
            break
        if docs and docs[0].get('cover_i'):
            covers[i] = {'src': f"https://covers.openlibrary.org/b/id/{docs[0]['cover_i']}-L.jpg", 'from': 'Open Library (another edition)'}
        time.sleep(1)
    found_ol = sum(1 for i in isbns if covers.get(i))
    print(f'Open Library, other editions: {found_ol}')

    for i in isbns:
        if covers.get(i):
            continue
        try:
            res = get('https://www.googleapis.com/books/v1/volumes?q=isbn:' + urllib.parse.quote(i))
        except Exception as e:   # quota or network: leave it untried, so the next run asks again
            print('  Google Books stopped:', e)
            break
        links = next((it['volumeInfo'].get('imageLinks') for it in res.get('items', []) if it['volumeInfo'].get('imageLinks')), None)
        if links:
            src = (links.get('thumbnail') or links.get('smallThumbnail') or '').replace('http://', 'https://').replace('&edge=curl', '')
            covers[i] = {'src': src, 'from': 'Google Books'}
        else:
            covers[i] = None
        time.sleep(1)
    print(f'Google Books: {sum(1 for i in isbns if covers.get(i)) - found_ol}; none found: {sum(1 for i in isbns if i in covers and covers[i] is None)}; '
          f'not tried yet: {sum(1 for i in isbns if i not in covers)}')

    # Last: Open Library's search by title and author, for books still without a cover, ISBN or not (Google Books
    # stopped answering on 18 Oct). Covers found this way are stored under the book's id ("id-<id>").
    title_tried = covers.setdefault('_byTitle', {})
    nc = os.path.join(DATA, 'no-cover.json')   # old books that should stay without a (modern) cover
    no_cover = {'id-' + x['id'] for x in json.load(open(nc, encoding='utf-8'))['books']} if os.path.exists(nc) else set()
    title_tried.update({k: False for k in no_cover})
    found_t = 0
    for name in ('books.json', 'to-buy.json', extra):
        for b in (json.load(open(os.path.join(DATA, name), encoding='utf-8')) if isinstance(name, str) else name):
            key = 'id-' + str(b.get('id', ''))
            if covers.get(b.get('isbn13', '')) or covers.get(key) or key in no_cover or (key in title_tried and '--retry' not in sys.argv) or not b.get('id'):
                continue
            title = re.split(r':\s', re.sub(r'\(.*?\)|\[.*?\]', '', b['title']))[0].strip()
            names = b['authors'] if isinstance(b.get('authors'), list) else [{'name': n} for n in str(b.get('authors', '')).split(', ')]
            author = next((a['name'] for a in names if a.get('name') and not a.get('role')), '')
            q = {'title': title, 'limit': 5, 'fields': 'title,cover_i'}
            if author:
                q['author'] = author.split()[-1]
            try:
                docs = get('https://openlibrary.org/search.json?' + urllib.parse.urlencode(q)).get('docs', [])
            except Exception as e:
                print('  Open Library title search stopped:', e)
                break
            want = re.sub(r'[^a-z0-9]', '', title.lower())
            hit = next((d for d in docs if d.get('cover_i') and re.sub(r'[^a-z0-9]', '', d.get('title', '').lower()).startswith(want[:20])), None)
            title_tried[key] = bool(hit)
            if hit:
                covers[key] = {'src': f"https://covers.openlibrary.org/b/id/{hit['cover_i']}-L.jpg", 'from': 'Open Library (title search)'}
                found_t += 1
            time.sleep(1)
    print(f'Open Library, by title: {found_t}')

    # Then Amazon's own cover pictures, by ISBN-10 (small presses Open Library doesn't have; 18 Oct). Amazon answers a
    # missing cover with a 1-pixel picture, so only real pictures count.
    from PIL import Image
    import io
    amazon_tried = covers.setdefault('_amazon', {})
    found_a = 0
    for name in ('books.json', 'to-buy.json', extra):
        for b in (json.load(open(os.path.join(DATA, name), encoding='utf-8')) if isinstance(name, str) else name):
            i = b.get('isbn13', '')
            if not i.startswith('978') or covers.get(i) or covers.get('id-' + str(b.get('id', ''))) or (i in amazon_tried and '--retry' not in sys.argv):
                continue
            core = i[3:12]
            check = (11 - sum((10 - n) * int(c) for n, c in enumerate(core)) % 11) % 11
            i10 = core + ('X' if check == 10 else str(check))
            url = f'https://images-na.ssl-images-amazon.com/images/P/{i10}.01.LZZZZZZZ.jpg'
            try:
                with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
                    img = Image.open(io.BytesIO(r.read()))
                ok = img.width > 50 and img.height > 50
            except Exception:
                ok = False
            amazon_tried[i] = ok
            if ok:
                covers[i] = {'src': url, 'from': 'Amazon'}
                found_a += 1
            time.sleep(1)
    print(f'Amazon: {found_a}')

    from safe_write import write_json
    fresh = json.load(open(OUT, encoding='utf-8')) if os.path.exists(OUT) else {}   # anything the server saved meanwhile is kept
    write_json(OUT, dict(sorted({**covers, **{k: v for k, v in fresh.items() if k not in covers or k.startswith('id-add')}}.items())), indent=0)


if __name__ == '__main__':
    main()
