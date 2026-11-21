"""The phone-scan door (tools/serve.py's second listener, port 8021 at home; here a spare port on this computer only):
the key, the book number check, what goes on the scanned list, and the owned flag. Book lookups are faked, so nothing
goes out to the internet."""
import json, os, sys, threading, types, unittest, urllib.error, urllib.parse, urllib.request
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from support import Sandbox, load

OWNED = '9781234567897'      # a book on her (made-up) shelves
NEW = '9780306406157'        # a real book number she hasn't got


class ScanDoor(unittest.TestCase):
    def setUp(self):
        self.box = Sandbox(data=False, covers=False).__enter__()
        self.box.write('books.json', [{'id': 'fx-apos', 'title': "The Fox's Winter", 'isbn13': OWNED, 'shelf': 'fantasy'}])
        self.serve = load('serve')
        self.looked = []

        def find(isbn):   # the scan asks for the name only (21 Nov: no cover hunting while the phone waits)
            self.looked.append(isbn)
            return {'found': True, 'title': 'Looked-up Title'}
        self.serve.find = find
        self.serve.time = types.SimpleNamespace(sleep=lambda s: None)   # no pause after a wrong key (this module only)
        self.httpd = self.serve.Server(('127.0.0.1', 0), self.serve.ScanHandler)
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()
        self.key = self.serve.scan_key()

    def tearDown(self):
        self.httpd.shutdown(); self.httpd.server_close()
        self.box.__exit__(None, None, None)

    def scan(self, isbn, key=None, path='/scan'):
        q = urllib.parse.urlencode({'key': self.key if key is None else key, 'isbn': isbn})
        try:
            with urllib.request.urlopen(f'http://127.0.0.1:{self.httpd.server_port}{path}?{q}', timeout=30) as r:
                return r.status, r.read().decode('utf-8')
        except urllib.error.HTTPError as e:
            return e.code, e.read().decode('utf-8')

    def waiting(self):
        return self.box.read('scanned.json', [])

    def test_the_key_is_made_once_and_kept_outside_the_library(self):
        self.assertRegex(self.key, r'^[a-z2-9]{12}$')
        self.assertTrue(self.serve.KEY_FILE.startswith(self.box.appdata))
        self.assertEqual(load('serve').scan_key(), self.key, 'a new key was made')

    def test_wrong_key_refused_and_nothing_listed(self):
        self.assertEqual(self.scan(NEW, key='wrongwrongwr')[0], 403)
        self.assertEqual(self.scan(NEW, key='')[0], 403)
        self.assertEqual(self.waiting(), [])
        self.assertEqual(self.looked, [], 'looked a book up for a stranger')

    def test_not_a_book_number_refused(self):
        for bad in ('9780306406158', '2000001234567', '0306406152', '97803064061', 'hello', ''):
            code, text = self.scan(bad)
            self.assertEqual(code, 400, bad)
            self.assertIn('978 or 979', text)
        self.assertEqual(self.waiting(), [])

    def test_a_good_scan_goes_on_the_list(self):
        code, text = self.scan(NEW)
        self.assertEqual((code, text), (200, 'Got it: Looked-up Title'))
        [item] = self.waiting()
        self.assertEqual((item['isbn'], item['title'], item['owned']), (NEW, 'Looked-up Title', ''))
        self.assertRegex(item['scanned'], r'^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d$')

    def test_hyphens_and_spaces_in_a_scan_are_fine(self):
        self.assertEqual(self.scan('978-0-306-40615-7')[0], 200)
        self.assertEqual([x['isbn'] for x in self.waiting()], [NEW])

    def test_a_book_she_owns_is_flagged(self):
        code, text = self.scan(OWNED)
        self.assertEqual(code, 200)
        self.assertIn('you already have a copy', text)
        self.assertEqual(self.waiting()[0]['owned'], "The Fox's Winter")

    def test_a_copy_she_removed_doesnt_count_as_owned(self):
        self.box.write('removed.json', [{'id': 'fx-apos', 'title': "The Fox's Winter"}])
        self.scan(OWNED)
        self.assertEqual(self.waiting()[0]['owned'], '')

    def test_scanning_twice_lists_it_once(self):
        self.scan(NEW); self.scan(OWNED); self.scan(NEW)
        self.assertEqual([x['isbn'] for x in self.waiting()], [OWNED, NEW])

    def test_a_failed_lookup_still_lists_the_scan(self):
        def broken(isbn):
            raise OSError('no internet')
        self.serve.find = broken
        code, text = self.scan(NEW)
        self.assertEqual((code, text), (200, f'Got it: {NEW}'))
        self.assertEqual(self.waiting()[0]['title'], '')

    def test_an_empty_key_file_never_lets_a_keyless_scan_in(self):   # review, 21 Nov: '' matched ''
        open(self.serve.KEY_FILE, 'w').close()
        self.assertEqual(self.scan(NEW, key='')[0], 403)
        new = self.serve.scan_key()
        self.assertRegex(new, r'^[a-z2-9]{12}$', 'a fresh key is made')
        self.assertEqual(open(self.serve.KEY_FILE, encoding='utf-8').read(), new)
        self.assertEqual(self.waiting(), [])

    def test_a_damaged_scanned_list_doesnt_lose_the_scan(self):   # review, 21 Nov
        open(self.box.path('data', 'scanned.json'), 'w').write('{not json')
        self.assertEqual(self.scan(NEW)[0], 200)
        self.assertEqual([x['isbn'] for x in self.waiting()], [NEW])

    def test_the_scan_doesnt_go_hunting_for_covers(self):   # the phone gives up waiting (review, 21 Nov)
        self.serve.lookup = lambda isbn: self.fail('the full lookup (with covers) was used for a scan')
        self.assertEqual(self.scan(NEW)[0], 200)

    def test_nothing_else_is_served(self):
        self.assertEqual(self.scan(NEW, path='/')[0], 404)
        self.assertEqual(self.scan(NEW, path='/api/scanned')[0], 404)
        self.assertEqual(self.scan(NEW, path='/index.html')[0], 404)
        req = urllib.request.Request(f'http://127.0.0.1:{self.httpd.server_port}/scan', data=b'{}', method='POST')
        with self.assertRaises(urllib.error.HTTPError) as e:
            urllib.request.urlopen(req, timeout=30)
        self.assertEqual(e.exception.code, 501)
        self.assertEqual(self.waiting(), [])


if __name__ == '__main__':
    unittest.main()
