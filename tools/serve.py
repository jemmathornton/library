"""Serve site/ at http://localhost:8020 for the library's app window, and let it add books.

Started at login with no window by the shortcut tools/make_shortcuts.ps1 puts in her Startup folder. Only this computer
can reach it. If it's already running, a second copy just stops.

    pythonw tools/serve.py

Adding a book (the site's "Add a book" page, 18 Oct):
    GET  /api/straighten?src=&edge=   that cover cut out along the book's edges and pulled square, for "Cropped or at an angle"
    GET  /api/outline?src=      where "Set the corners" starts its four dots; /api/straighten?src=&corners= uses hers
    GET  /api/covers?isbn=&title=&author=   other covers to choose from (other editions), for "Find another cover"
    GET  /api/lookup?isbn=...   the book's details from Open Library (title, authors, publisher, date, pages, cover);
                                Waterstones fills what Open Library hasn't got yet (new books, 1 Nov), and a Waterstones
                                price-sticker code (13 digits starting 2) is looked up there alone
    POST /api/signed            {id, signed: "signed" | "to-you" | ""}: her signed copies, in data/signed.json (1 Nov)
    POST /api/books             saves it to data/added.json (kept apart from the Libib import, which a re-import
                                overwrites), copies its cover into site/covers and rebuilds the site
Both need the header "X-Library: 1", which only the site itself sends: a page from anywhere else can't add books.

Scanning with her phone (30 Oct, her yes): the free Android app Binary Eye sends each barcode it scans to
    GET http://<this laptop on the home Wi-Fi>:8021/scan?key=<key>&isbn=<number>
on a second, separate listener. It does one thing: a real book number (13 digits, 978/979, right check digit) with the
right key goes on the scanned list (data/scanned.json, not kept in git), and the reply (shown on the phone) names the book.
It serves no pages and can't add books. The key is made once and kept outside the project, in
%LOCALAPPDATA%\\Jemmas Library\\scan-key.txt. Windows asks once whether Python may use the network: Private networks only.
The site's Add a book page reads the list (GET /api/scanned, this laptop only) and fills itself in; a book comes off the
list when it's added, or with POST /api/scanned/remove.

New reading (18 Oct, her ask): every 5 minutes it looks in her Downloads for the newest StoryGraph export (a CSV whose
first line is StoryGraph's own column list). When there's a newer one than last time, tools/import_storygraph.py copies
it into imports/ and brings it in, and the site is rebuilt. Her Downloads file is only read, never changed.
Last import in data/storygraph-source.json; what happened in logs/reading-updates.log.
"""
import functools, hmac, html, http.server, json, os, re, secrets, subprocess, sys, threading, time, urllib.parse, urllib.request
from datetime import date, datetime

PORT, SCAN_PORT = 8020, 8021
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE, DATA = os.path.join(ROOT, 'site'), os.path.join(ROOT, 'data')
ADDED, SCANNED = os.path.join(DATA, 'added.json'), os.path.join(DATA, 'scanned.json')
KEY_FILE = os.path.join(os.environ.get('LOCALAPPDATA', os.path.expanduser('~')), 'Jemmas Library', 'scan-key.txt')
UA = {'User-Agent': "Jemma's Home Library (private)"}
PYTHON = os.path.join(os.path.dirname(sys.executable), 'python.exe')   # under pythonw, run the build with python
LOCK = threading.Lock()   # one add or reading import at a time, so two builds never write the site at once


def build():
    """Rebuild the site; the finished process, so its exit code can be checked."""
    return subprocess.run([PYTHON, '-X', 'utf8', os.path.join(ROOT, 'tools', 'build.py')], cwd=ROOT, capture_output=True,
                          text=True, creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))


def write_json(path, obj, indent=1):
    """Written to a temporary file beside it, then swapped in (review, 2 Nov): a crash or a full disk mid-write never
    leaves half a file, which would stop every later build. Windows refuses the swap while the file is being read, so it
    tries again for a moment."""
    tmp = f'{path}.{os.getpid()}-{threading.get_ident()}.tmp'
    with open(tmp, 'w', encoding='utf-8', newline='\n') as fh:
        json.dump(obj, fh, ensure_ascii=False, indent=indent)
        fh.write('\n')
    for n in range(10):
        try:
            os.replace(tmp, path)
            return
        except PermissionError:
            if n == 9:
                raise
            time.sleep(.2)


def get_json(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=20) as r:
        return json.load(r)


