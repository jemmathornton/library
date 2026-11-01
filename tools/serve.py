"""Serve site/ at http://localhost:8020 for the library's app window, and let it add books.

Started at login with no window by the shortcut tools/make_shortcuts.ps1 puts in her Startup folder. Only this computer
can reach it. If it's already running, a second copy just stops.

    pythonw tools/serve.py

Adding a book (the site's "Add a book" page, 18 Oct):
    GET  /api/lookup?isbn=...   the book's details from Open Library (title, authors, publisher, date, pages, cover);
                                Waterstones fills what Open Library hasn't got yet (new books, 1 Nov), and a Waterstones
                                price-sticker code (13 digits starting 2) is looked up there alone
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
import functools, hmac, http.server, json, os, re, secrets, subprocess, sys, threading, time, urllib.parse, urllib.request
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
    return {'found': True, 'isbn': isbn, 'title': book['name'], 'authors': [p['name'] for p in people if p.get('name')],
            'publisher': pub.group(1).strip().replace('&#039;', "'").replace('&amp;', '&') if pub else '',
            'published': book.get('datePublished', ''), 'pages': book.get('numberOfPages'), 'cover': book.get('image', '')}


def lookup(isbn):
    isbn = re.sub(r'[^0-9Xx]', '', isbn).upper()
    if re.fullmatch(r'2\d{12}', isbn):   # a Waterstones price sticker (her yes, 1 Nov): it names that exact edition on their site
        try:
            return waterstones(isbn) or {'found': False, 'isbn': isbn}
        except Exception:
            return {'found': False, 'isbn': isbn}
    d = get_json(f'https://openlibrary.org/api/books?format=json&jscmd=data&bibkeys=ISBN:{isbn}').get(f'ISBN:{isbn}')
    if not d:
        try:
            return waterstones(isbn) or {'found': False, 'isbn': isbn}
        except Exception:
            return {'found': False, 'isbn': isbn}
    c = d.get('cover') or {}
    found = {'found': True, 'isbn': isbn, 'title': (d.get('title', '') + (': ' + d['subtitle'] if d.get('subtitle') else '')).strip(),
             'authors': [a['name'] for a in d.get('authors', [])], 'publisher': ', '.join(p['name'] for p in d.get('publishers', [])),
             'published': d.get('publish_date', ''), 'pages': d.get('number_of_pages'), 'cover': c.get('large') or c.get('medium') or ''}
    if not (found['cover'] and found['pages'] and found['published']):   # a half-made new entry: Waterstones fills the gaps
        try:
            ws = waterstones(isbn) or {}
        except Exception:
            ws = {}
        for k in ('title', 'authors', 'published', 'pages', 'cover'):
            found[k] = found[k] or ws.get(k) or found[k]
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
        with open(SCANNED, 'w', encoding='utf-8', newline='\n') as fh:
            json.dump(items, fh, ensure_ascii=False, indent=1)
            fh.write('\n')
    return items


def on_shelves(isbn):
    """The title of a copy she already owns with this ISBN, or ''."""
    for path in (os.path.join(DATA, 'books.json'), ADDED):
        if os.path.exists(path):
            for b in json.load(open(path, encoding='utf-8')):
                if b.get('isbn13') == isbn:
                    return b.get('title', '')
    return ''


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
    if b['authors']:
        b['surname'] = b['authors'][0]['name'].split()[-1]
    b = {k: v for k, v in b.items() if v not in ('', None, [])}
    added.append(b)
    with open(ADDED, 'w', encoding='utf-8', newline='\n') as fh:
        json.dump(added, fh, ensure_ascii=False, indent=1)
        fh.write('\n')
    if i13:   # scanned on her phone: it comes off the scanned list now it's on a shelf
        scanned(remove=i13)
    if book.get('fromWish'):   # added from the to-buy list: it comes off the list (data/bought.json, read by the build)
        bought_path = os.path.join(DATA, 'bought.json')
        bought = json.load(open(bought_path, encoding='utf-8')) if os.path.exists(bought_path) else []
        if book['fromWish'] not in [x['wish'] for x in bought]:
            bought.append({'wish': book['fromWish'], 'book': b['id'], 'date': b['added']})
        with open(bought_path, 'w', encoding='utf-8', newline='\n') as fh:
            json.dump(bought, fh, ensure_ascii=False, indent=1)
            fh.write('\n')
    if book.get('cover') and urllib.parse.urlparse(book['cover']).scheme != 'https':
        book['cover'] = ''   # only https links: never a file on this computer
    if book.get('cover'):   # keep its cover like the others
        covers_path = os.path.join(DATA, 'covers.json')
        covers = json.load(open(covers_path, encoding='utf-8')) if os.path.exists(covers_path) else {}
        key = i13 or 'id-' + b['id']
        covers[key] = {'src': book['cover'], 'from': 'looked up when added (Open Library or Waterstones)'}
        with open(covers_path, 'w', encoding='utf-8', newline='\n') as fh:
            json.dump(dict(sorted(covers.items())), fh, ensure_ascii=False, indent=0)
            fh.write('\n')
        sys.path.insert(0, os.path.join(ROOT, 'tools'))
        from copy_covers import copy
        copy(key, book['cover'])
    r = build()
    if r.returncode != 0:   # saved, but the page for it doesn't exist yet: say so rather than jump to a missing page
        sg_log(f"added {b['id']}, but the rebuild failed: {(r.stderr or r.stdout).strip()[-300:]}")
        return {'ok': False, 'error': 'The book is saved, but the site couldn’t be rebuilt, so it isn’t showing yet. Don’t add it again.'}
    return {'ok': True, 'id': b['id']}


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
        if u.path == '/api/scanned':
            return self.reply(scanned())
        if u.path == '/api/scan-setup':
            return self.reply(scan_setup())
        self.reply({'error': 'unknown'}, 404)

    def do_POST(self):
        if self.path not in ('/api/books', '/api/scanned/remove') or not self.api_ok() or not self.host_ok():
            return self.reply({'error': 'not allowed'}, 403)
        try:
            body = json.loads(self.rfile.read(int(self.headers.get('Content-Length', 0))) or b'{}')
            with LOCK:
                result = add(body) if self.path == '/api/books' else {'ok': True, 'left': scanned(remove=str(body.get('isbn', '')))}
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
        with open(SG_STATE, 'w', encoding='utf-8', newline='\n') as fh:
            json.dump(state, fh, indent=1)
        return
    rb = build()
    if rb.returncode != 0:   # not marked as done, so the next look tries again
        sg_log(f'imported {os.path.basename(p)}, but the rebuild failed: {(rb.stderr or rb.stdout).strip()[-300:]}')
        return
    with open(SG_STATE, 'w', encoding='utf-8', newline='\n') as fh:
        json.dump({'file': os.path.basename(p), 'mtime': os.path.getmtime(p), 'imported': datetime.now().isoformat(timespec='minutes')}, fh, indent=1)
        fh.write('\n')
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
