"""The local server over real web requests (on a spare port, serving a sandbox copy): who may ask what, and the
condition / inscription / signed pickers end to end. Also the reading watcher that looks in Downloads."""
import functools, json, os, sys, threading, time, unittest, urllib.error, urllib.request
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from support import Sandbox, load


class Server(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.box = Sandbox().__enter__()
        cls.serve = load('serve')
        cls.httpd = cls.serve.Server(('127.0.0.1', 0), functools.partial(cls.serve.Handler, directory=cls.serve.SITE))
        cls.port = cls.httpd.server_port
        threading.Thread(target=cls.httpd.serve_forever, daemon=True).start()
        cls.book = next(b for b in cls.box.read('books.json') if b['shelf'] == 'old-book-collection')['id']

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown(); cls.httpd.server_close()
        cls.box.__exit__(None, None, None)

    def ask(self, path, body=None, host=None, header=True, raw=None):
        h = {'Host': host or f'127.0.0.1:{self.port}'}
        if header:
            h['X-Library'] = '1'
        data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
        if data is not None:
            h['Content-Type'] = 'application/json'
        req = urllib.request.Request(f'http://127.0.0.1:{self.port}{path}', data=data, headers=h)
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.status, r.read()
        except urllib.error.HTTPError as e:
            return e.code, e.read()

    # who may ask
    def test_pages_are_served(self):
        code, body = self.ask('/index.html', header=False)
        self.assertEqual(code, 200)
        self.assertIn(b'js/app.js', body)

    def test_other_host_names_refused(self):   # a site pointing its own name at this computer gets nothing
        self.assertEqual(self.ask('/index.html', host='evil.example:80')[0], 403)
        self.assertEqual(self.ask('/api/scanned', host='evil.example:80')[0], 403)

    def test_api_needs_the_site_header(self):
        self.assertEqual(self.ask('/api/scanned', header=False)[0], 403)
        self.assertEqual(self.ask('/api/condition', {'id': self.book, 'condition': 'Good'}, header=False)[0], 403)

    def test_no_files_outside_the_site(self):
        for p in ('/../data/books.json', '/..%2fdata%2fbooks.json', '/%2e%2e/tools/serve.py'):
            code, body = self.ask(p, header=False)
            self.assertFalse(code == 200 and (b'"isbn13"' in body or b'def ' in body), p)

    def test_unknown_post_refused(self):
        self.assertEqual(self.ask('/api/delete-everything', {})[0], 403)

    def test_oversized_request_refused(self):   # refused unread: the answer is 413, or the line is simply cut
        try:
            code = self.ask('/api/signed', raw=b'{"id":"' + b'x' * 1_100_000 + b'"}')[0]
        except (ConnectionError, urllib.error.URLError):
            code = 413
        self.assertEqual(code, 413)
        self.assertNotIn('x' * 50, json.dumps(self.box.read('signed.json', {})))

    def test_bad_json_is_an_error_not_a_crash(self):
        code, body = self.ask('/api/signed', raw=b'{not json')
        self.assertEqual(code, 500)
        self.assertFalse(json.loads(body)['ok'])

    def test_unknown_book_refused(self):
        code, body = self.ask('/api/condition', {'id': 'no-such-book', 'condition': 'Good'})
        self.assertEqual(json.loads(body), {'ok': False, 'error': 'No such book.'})

    def test_cover_tools_refuse_local_files(self):
        code, body = self.ask('/api/straighten?src=' + urllib.request.quote('file:///C:/Windows/win.ini'))
        self.assertFalse(json.loads(body)['ok'])
        code, body = self.ask('/api/outline?src=' + urllib.request.quote('C:/Windows/win.ini'))
        self.assertFalse(json.loads(body)['ok'])

    # the pickers end to end (real rebuild of the sandbox)
    def test_condition_saved_and_on_the_site(self):
        code, body = self.ask('/api/condition', {'id': self.book, 'condition': 'Fair'})
        self.assertEqual(json.loads(body), {'ok': True})
        self.assertEqual({b['id']: b for b in self.box.built()['books']}[self.book].get('condition'), 'Fair')

    def test_inscription_saved_and_on_the_site(self):
        text = "For Mary, Christmas 1952 — ‘be good’"
        code, body = self.ask('/api/inscription', {'id': self.book, 'inscription': text})
        self.assertEqual(json.loads(body), {'ok': True})
        self.assertEqual({b['id']: b for b in self.box.built()['books']}[self.book].get('inscription'), text)

    def test_scanned_list(self):
        self.box.write('scanned.json', [{'isbn': '9780306406157', 'title': 'x'}])
        self.assertEqual(json.loads(self.ask('/api/scanned')[1])[0]['isbn'], '9780306406157')
        code, body = self.ask('/api/scanned/remove', {'isbn': '9780306406157'})
        self.assertEqual(json.loads(body)['left'], [])


class ReadingWatcher(unittest.TestCase):
    """Every 5 minutes the server looks in Downloads for the newest StoryGraph export."""

    def setUp(self):
        self.box = Sandbox(data=False).__enter__()
        self.serve = load('serve')

    def tearDown(self):
        self.box.__exit__(None, None, None)

    def put(self, name, content, when, encoding='utf-8'):
        p = os.path.join(self.box.downloads, name)
        with open(p, 'w', encoding=encoding, newline='') as fh:
            fh.write(content)
        os.utime(p, (when, when))
        return p

    def test_finds_the_newest_storygraph_export(self):
        now = time.time()
        self.put('old.csv', self.serve.SG_HEADER + ',Format\nA,B,,,x\n', now - 100)
        new = self.put('new.csv', self.serve.SG_HEADER + ',Format\nA,B,,,x\n', now)
        self.put('other.csv', 'Date,Amount\n1,2\n', now + 50)
        self.assertEqual(self.serve.newest_export(), new)

    def test_a_bank_statement_doesnt_stop_it(self):   # 9 Nov: a £ in a non-UTF-8 file stopped every import
        good = self.put('sg.csv', self.serve.SG_HEADER + '\n', time.time() - 10)
        self.put('Statement Download.csv', 'Date,Description,Amount\n05/11,Shop,£12.00\n', time.time(), encoding='cp1252')
        self.assertEqual(self.serve.newest_export(), good)

    def test_nothing_there(self):
        self.assertIsNone(self.serve.newest_export())


if __name__ == '__main__':
    unittest.main()
