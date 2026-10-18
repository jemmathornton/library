"""Fill in what Libib left empty: a book's description, page count and publisher (her ask, 18 Oct).

    python -X utf8 tools/fill_details.py            looks up books not tried before
    python -X utf8 tools/fill_details.py --retry    tries again the ones nothing was found for

From Open Library: by ISBN, the edition (pages, publisher) and its work (description); without an ISBN, a search by
title and author for the work's description only (an old copy's pages and publisher are its own, so they stay empty).
Saved in data/details.json; the build only uses it where the book has nothing of its own.
"""
import json, os, re, sys, time, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')
OUT = os.path.join(DATA, 'details.json')
UA = {'User-Agent': "Jemma's Home Library (private)"}


def get(url):
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise


def clean(text):
    """Open Library descriptions: markdown links, source notes and 'Contains:' lists out."""
    if isinstance(text, dict):
        text = text.get('value', '')
    text = re.split(r'\n-{3,}|\n\s*\(\[source\]|\n\s*Contains:', text or '')[0]
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    text = re.sub(r'\[\d+\]:\s*\S+', '', text)
    text = re.sub(r'\*\*|__|_(?=\s|$)', '', text).replace('\r', '')   # markdown bold and stray underscores
    return re.sub(r'\n{3,}', '\n\n', text).strip()


def work_description(key):
    w = get(f'https://openlibrary.org{key}.json') or {}
    return clean(w.get('description'))


def main():
    details = json.load(open(OUT, encoding='utf-8')) if os.path.exists(OUT) else {}
    books = json.load(open(os.path.join(DATA, 'books.json'), encoding='utf-8'))
    if os.path.exists(os.path.join(DATA, 'added.json')):
        books += json.load(open(os.path.join(DATA, 'added.json'), encoding='utf-8'))
    todo = [b for b in books if not (b.get('description') and b.get('pages') and b.get('publisher'))
            and (b['id'] not in details or ('--retry' in sys.argv and not details[b['id']]))]
    print(f'{len(todo)} books to look up')
    found = 0
    for n, b in enumerate(todo, 1):
        d = {}
        try:
            isbn = b.get('isbn13') or b.get('isbn10')
            if isbn:
                ed = get(f'https://openlibrary.org/isbn/{isbn}.json')
                time.sleep(0.6)
                if ed:
                    if ed.get('number_of_pages'):
                        d['pages'] = ed['number_of_pages']
                    if ed.get('publishers'):
                        d['publisher'] = ', '.join(ed['publishers'])
                    desc = clean(ed.get('description'))
                    if not desc and ed.get('works'):
                        desc = work_description(ed['works'][0]['key'])
                        time.sleep(0.6)
                    if desc:
                        d['description'] = desc
            if 'description' not in d and not b.get('description'):
                title = re.split(r':\s', re.sub(r'\(.*?\)', '', b['title']))[0].strip()
                q = {'title': title, 'limit': 3, 'fields': 'key,title'}
                author = next((a['name'] for a in b.get('authors', []) if not a.get('role')), '')
                if author:
                    q['author'] = author.split()[-1]
                docs = (get('https://openlibrary.org/search.json?' + urllib.parse.urlencode(q)) or {}).get('docs', [])
                time.sleep(0.6)
                want = re.sub(r'[^a-z0-9]', '', title.lower())
                hit = next((x for x in docs if re.sub(r'[^a-z0-9]', '', x.get('title', '').lower()).startswith(want[:18])), None)
                if hit:
                    desc = work_description(hit['key'])
                    time.sleep(0.6)
                    if desc:
                        d['description'] = desc
        except Exception as e:
            print('  stopped:', e)
            break
        details[b['id']] = d
        found += bool(d)
        if n % 25 == 0:
            print(f'  {n} done, {found} with something new', flush=True)
            json.dump(details, open(OUT, 'w', encoding='utf-8', newline='\n'), ensure_ascii=False, indent=1)
    json.dump(details, open(OUT, 'w', encoding='utf-8', newline='\n'), ensure_ascii=False, indent=1)
    print(f'Done: {found} of {len(todo)} got something.')


if __name__ == '__main__':
    main()