def waterstones(isbn):
    """A new UK book Open Library doesn't have yet (1 Nov: Hollywood, Ending, out two months): Waterstones' search sends an
    ISBN it knows straight to the book's page, whose structured data has the title, author, pages, date and cover."""
    with urllib.request.urlopen(urllib.request.Request(f'https://www.waterstones.com/books/search/term/{isbn}', headers=UA), timeout=20) as r:
        if '/book/' not in r.geturl():   # still on the search page: Waterstones doesn't know it either
            return None
        page = r.read().decode('utf-8', 'replace')
    book = None
    for block in re.findall(r'<script type="application/ld\+json">(.*?)</script>', page, re.S):
        try:
            data = json.loads(block)
        except ValueError:
            continue
        book = next((n for n in data.get('@graph', [data]) if n.get('@type') == 'Book'), book)
    if not book or not book.get('name'):
        return None
    people = book.get('author') or []
    people = people if isinstance(people, list) else [people]
    pub = re.search(r'Publisher:\s*(?:<[^>]*>\s*)*([^<]+)', page)
    # a shop-only edition (a signed copy under a sticker code) links to the book's ordinary edition: its ISBN finds sharper covers
    slug = re.search(r'/book/([^/]+)/', r.geturl())
    other = next((m for m in re.findall(rf'href="/book/{re.escape(slug.group(1))}/[^/"]+/(97[89]\d{{10}})"', page) if m != isbn), '') if slug else ''
    cat = re.search(r'"item_category":"([^"]+)"', page)   # the shop's own category, e.g. "Steampunk" (for a suggested shelf)
    return {'found': True, 'isbn': isbn, 'title': html.unescape(book['name']), 'authors': [re.sub(r'\s+', ' ', html.unescape(p['name'])).strip() for p in people if p.get('name')],
            'categories': [html.unescape(cat.group(1))] if cat else [],
            'publisher': html.unescape(pub.group(1).strip()) if pub else '',
            'published': book.get('datePublished', ''), 'pages': book.get('numberOfPages'), 'cover': book.get('image', ''), 'otherIsbn': other}


def goodreads(isbn):
    """A small press's book no shop lists (1 Nov: The Callista Prophecy, Rook Abbey Press): Goodreads' search sends a known
    ISBN to the book's page, whose structured data has the title, authors, pages and cover; publisher and date are in its page data.
    Only taken when the page is for this very ISBN."""
    import http.cookiejar   # Goodreads sets a cookie on its way to the book page and loops without one
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    with opener.open(urllib.request.Request(f'https://www.goodreads.com/search?q={isbn}', headers=UA), timeout=20) as r:
        url, page = r.geturl(), r.read().decode('utf-8', 'replace')
    if '/book/show/' not in url:   # a list of results rather than the book itself: its first result
        first = re.search(r'href="(/book/show/[^"?]+)', page)
        if not first:
            return None
        with opener.open(urllib.request.Request('https://www.goodreads.com' + first.group(1), headers=UA), timeout=20) as r:
            page = r.read().decode('utf-8', 'replace')
    book = None
    for block in re.findall(r'<script type="application/ld\+json">(.*?)</script>', page, re.S):
        try:
            data = json.loads(block)
        except ValueError:
            continue
        if isinstance(data, dict) and data.get('@type') == 'Book':
            book = data
    if not book or not book.get('name') or re.sub(r'\D', '', str(book.get('isbn', ''))) != isbn:   # this very edition only
        return None
    people = book.get('author') or []
    people = people if isinstance(people, list) else [people]
    # the page holds every edition's details: the publisher and date are taken from this ISBN's own (review, 2 Nov)
    mine = next((m for m in re.findall(r'\{[^{}]*"isbn13":"%s"[^{}]*\}' % isbn, page)), page)
    pub = re.search(r'"publisher":"((?:[^"\\]|\\.)*)"', mine) or re.search(r'"publisher":"((?:[^"\\]|\\.)*)"', page)
    when = re.search(r'"publicationTime":(\d{9,})', mine) or re.search(r'"publicationTime":(\d{9,})', page)
    unesc = lambda x: html.unescape(json.loads(f'"{x}"')) if x else ''   # \u2019 and &amp; as the characters they stand for
    genres = list(dict.fromkeys(g.replace('-', ' ') for g in re.findall(r'goodreads\.com/genres/([a-z0-9-]+)', page)))[:8]
    return {'found': True, 'isbn': isbn, 'title': html.unescape(book['name']), 'authors': [re.sub(r'\s+', ' ', html.unescape(p['name'])).strip() for p in people if p.get('name')],
            'publisher': unesc(pub.group(1)) if pub else '', 'published': date.fromtimestamp(int(when.group(1)) / 1000).isoformat() if when else '',
            'pages': book.get('numberOfPages'), 'cover': book.get('image', ''), 'categories': genres}


def waterstones_checked(isbn):
    """Waterstones, but with three or more 'authors' (it lists illustrators and cover artists too) Goodreads' authors win."""
    hit = waterstones(isbn)
    if hit and len(hit['authors']) >= 3:
        gr = None
        for n in range(3):   # Goodreads sometimes answers with an empty page
            try:
                gr = goodreads(isbn)
            except Exception:
                gr = None
            if gr:
                break
            time.sleep(1.5)
        if gr and gr['authors']:
            hit['authors'] = list(dict.fromkeys(re.sub(r'^(Mr|Mrs|Ms|Miss|Dr)\.?\s+', '', a) for a in gr['authors']))
            hit['categories'] = hit.get('categories', []) + gr.get('categories', [])
    return hit


def isbn10(i13):
    if not i13.startswith('978'):
        return ''
    core = i13[3:12]
    c = (11 - sum((10 - i) * int(d) for i, d in enumerate(core)) % 11) % 11
    return core + ('X' if c == 10 else str(c))


