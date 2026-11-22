"""Page tests: the real site (a throwaway copy, served by the real server code on a spare port) in headless Chrome or
Edge, with tests/e2e/harness.js and a test file loaded into it. Two runs:

  HerLibrary   site.test.js on a copy of her own library: every page, link and picture, and every page's figures
               checked against what it lists
  MadeUp       fixture.test.js on a small made-up library (tests/fixture_library.py, built by the real build), so the
               answers are known exactly: titles, series, copies, reading counts, search, old books, the Add page
  Phone        phone.test.js on a copy of her own library in a 390 x 844 window: the top bar and drawer, every kind of
               page fitting the width, things big enough to tap

Each JavaScript test is its own result here (named after the test, its words as the description), so
`run_tests.py e2e -k search` runs just those; the page then runs only the chosen ones."""
import functools, http.server, json, os, queue, re, shutil, subprocess, sys, tempfile, threading, unittest, urllib.parse
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from support import HERE, Sandbox, load, run_build
import fixture_library

BROWSERS = [r'C:\Program Files\Google\Chrome\Application\chrome.exe', r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe']
BROWSER = next((b for b in BROWSERS if os.path.exists(b)), None)
E2E = os.path.join(HERE, 'e2e')
TEST_DEF = re.compile(r'^\s*(test|knownBug)\(\s*"((?:[^"\\]|\\.)*)"', re.M)


def js_tests(name):
    """[(kind, test name)] in a test file, in order."""
    return [(kind, json.loads(f'"{n}"')) for kind, n in TEST_DEF.findall(open(os.path.join(E2E, name), encoding='utf-8').read())]


def method_name(name):
    return 'test_' + re.sub(r'[^a-z0-9]+', '_', name.lower().replace('’', '').replace("'", '')).strip('_')


class _Results(http.server.BaseHTTPRequestHandler):
    """Receives the page's results (the page sends them here when it's done)."""
    box = None

    def log_message(self, *a):
        pass

    def do_POST(self):
        _Results.box.put(self.rfile.read(int(self.headers.get('Content-Length', 0))).decode('utf-8'))
        self.send_response(204); self.end_headers()


def run_page(box, test_file, only=None, timeout=300, frame=None):
    """Open the sandbox's site with the harness and test_file in it; the page's results, as a list. frame (width, height):
    the site opened inside a frame that size, as on a phone (headless Chrome won't make its window narrower than about
    500px; inside the frame the page and its layout see exactly that size)."""
    site = box.path('site')
    page = open(os.path.join(site, 'index.html'), encoding='utf-8').read()
    # deferred, like js/app.js (22 Nov: it waits for the family's /family/family.js), so they still run after it
    page = page.replace('</body>', f'<script src="__tests__/harness.js" defer></script><script src="__tests__/{test_file}" defer></script></body>')
    os.makedirs(os.path.join(site, '__tests__'), exist_ok=True)
    for f in ('harness.js', test_file):
        shutil.copy(os.path.join(E2E, f), os.path.join(site, '__tests__', f))
    serve = load('serve')
    httpd = serve.Server(('127.0.0.1', 0), functools.partial(serve.Handler, directory=serve.SITE))
    _Results.box = queue.Queue()
    inbox = http.server.ThreadingHTTPServer(('127.0.0.1', 0), _Results)
    # the page's Content Security Policy (22 Nov) lets it talk only to its own server and embed no frames; the test copy may
    # also send its results to the inbox on its own port, and open the site itself in frames (the 899/901 and 360 checks):
    # the only changes to the policy, and only in the test copy
    for csp, more in (("connect-src 'self'", f"connect-src 'self' http://127.0.0.1:{inbox.server_port}"), ("frame-src 'none'", "frame-src 'self'")):
        assert csp in page, f"the page’s Content Security Policy has no {csp}"
        page = page.replace(csp, more, 1)
    open(os.path.join(site, '__test__.html'), 'w', encoding='utf-8').write(page)
    for srv in (httpd, inbox):
        threading.Thread(target=srv.serve_forever, daemon=True).start()
    query = {'report': inbox.server_port}
    if only is not None:
        query['only'] = json.dumps(sorted(only))
    if os.environ.get('LIBRARY_TEST_ORDER'):   # reverse, or shuffle-<seed>: to find tests that lean on each other
        query['order'] = os.environ['LIBRARY_TEST_ORDER']
    page_name = f'__test__.html?{urllib.parse.urlencode(query)}'
    if frame:
        w, h = frame
        open(os.path.join(site, '__frame__.html'), 'w', encoding='utf-8').write(
            f'<!doctype html><meta charset="utf-8"><body style="margin:0"><iframe src="{page_name}" width="{w}" height="{h}" style="border:0;display:block"></iframe>')
        page_name = '__frame__.html'
    profile = tempfile.mkdtemp(prefix='library-chrome-')
    chrome = subprocess.Popen([BROWSER, '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
                               '--disable-extensions', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
                               f'--user-data-dir={profile}', '--window-size=1280,900',
                               f'http://127.0.0.1:{httpd.server_port}/{page_name}'],
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        body = _Results.box.get(timeout=timeout)
    except queue.Empty:
        raise RuntimeError(f'the page tests ({test_file}) didn’t report back within {timeout} seconds')
    finally:
        chrome.kill(); chrome.wait()
        for srv in (httpd, inbox):
            srv.shutdown(); srv.server_close()
        shutil.rmtree(profile, ignore_errors=True)
    return json.loads(body)


class PageTests(unittest.TestCase):
    """One JavaScript test file; its tests are added as methods by page_tests() below."""
    test_file = None
    frame = None   # (width, height): run inside a frame that size, as on a phone
    selected = None   # the methods chosen to run (load_tests fills it in); None or empty: all
    results = None

    @classmethod
    def make_box(cls):
        return Sandbox()

    @classmethod
    def prepare(cls, box):
        """Anything the sandbox needs before the page opens."""

    @classmethod
    def setUpClass(cls):
        everything = {method_name(n): n for _, n in js_tests(cls.test_file)}
        chosen = None if not cls.selected or set(cls.selected) >= set(everything) else {everything[m] for m in cls.selected}
        cls.box = cls.make_box().__enter__()
        try:
            cls.prepare(cls.box)
            found = run_page(cls.box, cls.test_file, only=chosen, frame=cls.frame)
        except BaseException:
            cls.box.__exit__(None, None, None)
            cls.box = None
            raise
        cls.results = {r['name']: r for r in found}
        strays = set(cls.results) - set(everything.values())
        if strays:
            raise AssertionError(f'{cls.test_file}: results for tests not written plainly as test("…"): {sorted(strays)}')

    @classmethod
    def tearDownClass(cls):
        if getattr(cls, 'box', None):
            cls.box.__exit__(None, None, None)

    def check(self, name):
        r = self.results.get(name)
        if r is None:
            self.fail('this page test didn’t run (did the page stop early?)')
        if not r['ok']:
            self.fail(r.get('error'))


def page_tests(cls):
    """A method for each test in cls.test_file (a knownBug one marked as an expected failure)."""
    seen = set()
    for kind, name in js_tests(cls.test_file):
        m = method_name(name)
        if m in seen:
            raise ValueError(f'{cls.test_file}: two tests come out as {m}; give one another name')
        seen.add(m)

        def run(self, name=name):
            self.check(name)
        run.__doc__ = name
        run.__name__ = m
        setattr(cls, m, unittest.expectedFailure(run) if kind == 'knownBug' else run)
    return cls


@unittest.skipUnless(BROWSER, 'needs Chrome or Edge')
@page_tests
class HerLibrary(PageTests):
    test_file = 'site.test.js'


@unittest.skipUnless(BROWSER, 'needs Chrome or Edge')
@page_tests
class MadeUp(PageTests):
    test_file = 'fixture.test.js'

    @classmethod
    def make_box(cls):
        return Sandbox(data=False, covers=False)

    @classmethod
    def prepare(cls, box):
        fixture_library.make(box)
        run_build(box)


@unittest.skipUnless(BROWSER, 'needs Chrome or Edge')
@page_tests
class Phone(PageTests):
    """phone.test.js on a copy of her own library, in a 390 x 844 window (21 Nov: the phone layout)."""
    test_file = 'phone.test.js'
    frame = (390, 844)


def load_tests(loader, tests, pattern):
    """Tell each page which of its tests were chosen (-k), so it runs only those."""
    def walk(suite):
        for t in suite:
            yield from (walk(t) if isinstance(t, unittest.TestSuite) else [t])
    for cls in (HerLibrary, MadeUp, Phone):
        cls.selected = []
    for t in walk(tests):
        if isinstance(t, PageTests):
            type(t).selected.append(t._testMethodName)
    return tests


if __name__ == '__main__':
    unittest.main()
