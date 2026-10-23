"""Serve site/ at http://localhost:8020 for the library's app window, and let it add books.

Started at login with no window by the shortcut tools/make_shortcuts.ps1 puts in her Startup folder. Only this computer
can reach it. If it's already running, a second copy just stops.

    pythonw tools/serve.py

Adding a book (the site's "Add a book" page, 18 Oct):
    GET  /api/lookup?isbn=...   the book's details from Open Library (title, authors, publisher, date, pages, cover)
    POST /api/books             saves it to data/added.json (kept apart from the Libib import, which a re-import
                                overwrites), copies its cover into site/covers and rebuilds the site
Both need the header "X-Library: 1", which only the site itself sends: a page from anywhere else can't add books.

New reading (18 Oct, her ask): every 5 minutes it looks in her Downloads for the newest StoryGraph export (a CSV whose
first line is StoryGraph's own column list). When there's a newer one than last time, tools/import_storygraph.py copies
it into imports/ and brings it in, and the site is rebuilt. Her Downloads file is only read, never changed.
Last import in data/storygraph-source.json; what happened in logs/reading-updates.log.
"""
import functools, http.server, json, os, re, subprocess, sys, threading, time, urllib.parse, urllib.request
from datetime import date, datetime

PORT = 8020
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE, DATA = os.path.join(ROOT, 'site'), os.path.join(ROOT, 'data')
ADDED = os.path.join(DATA, 'added.json')
UA = {'User-Agent': "Jemma's Home Library (private)"}
PYTHON = os.path.join(os.path.dirname(sys.executable), 'python.exe')   # under pythonw, run the build with python


def get_json(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=20) as r:
        return json.load(r)


def lookup(isbn):
    isbn = re.sub(r'[^0-9Xx]', '', isbn).upper()
    d = get_json(f'https://openlibrary.org/api/books?format=json&jscmd=data&bibkeys=ISBN:{isbn}').get(f'ISBN:{isbn}')
    if not d:
        return {'found': False, 'isbn': isbn}
    c = d.get('cover') or {}
    return {'found': True, 'isbn': isbn, 'title': (d.get('title', '') + (': ' + d['subtitle'] if d.get('subtitle') else '')).strip(),
            'authors': [a['name'] for a in d.get('authors', [])], 'publisher': ', '.join(p['name'] for p in d.get('publishers', [])),
            'published': d.get('publish_date', ''), 'pages': d.get('number_of_pages'), 'cover': c.get('large') or c.get('medium') or ''}


def isbn13(s):
    s = re.sub(r'[^0-9Xx]', '', s or '').upper()
    if len(s) == 10:
        core = '978' + s[:9]
        return core + str((10 - sum((3 if i % 2 else 1) * int(ch) for i, ch in enumerate(core)) % 10) % 10)
    return s if len(s) == 13 else ''