def best_cover(found):
    """The sharpest whole front cover to be had (her ask, 1 Nov: a Waterstones picture is small and may carry their banner):
    Amazon, World of Books and Open Library are asked for her ISBN (and the ordinary edition's, for a sticker code), and the
    largest upright picture wins; the one the lookup found stays if nothing beats it."""
    from io import BytesIO
    from PIL import Image
    urls = [found.get('cover', '')]
    for i in [found.get('isbn', ''), found.get('otherIsbn', '')]:
        if re.fullmatch(r'97[89]\d{10}', i or ''):
            if isbn10(i):
                urls.append(f'https://images-na.ssl-images-amazon.com/images/P/{isbn10(i)}.01._SCRMZZZZZZ_.jpg')
            urls += [f'https://image-server.worldofbooks.com/images/{i}.jpg', f'https://covers.openlibrary.org/b/isbn/{i}-L.jpg?default=false']
    best, best_w = found.get('cover', ''), 0
    for u in [u for u in urls if u]:
        try:
            with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=15) as r:
                w, h = Image.open(BytesIO(r.read())).size
        except Exception:
            continue
        if w >= 200 and 1.2 < h / w < 1.8 and w > best_w + 50:   # upright, book-shaped, and clearly larger
            best, best_w = u, w
    return best


def fetch_text(url, opener=None, tries=2):
    """A page as text; Goodreads sometimes answers with an empty page or an error, and a second ask usually works."""
    for n in range(tries):
        try:
            with (opener.open if opener else urllib.request.urlopen)(urllib.request.Request(url, headers=UA), timeout=20) as r:
                text = r.read().decode('utf-8', 'replace')
            if text:
                return text
        except Exception:
            pass
        if n + 1 < tries:
            time.sleep(1.5)
    return ''


def goodreads_editions(isbn, title, author):
    """Every edition Goodreads lists for the book (its editions page), English only, each cover at full size."""
    import http.cookiejar
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    # her ISBN takes Goodreads straight to the book's page (a list of results has no editions link of the book's own)
    page = fetch_text('https://www.goodreads.com/search?' + urllib.parse.urlencode({'q': isbn}), opener) if isbn else ''
    work = re.search(r'/work/editions/(\d+)', page) if 'itemtype="http://schema.org/Book"' not in page else None
    if not work:   # her ISBN unknown there: by title and author instead
        # title and surname only: with initials too, Goodreads may jump straight to one book page, which could be a
        # study guide; a list lets the real book be picked
        surname, best = (author.split() or [''])[-1].lower(), (-1, '')
        page = fetch_text('https://www.goodreads.com/search?' + urllib.parse.urlencode({'q': f'{title} {surname}'.strip()}), opener)
        # the result by her author with the most ratings: the real book, not a study guide or a copy under another name
        for row in page.split('itemtype="http://schema.org/Book"')[1:]:
            link = re.search(r'href="(/book/show/[^"?]+)', row)
            by = ' '.join(re.findall(r'itemprop="name">([^<]+)', row)).lower()
            n = re.search(r'([\d,]+) ratings?', row)
            if link and surname and surname in by and (int(n.group(1).replace(',', '')) if n else 0) > best[0]:
                best = (int(n.group(1).replace(',', '')) if n else 0, link.group(1))
        if best[1]:
            page = fetch_text('https://www.goodreads.com' + best[1], opener)
        # Goodreads' newer results page has no such rows, but lists each result's editions link, best match first
        work = re.search(r'/work/editions/(\d+)', page)
    if not work:
        return []
    out = []
    for part in fetch_text(f'https://www.goodreads.com/work/editions/{work.group(1)}?per_page=100', opener).split('class="elementList clearFix"')[1:]:
        img = re.search(r'<img[^>]+src="(https://i\.gr-assets\.com/[^"]+)"', part)
        text = html.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', part)))
        if not img or 'nophoto' in img.group(1) or re.search(r'Edition language:\s*(?!English)\w', text):
            continue
        when = re.search(r'Published (\w+ (?:\d+\w\w )?\d{4}|\d{4})(?: by (.+?))?\s+(?:Paperback|Hardcover|Mass Market|Kindle|ebook|Audio|Library|Board|Unknown|Author)', text)
        label = ', '.join(x for x in [(when.group(2) or '').strip(' ,') if when else '', when.group(1) if when else ''] if x) or 'Another edition'
        out.append((re.sub(r'\._S[XY]\d+_', '', img.group(1)), 'Goodreads: ' + label))
    return out


def abebooks_photos(query):
    """Sellers' own photos of real copies on AbeBooks UK (of her ISBN, or of the book in any edition): often taken at an
    angle on a table, which "Cropped or at an angle" can then put right."""
    page = fetch_text('https://www.abebooks.co.uk/servlet/SearchResults?' + urllib.parse.urlencode({**query, 'sortby': 17}))
    ids = list(dict.fromkeys(re.findall(r'pictures\.abebooks\.com/inventory/(\d+)\._SL300_\.jpg', page)))
    return [(f'https://pictures.abebooks.com/inventory/{i}._SL1000_.jpg', 'AbeBooks seller’s photo') for i in ids[:12]]


