"""Data check (9 Nov): reads data/ and the built site/js/data.js and lists anything inconsistent. Changes nothing.
Run: python -X utf8 tools/check_data.py   (expect "No problems.")

Checks: every data/*.json file reads; no two books share an id; every book is on a shelf that exists; every local cover
file exists; her own fix files (names, details, covers, condition, inscriptions, signed, kinds, bought, editions…)
only mention books that exist; nothing on the to-buy list is a book she already owns (same ISBN); series entries
aren't listed twice; data.js is newer than every data file (else the site shows old data: run tools/build.py)."""
import glob, json, os, re, sys
ROOT = os.environ.get('LIBRARY_ROOT') or os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # tests run on a copy (9 Nov)
DATA, SITE = os.path.join(ROOT, 'data'), os.path.join(ROOT, 'site')
problems = []


def say(msg):
    problems.append(msg)


raw = {}
for p in sorted(glob.glob(os.path.join(DATA, '**', '*.json'), recursive=True)):
    try:
        raw[os.path.relpath(p, DATA).replace('\\', '/')] = json.load(open(p, encoding='utf-8'))
    except Exception as e:
        say(f'data/{os.path.relpath(p, DATA)}: doesn’t read ({e})')

built = os.path.join(SITE, 'js', 'data.js')
D = json.loads(open(built, encoding='utf-8').read().split('const DATA = ', 1)[1].rsplit(';', 1)[0])
books = D['books']
ids = {}
for b in books:
    if b['id'] in ids:
        say(f'book id {b["id"]} used twice: {ids[b["id"]]} / {b["title"]}')
    ids[b['id']] = b['title']
shelves = {s['id'] for s in D['shelves']}
for b in books:
    if b.get('shelf') not in shelves:
        say(f'{b["title"]} ({b["id"]}): on shelf “{b.get("shelf")}”, which doesn’t exist')
    c = (b.get('cover') or '').split('?')[0]
    if c and not c.startswith('http') and not os.path.exists(os.path.join(SITE, c)):
        say(f'{b["title"]} ({b["id"]}): cover file {c} missing')
    if not b.get('title'):
        say(f'{b["id"]}: no title')   # no author is fine (atlases, guides, anthologies)

# blurbs that aren't blurbs (review, 15 Nov): a shop's listing, catalogue words, another language, or the title again
SHOP = re.compile(r'LIBRO NUEVO|NEW BOOK!|Envio|free shipping|shipping (?:to|costs?|included)|ships (?:from|within)|dispatch(?:ed)? (?:from|within)|in stock|'
                  r"condition: |\bseller'?s? (?:note|comment)|\((?:chi|eng)\)|/ English / | / paperback / ", re.I)
FOREIGN = {'er', 'og', 'den', 'det', 'som', 'und', 'der', 'die', 'das', 'les', 'une', 'avec', 'pour', 'dans', 'est', 'el', 'los', 'las', 'una', 'para', 'con', 'och', 'het', 'een', 'niet'}
ENGLISH = {'the', 'and', 'of', 'to', 'a', 'in', 'is', 'her', 'his', 'with', 'for'}
for b in books:
    t = (b.get('description') or '').strip()
    if not t or b.get('shelf') == 'old-book-collection':   # an old book's description is her own note on the copy
        continue
    words = re.findall(r"[a-zà-ÿ]+", t.lower())
    norm = lambda x: re.sub(r'[^a-z0-9]', '', x.lower())
    if SHOP.search(t):
        say(f'{b["title"]} ({b["id"]}): the blurb is a shop listing: “{t[:60]}”')
    elif words and sum(w in FOREIGN for w in words) > 3 * max(1, sum(w in ENGLISH for w in words)):
        say(f'{b["title"]} ({b["id"]}): the blurb isn’t in English: “{t[:60]}”')
    elif len(t) < 160 and norm(b['title'])[:25] and norm(t).startswith(norm(b['title'])[:25]):
        say(f'{b["title"]} ({b["id"]}): the blurb only repeats the title')

# her fix files: keyed by book id (or by "id-<id>" / ISBN for covers)
isbns = {b.get('isbn13') for b in books if b.get('isbn13')} | {b.get('isbn10') for b in books if b.get('isbn10')}
known = set(ids) | {'id-' + i for i in ids} | isbns
added = {x.get('id') for x in raw.get('added.json', []) if isinstance(x, dict)} if isinstance(raw.get('added.json'), list) else set()
known |= added | {'id-' + i for i in added if i}
gone_on_purpose = {x['id'] for x in raw.get('removed.json', []) if isinstance(x, dict)}   # she removed them; old fixes can stay
wish_ids = {w['id'] for f in ('to-buy.json', 'to-buy-added.json') for w in raw.get(f, []) if isinstance(w, dict) and w.get('id')}   # to-buy covers (bought and split ones too)
known |= gone_on_purpose | wish_ids | {'id-' + i for i in gone_on_purpose | wish_ids}
for name in ('condition.json', 'inscriptions.json', 'signed.json', 'old-books-kinds.json', 'editions.json',
             'shelf-moves.json', 'detail-fixes.json', 'description-fixes.json', 'name-fixes.json', 'covers.json', 'covers-trial.json'):
    v = raw.get(name)
    if not isinstance(v, dict):
        continue
    keys = [k for k in v if not k.startswith('_')]
    if name == 'old-books-kinds.json':   # {kind: [ids]} or {id: kind}
        keys = [i for k in keys for i in (v[k] if isinstance(v[k], list) else [k])]
    if name == 'name-fixes.json' and not any(k in known for k in keys):
        continue   # keyed by names, not ids
    gone = [k for k in keys if k not in known and not k.startswith('sg-') and not re.fullmatch(r'\d{9}[\dX]|\d{13}', k)]   # sg-: read elsewhere (StoryGraph)
    if gone:
        say(f'data/{name}: {len(gone)} entr{"y" if len(gone) == 1 else "ies"} for books not in the library: {", ".join(gone[:6])}{"…" if len(gone) > 6 else ""}')
for x in raw.get('bought.json', []) or []:
    if isinstance(x, dict) and x.get('book') and x['book'] not in known:
        say(f'data/bought.json: {x.get("wish")} points to book {x["book"]}, not in the library')

# to buy: nothing she owns already
for w in D.get('toBuy', []):
    for k in ('isbn13', 'isbn10'):
        if w.get(k) and w[k] in isbns:
            say(f'To buy “{w["title"]}”: ISBN {w[k]} is already on her shelves')
wids = [w['id'] for w in D.get('toBuy', [])]
for i in {i for i in wids if wids.count(i) > 1}:
    say(f'To buy: id {i} listed twice')

# series: no entry twice
for s in D.get('series', []):
    names = [e.split('|')[0].lower() for e in s['books']]
    for n in {n for n in names if names.count(n) > 1}:
        say(f'Series {s["name"]}: “{n}” listed twice')

# the built site is up to date
newest = max((os.path.getmtime(p) for p in glob.glob(os.path.join(DATA, '**', '*.json'), recursive=True)), default=0)
if os.path.getmtime(built) < newest - 1:
    say('site/js/data.js is older than the data: run tools/build.py')

print('\n'.join(problems) if problems else 'No problems.')
print(f'({len(books)} books, {len(D.get("toBuy", []))} to buy, {len(raw)} data files checked)')
sys.exit(1 if problems else 0)
