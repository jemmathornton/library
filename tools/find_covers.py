"""Find a cover picture for every book with an ISBN-13 (shelves, to-buy list, StoryGraph books not on the shelves) and remember it in data/covers.json.

    python -X utf8 tools/find_covers.py            looks up only books not tried before
    python -X utf8 tools/find_covers.py --retry    tries the ones with no cover found again

Open Library first (50 ISBNs per request; its cover links are by picture id, which it doesn't rate-limit), then Open Library's
search for a cover of another edition of the same book, then Google Books for the rest, one request a second. Covers are publishers' own pictures, linked, not copied, so the site needs the
internet to show them; books with no cover get a plain title card drawn by the site.
"""
import json, os, sys, time, urllib.parse, urllib.request

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
            src = (links.get('thumbnail') or links.get('smallThumbnail')).replace('http://', 'https://').replace('&edge=curl', '')
            covers[i] = {'src': src, 'from': 'Google Books'}
        else:
            covers[i] = None
        time.sleep(1)
    print(f'Google Books: {sum(1 for i in isbns if covers.get(i)) - found_ol}; none found: {sum(1 for i in isbns if i in covers and covers[i] is None)}; '
          f'not tried yet: {sum(1 for i in isbns if i not in covers)}')

    with open(OUT, 'w', encoding='utf-8', newline='\n') as fh:
        json.dump(dict(sorted(covers.items())), fh, ensure_ascii=False, indent=0)
        fh.write('\n')


if __name__ == '__main__':
    main()