def other_covers(isbn, title, author):
    """Covers to choose from on the Add page's "Find another cover" (her ask, 1 Nov: the looked-up one can be the wrong
    edition, or trimmed oddly): this ISBN at Amazon, World of Books and Open Library; AbeBooks UK sellers' photos of
    copies of this ISBN; every English edition Goodreads and Open Library list (Open Library's UK ones first); then
    AbeBooks UK photos of the book in any edition. She picks; nothing is chosen for her."""
    from concurrent.futures import ThreadPoolExecutor
    out, seen = [], set()

    def put(src, label, uk=False):
        if src and src not in seen:
            seen.add(src)
            out.append({'src': src, 'label': label, 'uk': uk})
    i = isbn13(isbn)
    pool = ThreadPoolExecutor(3)
    def bg(f, *x):   # asked alongside; a site that fails just adds nothing
        def run():
            try:
                return f(*x)
            except Exception:
                return []
        return pool.submit(run)
    gr = bg(goodreads_editions, i, title, author)
    abe_mine = bg(abebooks_photos, {'isbn': i}) if i else bg(lambda: [])
    abe_any = bg(abebooks_photos, {'an': author, 'tn': title}) if title else bg(lambda: [])
    if re.fullmatch(r'97[89]\d{10}', i):
        if isbn10(i):
            put(f'https://images-na.ssl-images-amazon.com/images/P/{isbn10(i)}.01._SCRMZZZZZZ_.jpg', 'Amazon, your ISBN')
        put(f'https://image-server.worldofbooks.com/images/{i}.jpg', 'World of Books, your ISBN')
        put(f'https://covers.openlibrary.org/b/isbn/{i}-L.jpg?default=false', 'Open Library, your ISBN')
    works = []
    if i:
        try:
            works = [w['key'] for w in get_json(f'https://openlibrary.org/isbn/{i}.json').get('works', [])]
        except Exception:
            pass
    if not works and title:
        q = urllib.parse.urlencode({'title': title, 'author': author, 'fields': 'key', 'limit': 2})
        try:
            works = [w['key'] for w in get_json('https://openlibrary.org/search.json?' + q).get('docs', [])]
        except Exception:
            pass
    eds = []
    for w in works[:2]:
        try:
            eds += get_json(f'https://openlibrary.org{w}/editions.json?limit=100').get('entries', [])
        except Exception:
            pass
    uk_place = re.compile(r'london|united kingdom|\buk\b|england|great britain|edinburgh|glasgow|oxford|cambridge', re.I)
    rows = []
    for e in eds:
        langs = [x['key'] for x in e.get('languages', [])]
        cov = [c for c in e.get('covers') or [] if c and c > 0]
        if not cov or (langs and '/languages/eng' not in langs):
            continue
        uk = bool(uk_place.search(' '.join(e.get('publish_places', [])))) or e.get('publish_country', '') in ('enk', 'stk', 'xxk')
        label = ', '.join(x for x in [(e.get('publishers') or [''])[0], e.get('publish_date', '')] if x) or 'Another edition'
        rows.append((not uk, f'https://covers.openlibrary.org/b/id/{cov[0]}-L.jpg', label, uk))
    for src, label in abe_mine.result():
        put(src, label + ', your ISBN')
    for src, label in gr.result():
        put(src, label)
    for _, src, label, uk in sorted(rows, key=lambda r: r[0]):
        put(src, label, uk)
    for src, label in abe_any.result():
        put(src, label)
    return out[:60]


STRAIGHT = os.path.join(SITE, 'covers', '_straightened')   # straightened covers waiting to be added (not kept in git)
STRAIGHT_URL = re.compile(r'covers/_straightened/[0-9a-f]{16}\.jpg')


def picture(src):
    """A cover picture from the internet (https only: never a file on this computer)."""
    from io import BytesIO
    from PIL import Image
    if urllib.parse.urlparse(src).scheme != 'https':
        raise ValueError('Only a cover from the internet can be straightened here.')
    with urllib.request.urlopen(urllib.request.Request(src, headers=UA), timeout=20) as r:
        return Image.open(BytesIO(r.read())).convert('RGB')


def outline(src):
    """Where "Set the corners" puts its four dots to start with: the book's corners if they can be found, else the
    picture's own corners a little in. In the picture's own pixels, with its size."""
    sys.path.insert(0, os.path.join(ROOT, 'tools'))
    import straighten as st
    im = picture(src)
    w, h = im.size
    pts = st.find_outline(im)
    if pts is None:
        pts = [[w * .03, h * .03], [w * .97, h * .03], [w * .97, h * .97], [w * .03, h * .97]]
    return {'ok': True, 'width': w, 'height': h, 'corners': [[round(float(x), 1), round(float(y), 1)] for x, y in pts]}


def save_straightened(out):
    import hashlib
    from io import BytesIO
    os.makedirs(STRAIGHT, exist_ok=True)
    jpg = BytesIO()
    out.save(jpg, 'JPEG', quality=92)
    name = hashlib.sha1(jpg.getvalue()).hexdigest()[:16] + '.jpg'   # named by the result, so a redo never shows the old one
    with open(os.path.join(STRAIGHT, name), 'wb') as fh:
        fh.write(jpg.getvalue())
    return {'ok': True, 'cover': 'covers/_straightened/' + name}


def straighten_corners(src, corners):
    """"Set the corners" (her ask, 2 Nov): the four corners she dragged into place (any shape, at any angle) pulled
    square. corners: x,y for top left, top right, bottom right, bottom left, in the picture's own pixels."""
    sys.path.insert(0, os.path.join(ROOT, 'tools'))
    import straighten as st
    im = picture(src)
    w, h = im.size
    v = [float(x) for x in corners.split(',')]
    if len(v) != 8:
        raise ValueError('four corners needed')
    pts = [[min(max(v[i], 0), w - 1), min(max(v[i + 1], 0), h - 1)] for i in range(0, 8, 2)]
    return save_straightened(st.warp(im, pts))