def add(book):
    added = json.load(open(ADDED, encoding='utf-8')) if os.path.exists(ADDED) else []
    shelves = {s['id'] for s in json.load(open(os.path.join(DATA, 'shelves.json'), encoding='utf-8'))}
    title = (book.get('title') or '').strip()
    if not title or book.get('shelf') not in shelves:
        return {'ok': False, 'error': 'A book needs a title and a shelf.'}
    i13 = isbn13(book.get('isbn', ''))
    # the next number after the highest (not the count: a gap, like add0009, would give an id already in use)
    n = max([int(x['id'][3:]) for x in added if re.fullmatch(r'add\d+', x.get('id', ''))] + [0]) + 1
    b = {'id': f'add{n:04d}', 'title': title,
         'authors': [{'name': n.strip()} for n in book.get('authors', []) if n.strip()], 'shelf': book['shelf'],
         'isbn13': i13, 'publisher': book.get('publisher', ''), 'published': book.get('published', ''),
         'pages': int(book['pages']) if str(book.get('pages') or '').isdigit() else None,
         'description': book.get('description', ''), 'added': date.today().isoformat(), 'copies': 1, 'addedHere': True}
    if b['authors']:
        b['surname'] = b['authors'][0]['name'].split()[-1]
    b = {k: v for k, v in b.items() if v not in ('', None, [])}
    added.append(b)
    with open(ADDED, 'w', encoding='utf-8', newline='\n') as fh:
        json.dump(added, fh, ensure_ascii=False, indent=1)
        fh.write('\n')
    if book.get('fromWish'):   # added from the to-buy list: it comes off the list (data/bought.json, read by the build)
        bought_path = os.path.join(DATA, 'bought.json')
        bought = json.load(open(bought_path, encoding='utf-8')) if os.path.exists(bought_path) else []
        if book['fromWish'] not in [x['wish'] for x in bought]:
            bought.append({'wish': book['fromWish'], 'book': b['id'], 'date': b['added']})
        with open(bought_path, 'w', encoding='utf-8', newline='\n') as fh:
            json.dump(bought, fh, ensure_ascii=False, indent=1)
            fh.write('\n')
    if book.get('cover'):   # keep its cover like the others
        covers_path = os.path.join(DATA, 'covers.json')
        covers = json.load(open(covers_path, encoding='utf-8')) if os.path.exists(covers_path) else {}
        key = i13 or 'id-' + b['id']
        covers[key] = {'src': book['cover'], 'from': 'Open Library (added here)'}
        with open(covers_path, 'w', encoding='utf-8', newline='\n') as fh:
            json.dump(dict(sorted(covers.items())), fh, ensure_ascii=False, indent=0)
            fh.write('\n')
        sys.path.insert(0, os.path.join(ROOT, 'tools'))
        from copy_covers import copy
        copy(key, book['cover'])
    subprocess.run([PYTHON, '-X', 'utf8', os.path.join(ROOT, 'tools', 'build.py')], cwd=ROOT, capture_output=True,
                   creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
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

    def do_GET(self):
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
        self.reply({'error': 'unknown'}, 404)

    def do_POST(self):
        if self.path != '/api/books' or not self.api_ok():
            return self.reply({'error': 'not allowed'}, 403)
        try:
            book = json.loads(self.rfile.read(int(self.headers.get('Content-Length', 0))) or b'{}')
            self.reply(add(book))
        except Exception as e:
            self.reply({'ok': False, 'error': str(e)}, 500)


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


def watch_reading():
    while True:
        try:
            p = newest_export()
            state = json.load(open(SG_STATE, encoding='utf-8')) if os.path.exists(SG_STATE) else {}
            if p and os.path.getmtime(p) > state.get('mtime', 0):
                time.sleep(10)   # let a download finish
                r = subprocess.run([PYTHON, '-X', 'utf8', os.path.join(ROOT, 'tools', 'import_storygraph.py'), p, '--apply'],
                                   cwd=ROOT, capture_output=True, text=True, creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
                if r.returncode == 0:
                    subprocess.run([PYTHON, '-X', 'utf8', os.path.join(ROOT, 'tools', 'build.py')], cwd=ROOT, capture_output=True,
                                   creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
                    with open(SG_STATE, 'w', encoding='utf-8', newline='\n') as fh:
                        json.dump({'file': os.path.basename(p), 'mtime': os.path.getmtime(p), 'imported': datetime.now().isoformat(timespec='minutes')}, fh, indent=1)
                        fh.write('\n')
                    summary = next((l for l in r.stdout.splitlines() if l.startswith(('On her shelves', '345', 'StoryGraph')) or 'StoryGraph books' in l), '')
                    sg_log(f'imported {os.path.basename(p)}: {summary}')
                else:
                    sg_log(f'import of {os.path.basename(p)} failed: {(r.stderr or r.stdout).strip()[-300:]}')
                    state['mtime'] = os.path.getmtime(p)   # don't retry the same file every 5 minutes
                    with open(SG_STATE, 'w', encoding='utf-8', newline='\n') as fh:
                        json.dump(state, fh, indent=1)
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
    server.serve_forever()


if __name__ == '__main__':
    main()
