"""Adding a book on the Add page (serve.add): what's saved, the book's number, its cover, and what else changes."""
import os, sys, types, unittest
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from support import Sandbox, load


class Done:   # what the fake rebuild returns
    def __init__(self, code=0):
        self.returncode, self.stdout, self.stderr = code, '', 'boom' if code else ''


class AddBook(unittest.TestCase):
    def setUp(self):
        self.box = Sandbox().__enter__()
        self.serve = load('serve')
        self.builds = 0

        def fake_build():
            self.builds += 1
            return Done(0)
        self.serve.build = fake_build
        self.copied = []
        fake = types.ModuleType('copy_covers')
        fake.copy = lambda key, src: (self.copied.append((key, src)), (key, None))[1]
        self._real_cc = sys.modules.get('copy_covers')
        sys.modules['copy_covers'] = fake
        self.shelf = self.box.read('shelves.json')[1]['id']

    def tearDown(self):
        if self._real_cc is None:
            sys.modules.pop('copy_covers', None)
        else:
            sys.modules['copy_covers'] = self._real_cc
        self.box.__exit__(None, None, None)

    def add(self, **kw):
        book = {'title': 'A Test Book', 'authors': ['Ann Author'], 'shelf': self.shelf, **kw}
        return self.serve.add(book)

    def added(self):
        return self.box.read('added.json', [])

    # what's needed
    def test_needs_title_and_shelf(self):
        self.assertFalse(self.add(title='  ')['ok'])
        self.assertFalse(self.add(shelf='no-such-shelf')['ok'])
        self.assertEqual(self.builds, 0)

    def test_saved_and_rebuilt(self):
        before = len(self.added())
        r = self.add(isbn='0-306-40615-2', publisher='Pub', published='2020', pages='321')
        self.assertTrue(r['ok'], r)
        b = self.added()[-1]
        self.assertEqual(len(self.added()), before + 1)
        self.assertEqual((b['id'], b['title'], b['isbn13'], b['pages'], b['surname']), (r['id'], 'A Test Book', '9780306406157', 321, 'Author'))
        self.assertEqual(self.builds, 1)

    def test_shop_sticker_is_not_an_isbn(self):
        self.add(isbn='2000001234567')
        b = self.added()[-1]
        self.assertEqual(b.get('shopCode'), '2000001234567')
        self.assertNotIn('isbn13', b)

    # its number
    def test_numbers_go_up(self):
        a, b = self.add()['id'], self.add()['id']
        self.assertEqual(int(b[3:]), int(a[3:]) + 1)

    def test_number_not_reused_after_one_is_taken_out(self):   # review, 9 Nov
        first = self.add(signed='signed')['id']
        self.box.write('added.json', [x for x in self.added() if x['id'] != first])   # taken out by hand
        again = self.add()['id']
        self.assertNotEqual(again, first, 'a removed book’s number (and its signed mark) went to the next book')

    # what goes with it
    def test_signed_and_special_edition(self):
        r = self.add(signed='to-you', special='  Illumicrate   Edition ')
        self.assertEqual(self.box.read('signed.json')[r['id']], 'to-you')
        self.assertEqual(self.box.read('editions.json')[r['id']], 'Illumicrate Edition')

    def test_comes_off_the_to_buy_list(self):
        r = self.add(fromWish='buy-something')
        self.assertIn({'wish': 'buy-something', 'book': r['id']}, [{k: x[k] for k in ('wish', 'book')} for x in self.box.read('bought.json')])

    def test_comes_off_the_scanned_list(self):
        self.box.write('scanned.json', [{'isbn': '9780306406157', 'title': 'x'}, {'isbn': '9780000000002', 'title': 'y'}])
        self.add(isbn='9780306406157')
        self.assertEqual([x['isbn'] for x in self.box.read('scanned.json')], ['9780000000002'])

    # its cover
    def test_cover_saved_under_its_isbn(self):
        isbn = '9781234567897'
        self.add(isbn=isbn, cover='https://example.org/c.jpg')
        self.assertEqual(self.box.read('covers.json')[isbn]['src'], 'https://example.org/c.jpg')
        self.assertEqual(self.copied, [(isbn, 'https://example.org/c.jpg')])

    def test_only_https_covers(self):   # never a file on this computer
        r = self.add(cover='file:///C:/Windows/win.ini')
        self.assertNotIn('id-' + r['id'], self.box.read('covers.json'))
        self.assertEqual(self.copied, [])

    def test_second_copy_leaves_first_copys_cover_alone(self):   # review, 9 Nov
        books = self.box.read('books.json')
        owned = next(b for b in books if b.get('isbn13') and b['isbn13'] in self.box.read('covers.json'))
        before = self.box.read('covers.json')[owned['isbn13']]
        r = self.add(isbn=owned['isbn13'], cover='https://example.org/other.jpg')
        covers = self.box.read('covers.json')
        self.assertEqual(covers[owned['isbn13']], before)
        self.assertEqual(covers['id-' + r['id']]['src'], 'https://example.org/other.jpg')

    def test_straightened_cover_becomes_hers(self):
        from PIL import Image
        name = 'covers/_straightened/0123456789abcdef.jpg'
        os.makedirs(self.box.path('site', 'covers', '_straightened'), exist_ok=True)
        Image.new('RGB', (400, 1200), (200, 30, 30)).save(self.box.path('site', *name.split('/')))
        r = self.add(cover=name, coverOriginal='https://example.org/photo.jpg')
        key = 'id-' + r['id']
        with Image.open(self.box.path('site', 'covers', key + '.jpg')) as im:
            self.assertEqual(im.height, 600)   # made no taller than 600
        self.assertEqual(self.box.read('covers.json')[key], {'src': 'https://example.org/photo.jpg', 'from': 'looked up when added, straightened on the Add page', 'straightened': True})

    def test_straightened_original_must_be_https(self):
        from PIL import Image
        name = 'covers/_straightened/fedcba9876543210.jpg'
        os.makedirs(self.box.path('site', 'covers', '_straightened'), exist_ok=True)
        Image.new('RGB', (100, 150)).save(self.box.path('site', *name.split('/')))
        r = self.add(cover=name, coverOriginal='file:///C:/secret.jpg')
        self.assertEqual(self.box.read('covers.json')['id-' + r['id']]['src'], '')

    # when things go wrong
    def test_cover_failure_still_saved_with_warning(self):
        sys.modules['copy_covers'].copy = lambda key, src: (key, 'failed: 404')
        r = self.add(cover='https://example.org/missing.jpg')
        self.assertTrue(r['ok'])
        self.assertTrue(r['warning'])
        self.assertEqual(self.added()[-1]['id'], r['id'])

    def test_rebuild_failure_says_saved(self):
        self.serve.build = lambda: Done(1)
        r = self.add()
        self.assertFalse(r['ok'])
        self.assertTrue(r['saved'])
        self.assertIn('Don’t add it again', r['error'])


class RealRebuild(unittest.TestCase):
    """One add with the real build: the new book is on the site straight away."""

    def test_new_book_on_the_site(self):
        with Sandbox() as box:
            serve = load('serve')
            shelf = box.read('shelves.json')[1]['id']
            r = serve.add({'title': 'Brand New Test Book', 'authors': ['Zed Zebra'], 'shelf': shelf})
            self.assertTrue(r['ok'], r)
            ids = {b['id']: b for b in box.built()['books']}
            self.assertIn(r['id'], ids)
            self.assertEqual(ids[r['id']]['shelf'], shelf)


if __name__ == '__main__':
    unittest.main()