def straighten(src, edge=0):
    """"Cropped or at an angle" on the Add page (her ask, 1 Nov): the book cut out of the photo and squared up, by
    tools/straighten.py (how it decides is written there; tested overnight 1-2 Nov on about 500 sellers' photos). When
    it isn't clearly a photo of a book on a background, the picture is left as it is and she's told. She sees the
    result and can undo it, or trim less or more: edge moves every side out (more than 0) or in (less than 0)."""
    sys.path.insert(0, os.path.join(ROOT, 'tools'))
    import straighten as st
    out = st.straighten(picture(src), edge)
    if out is None:
        return {'ok': False, 'error': 'This picture looks like the cover already (no table or background round it to cut away), so it’s left as it is. Set the corners yourself if it needs cutting.'}
    return save_straightened(out)


SERIES_TAIL = re.compile(
    r'\s*(?:'
    r'\([^()]*(?:\b(?:series|saga|trilogy|chronicles|quartet|cycle|book|bk|vol|volume)\b|#\s*\d)[^()]*\)'  # (The Natural Human Saga)
    r'|(?::|\s[\u2013-])\s*(?:the\s+)?[\w\' ]*\b(?:series|saga|trilogy|chronicles|quartet|cycle)\b[^:]*'  # : The Beyond Series - Book Four
    r'|[:,]\s*(?:book|bk\.?|vol\.?|volume)\s*(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b.*'  # : Bk. 2
    r')$', re.I)


def clean_title(t):
    """A shop or Goodreads title with the series tacked on (1 Nov: 'The Callista Prophecy (The Natural Human Saga)',
    'Lycan Lamia: The Beyond Series - Book Four'): just the book's own title; the series shows on the site by itself."""
    for _ in range(3):
        new = SERIES_TAIL.sub('', t).strip()
        new = re.sub(r'\s*\([^()]*\)$', '', new).strip() or new   # any other bracket left on the end ('(Wizard Crystal)')
        if not new or new == t:
            break
        t = new
    return t


def lookup(isbn):
    found = find(isbn)
    if found.get('found'):
        found['title'] = clean_title(found['title'])
        try:
            found['cover'] = best_cover(found)
        except Exception:
            pass
    return found


def find(isbn):
    isbn = re.sub(r'[^0-9Xx]', '', isbn).upper()
    if re.fullmatch(r'2\d{12}', isbn):   # a Waterstones price sticker (her yes, 1 Nov): it names that exact edition on their site
        try:
            return waterstones(isbn) or {'found': False, 'isbn': isbn}
        except Exception:
            return {'found': False, 'isbn': isbn}
    try:
        d = get_json(f'https://openlibrary.org/api/books?format=json&jscmd=data&bibkeys=ISBN:{isbn}').get(f'ISBN:{isbn}')
    except Exception:   # Open Library down or slow: the shops are still asked
        d = None
    if not d:
        for source, tries in ((waterstones_checked, 1), (goodreads, 3)):   # a new UK book, then a small press's (1 Nov: The Callista Prophecy)
            for n in range(tries):   # Goodreads sometimes answers with an empty page; a second ask usually works
                try:
                    hit = source(isbn)
                except Exception:
                    hit = None
                if hit:
                    return hit
                if n + 1 < tries:
                    time.sleep(1.5)
        return {'found': False, 'isbn': isbn}
    c = d.get('cover') or {}
    found = {'found': True, 'isbn': isbn, 'title': (d.get('title', '') + (': ' + d['subtitle'] if d.get('subtitle') else '')).strip(),
             'authors': [a['name'] for a in d.get('authors', [])], 'publisher': ', '.join(p['name'] for p in d.get('publishers', [])),
             'published': d.get('publish_date', ''), 'pages': d.get('number_of_pages'), 'cover': c.get('large') or c.get('medium') or '',
             'categories': [x['name'] for x in d.get('subjects', [])][:10]}
    if not (found['cover'] and found['pages'] and found['published']):   # a half-made new entry: Waterstones fills the gaps
        try:
            ws = waterstones(isbn) or {}
        except Exception:
            ws = {}
        for k in ('title', 'authors', 'published', 'pages', 'cover'):
            found[k] = found[k] or ws.get(k) or found[k]
        found['categories'] = ws.get('categories', []) + found['categories']
        found['publisher'] = ws.get('publisher') or found['publisher']   # the UK shop's publisher over Open Library's guess
    return found


def isbn13(s):
    s = re.sub(r'[^0-9Xx]', '', s or '').upper()
    if len(s) == 10:
        core = '978' + s[:9]
        return core + str((10 - sum((3 if i % 2 else 1) * int(ch) for i, ch in enumerate(core)) % 10) % 10)
    return s if len(s) == 13 else ''


def book_number(s):
    """A real book barcode: 13 digits starting 978 or 979 with the right check digit (a shop's price code isn't one)."""
    s = re.sub(r'[\s-]', '', s or '')
    if not re.fullmatch(r'97[89]\d{10}', s):
        return ''
    return s if (10 - sum((3 if i % 2 else 1) * int(ch) for i, ch in enumerate(s[:12])) % 10) % 10 == int(s[12]) else ''


def scan_key():
    if not os.path.exists(KEY_FILE):
        os.makedirs(os.path.dirname(KEY_FILE), exist_ok=True)
        with open(KEY_FILE, 'w', encoding='utf-8') as fh:   # 12 letters and digits she can type on a phone (no 0/o, 1/l look-alikes)
            fh.write(''.join(secrets.choice('abcdefghjkmnpqrstuvwxyz23456789') for _ in range(12)))
    return open(KEY_FILE, encoding='utf-8').read().strip()


def scan_setup():
    """The address to put in Binary Eye: this laptop's address on the home Wi-Fi, the port, the key (shown only on this laptop)."""
    import socket
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('192.0.2.1', 9))   # picks the Wi-Fi address; nothing is sent
        ip = s.getsockname()[0]
    finally:
        s.close()
    return {'url': f'http://{ip}:{SCAN_PORT}/scan?key={scan_key()}&isbn='}


def scanned(new=None, remove=None):
    """The scanned list: read it, add a scan to it, or take one off (callers hold LOCK when changing it)."""
    items = json.load(open(SCANNED, encoding='utf-8')) if os.path.exists(SCANNED) else []
    if new or remove:
        items = [x for x in items if x['isbn'] not in (remove, (new or {}).get('isbn'))]
        if new:
            items.append(new)
        write_json(SCANNED, items)
    return items


def on_shelves(isbn):
    """The title of a copy she already owns with this ISBN, or ''."""
    for path in (os.path.join(DATA, 'books.json'), ADDED):
        if os.path.exists(path):
            for b in json.load(open(path, encoding='utf-8')):
                if b.get('isbn13') == isbn:
                    return b.get('title', '')
    return ''


SIGNED = os.path.join(DATA, 'signed.json')


def set_signed(book_id, kind):
    """Signed or not (her ask, 1 Nov): data/signed.json, book id -> "signed" or "to-you"; anything else takes the mark off."""
    marks = json.load(open(SIGNED, encoding='utf-8')) if os.path.exists(SIGNED) else {}
    if kind in ('signed', 'to-you'):
        marks[book_id] = kind
    else:
        marks.pop(book_id, None)
    write_json(SIGNED, marks)


def add(book):
    added = json.load(open(ADDED, encoding='utf-8')) if os.path.exists(ADDED) else []
    shelves = {s['id'] for s in json.load(open(os.path.join(DATA, 'shelves.json'), encoding='utf-8'))}
    title = (book.get('title') or '').strip()
    if not title or book.get('shelf') not in shelves:
        return {'ok': False, 'error': 'A book needs a title and a shelf.'}
    i13 = isbn13(book.get('isbn', ''))
    shop = i13 if i13.startswith('2') else ''   # a Waterstones sticker code is kept, but it isn't an ISBN
    i13 = '' if shop else i13
    # the next number after the highest (not the count: a gap, like add0009, would give an id already in use)
    n = max([int(x['id'][3:]) for x in added if re.fullmatch(r'add\d+', x.get('id', ''))] + [0]) + 1
    b = {'id': f'add{n:04d}', 'title': title,
         'authors': [{'name': n.strip()} for n in book.get('authors', []) if n.strip()], 'shelf': book['shelf'],
         'isbn13': i13, 'shopCode': shop, 'publisher': book.get('publisher', ''), 'published': book.get('published', ''),
         'pages': int(book['pages']) if str(book.get('pages') or '').isdigit() else None,
         'description': book.get('description', ''), 'added': date.today().isoformat(), 'copies': 1, 'addedHere': True}
    if book.get('coverWrong') is True:   # none of the covers found was hers (1 Nov): a photo of her own copy is needed
        b['coverWrong'] = True
    if b['authors']:
        b['surname'] = b['authors'][0]['name'].split()[-1]
    b = {k: v for k, v in b.items() if v not in ('', None, [])}
    added.append(b)
    write_json(ADDED, added)   # the book is saved from here on
    try:
        after_add(book, b, i13)
        trouble = ''
    except Exception as e:   # saved all the same (review, 2 Nov: this used to say "That didn't save", and she'd add it twice)
        trouble = f'{type(e).__name__}: {e}'
        sg_log(f"added {b['id']}, but something after saving failed: {trouble}")
    r = build()
    if r.returncode != 0:   # saved, but the page for it doesn't exist yet: say so rather than jump to a missing page
        sg_log(f"added {b['id']}, but the rebuild failed: {(r.stderr or r.stdout).strip()[-300:]}")
        return {'ok': False, 'saved': True, 'error': 'The book is saved, but the site couldn’t be rebuilt, so it isn’t showing yet. Don’t add it again.'}
    return {'ok': True, 'id': b['id'], 'warning': 'Saved, but its cover or a mark may be missing.' if trouble else ''}


def after_add(book, b, i13):
    """Everything that goes with a new book once it's saved: signed, special edition, off the scanned and to-buy
    lists, its cover."""
    if book.get('signed') in ('signed', 'to-you'):
        set_signed(b['id'], book['signed'])
    special = re.sub(r'\s+', ' ', str(book.get('special') or '')).strip()[:80]
    if special:   # a special edition (Illumicrate, sprayed edges...): data/editions.json, shown under the title with a sash
        ed_path = os.path.join(DATA, 'editions.json')
        eds = json.load(open(ed_path, encoding='utf-8')) if os.path.exists(ed_path) else {}
        eds[b['id']] = special
        write_json(ed_path, eds)
    if i13:   # scanned on her phone: it comes off the scanned list now it's on a shelf
        scanned(remove=i13)
    if book.get('fromWish'):   # added from the to-buy list: it comes off the list (data/bought.json, read by the build)
        bought_path = os.path.join(DATA, 'bought.json')
        bought = json.load(open(bought_path, encoding='utf-8')) if os.path.exists(bought_path) else []
        if book['fromWish'] not in [x['wish'] for x in bought]:
            bought.append({'wish': book['fromWish'], 'book': b['id'], 'date': b['added']})
        write_json(bought_path, bought)
    cover = book.get('cover') if isinstance(book.get('cover'), str) else ''   # a shop's picture can come as a list
    straightened = STRAIGHT_URL.fullmatch(cover)
    if cover and not straightened and urllib.parse.urlparse(cover).scheme != 'https':
        cover = ''   # only https links (or a cover straightened here): never any other file on this computer
    if not cover:
        return
    covers_path = os.path.join(DATA, 'covers.json')
    covers = json.load(open(covers_path, encoding='utf-8')) if os.path.exists(covers_path) else {}
    key = i13 or 'id-' + b['id']
    if straightened:   # straightened on the Add page: the straightened picture is her cover; the link is where it came from
        from PIL import Image
        img = Image.open(os.path.join(SITE, *cover.split('/'))).convert('RGB')
        if img.height > 600:
            img = img.resize((round(img.width * 600 / img.height), 600), Image.LANCZOS)
        img.save(os.path.join(SITE, 'covers', key + '.jpg'), 'JPEG', quality=86, optimize=True, progressive=True)
        original = book.get('coverOriginal') if isinstance(book.get('coverOriginal'), str) else ''
        covers[key] = {'src': original, 'from': 'looked up when added, straightened on the Add page', 'straightened': True}
        write_json(covers_path, dict(sorted(covers.items())), indent=0)
    else:   # keep its cover like the others
        covers[key] = {'src': cover, 'from': 'looked up when added (Open Library or Waterstones)'}
        write_json(covers_path, dict(sorted(covers.items())), indent=0)
        sys.path.insert(0, os.path.join(ROOT, 'tools'))
        from copy_covers import copy
        copy(key, cover)


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):   # no console under pythonw, so nothing to log to
        pass

    def end_headers(self):          # always check for a newer copy, so a rebuild shows at once
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def reply(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def api_ok(self):
        return self.headers.get('X-Library') == '1'

    def host_ok(self):   # only this computer's own names: another site pointing its name at 127.0.0.1 gets nothing
        port = self.server.server_port
        return (self.headers.get('Host') or '').lower() in (f'localhost:{port}', f'127.0.0.1:{port}')

    def do_HEAD(self):
        if not self.host_ok():
            return self.reply({'error': 'not allowed'}, 403)
        return super().do_HEAD()

    def do_GET(self):
        if not self.host_ok():
            return self.reply({'error': 'not allowed'}, 403)
        if not self.path.startswith('/api/'):
            return super().do_GET()
        if not self.api_ok():
            return self.reply({'error': 'not allowed'}, 403)
        u = urllib.parse.urlparse(self.path)
        if u.path == '/api/lookup':
            try:
                return self.reply(lookup(urllib.parse.parse_qs(u.query).get('isbn', [''])[0]))
            except Exception as e:
                return self.reply({'found': False, 'error': str(e)})
        if u.path == '/api/straighten':   # "Cropped or at an angle" on the Add page
            try:
                q = urllib.parse.parse_qs(u.query)
                edge = int(q.get('edge', ['0'])[0]) if re.fullmatch(r'-?\d{1,2}', q.get('edge', ['0'])[0]) else 0
                if q.get('corners'):   # "Set the corners": hers
                    return self.reply(straighten_corners(q.get('src', [''])[0], q['corners'][0]))
                return self.reply(straighten(q.get('src', [''])[0], edge))
            except Exception as e:
                return self.reply({'ok': False, 'error': 'Couldn’t straighten this cover.', 'detail': str(e)})
        if u.path == '/api/outline':   # "Set the corners": where the dots start
            try:
                return self.reply(outline(urllib.parse.parse_qs(u.query).get('src', [''])[0]))
            except Exception as e:
                return self.reply({'ok': False, 'error': 'Couldn’t open this picture.', 'detail': str(e)})
        if u.path == '/api/covers':   # "Find another cover" on the Add page
            q = urllib.parse.parse_qs(u.query)
            try:
                return self.reply({'covers': other_covers(*[q.get(k, [''])[0] for k in ('isbn', 'title', 'author')])})
            except Exception as e:
                return self.reply({'covers': [], 'error': str(e)})
        if u.path == '/api/scanned':
            with LOCK:   # not while a scan is being written
                return self.reply(scanned())
        if u.path == '/api/scan-setup':
            return self.reply(scan_setup())
        self.reply({'error': 'unknown'}, 404)

    def do_POST(self):
        if self.path not in ('/api/books', '/api/scanned/remove', '/api/signed') or not self.api_ok() or not self.host_ok():
            return self.reply({'error': 'not allowed'}, 403)
        try:
            body = json.loads(self.rfile.read(int(self.headers.get('Content-Length', 0))) or b'{}')
            with LOCK:
                if self.path == '/api/books':
                    result = add(body)
                elif self.path == '/api/signed':   # a book's page: signed, signed to her, or neither; then the site is rebuilt
                    known = {b['id'] for b in json.load(open(os.path.join(DATA, 'books.json'), encoding='utf-8'))} |                             {b['id'] for b in (json.load(open(ADDED, encoding='utf-8')) if os.path.exists(ADDED) else [])}
                    if body.get('id') not in known:
                        result = {'ok': False, 'error': 'No such book.'}
                    else:
                        set_signed(body['id'], body.get('signed', ''))
                        result = {'ok': build().returncode == 0}
                else:
                    result = {'ok': True, 'left': scanned(remove=str(body.get('isbn', '')))}
            self.reply(result)
        except Exception as e:
            self.reply({'ok': False, 'error': str(e)}, 500)


class ScanHandler(http.server.BaseHTTPRequestHandler):
    """The one door on the home Wi-Fi (port 8021): a scanned book number with the key goes on the list; nothing else."""
    server_version, sys_version = 'Library', ''

    def log_message(self, *args):
        pass

    def say(self, text, code=200):   # Binary Eye shows the reply on the phone
        body = text.encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'text/plain; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        if u.path != '/scan':
            return self.say('Not found', 404)
        q = urllib.parse.parse_qs(u.query)
        if not hmac.compare_digest(q.get('key', [''])[0].encode(), scan_key().encode()):
            time.sleep(1)   # slows down anyone guessing
            return self.say('Wrong key', 403)
        isbn = book_number(q.get('isbn', [''])[0])
        if not isbn:
            return self.say('That isn’t a book barcode (it needs the one starting 978 or 979)', 400)
        try:
            title = lookup(isbn).get('title', '')
        except Exception:
            title = ''
        owned = on_shelves(isbn)
        with LOCK:
            scanned(new={'isbn': isbn, 'title': title, 'scanned': datetime.now().isoformat(timespec='seconds'), 'owned': owned})
        name = title or owned or isbn
        self.say(f'Got it: {name}' + (' (you already have a copy)' if owned else ''))


SG_HEADER = 'Title,Authors,Contributors,ISBN/UID'
SG_STATE = os.path.join(DATA, 'storygraph-source.json')
SG_LOG = os.path.join(ROOT, 'logs', 'reading-updates.log')


def sg_log(msg):
    os.makedirs(os.path.dirname(SG_LOG), exist_ok=True)
    with open(SG_LOG, 'a', encoding='utf-8') as fh:
        fh.write(f'{datetime.now():%Y-%m-%d %H:%M} {msg}\n')


def newest_export():
    downloads = os.path.join(os.path.expanduser('~'), 'Downloads')
    best = None
    for f in os.listdir(downloads):
        p = os.path.join(downloads, f)
        if not f.lower().endswith('.csv') or not os.path.isfile(p):
            continue
        try:
            with open(p, encoding='utf-8-sig') as fh:
                if not fh.readline().startswith(SG_HEADER):
                    continue
        except OSError:
            continue
        if best is None or os.path.getmtime(p) > os.path.getmtime(best):
            best = p
    return best


def import_export(p, state):
    """Import a new StoryGraph export and rebuild; the state is saved only once both worked (a failed import isn't tried again)."""
    r = subprocess.run([PYTHON, '-X', 'utf8', os.path.join(ROOT, 'tools', 'import_storygraph.py'), p, '--apply'],
                       cwd=ROOT, capture_output=True, text=True, creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
    if r.returncode != 0:
        sg_log(f'import of {os.path.basename(p)} failed: {(r.stderr or r.stdout).strip()[-300:]}')
        state['mtime'] = os.path.getmtime(p)   # don't retry the same file every 5 minutes
        write_json(SG_STATE, state)
        return
    rb = build()
    if rb.returncode != 0:   # not marked as done, so the next look tries again
        sg_log(f'imported {os.path.basename(p)}, but the rebuild failed: {(rb.stderr or rb.stdout).strip()[-300:]}')
        return
    write_json(SG_STATE, {'file': os.path.basename(p), 'mtime': os.path.getmtime(p), 'imported': datetime.now().isoformat(timespec='minutes')})
    summary = next((l for l in r.stdout.splitlines() if l.startswith(('On her shelves', '345', 'StoryGraph')) or 'StoryGraph books' in l), '')
    sg_log(f'imported {os.path.basename(p)}: {summary}')


def watch_reading():
    while True:
        try:
            p = newest_export()
            state = json.load(open(SG_STATE, encoding='utf-8')) if os.path.exists(SG_STATE) else {}
            if p and os.path.getmtime(p) > state.get('mtime', 0):
                time.sleep(10)   # let a download finish
                with LOCK:
                    import_export(p, state)
        except Exception as e:
            sg_log(f'watch failed: {e}')
        time.sleep(300)


class Server(http.server.ThreadingHTTPServer):
    allow_reuse_address = False   # on Windows "reuse" lets a second copy share the port; it must fail and stop instead


def main():
    try:
        server = Server(('127.0.0.1', PORT), functools.partial(Handler, directory=SITE))
    except OSError:
        sys.exit(0)
    threading.Thread(target=watch_reading, daemon=True).start()
    try:   # the phone's door; if it can't open, the library runs as before
        scan = Server(('0.0.0.0', SCAN_PORT), ScanHandler)
        scan_key()
        threading.Thread(target=scan.serve_forever, daemon=True).start()
    except OSError as e:
        sg_log(f'phone scanning not started: {e}')
    server.serve_forever()


if __name__ == '__main__':
    main()
