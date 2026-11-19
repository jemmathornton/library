"""The scripts that look things up online, run whole (main()) with the internet faked (support.FakeWeb): find_covers.py,
fill_details.py and copy_covers.py. Each runs on a made-up library in a sandbox; nothing goes out, nothing of hers changes."""
import contextlib, io, os, sys, types, unittest, urllib.error
from unittest import mock
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from support import FakeWeb, Sandbox, load, picture

A, B, C, D, E, F, G = (f'97800000000{n}' for n in ('11', '28', '35', '42', '59', '66', '73'))


def isbn10(i13):
    core = i13[3:12]
    check = (11 - sum((10 - n) * int(c) for n, c in enumerate(core)) % 11) % 11
    return core + ('X' if check == 10 else str(check))


def run(mod, *args):
    """mod.main() with these command-line words, no waiting between requests, and its printing kept quiet."""
    mod.time = types.SimpleNamespace(sleep=lambda s: None)
    with mock.patch.object(sys, 'argv', ['x.py', *args]), contextlib.redirect_stdout(io.StringIO()) as out:
        mod.main()
    return out.getvalue()


def book(i, title, isbn=None, author='Ann Author', **kw):
    return {'id': i, 'title': title, 'authors': [{'name': author}], 'shelf': 'fantasy', **({'isbn13': isbn} if isbn else {}), **kw}


class FindCovers(unittest.TestCase):
    def setUp(self):
        self.box = Sandbox(data=False, covers=False).__enter__()
        self.box.write('books.json', [book('b1', 'Open Book', A), book('b2', 'Other Edition', B), book('b3', 'Google Book', C),
                                      book('b4', 'Nowhere Book', D), book('b5', 'Found By Title'), book('b6', 'Amazon Book', E),
                                      book('b7', 'Too Old For A Cover')])
        self.box.write('to-buy.json', [book('w1', 'Wanted', G)])
        self.box.write('storygraph.json', {'books': [{'title': 'Read Elsewhere', 'authors': 'Ena Fox', 'isbn13': F, 'status': 'read'},
                                                     {'title': 'Open Book', 'authors': 'Ann Author', 'isbn13': A, 'books': ['b1']}]})
        self.box.write('no-cover.json', {'books': [{'id': 'b7', 'title': 'Too Old For A Cover'}]})
        self.box.write('covers.json', {G: {'src': 'https://example.invalid/g.jpg', 'from': 'before'}})
        self.web = FakeWeb({
            'openlibrary.org/api/books': self.ol_api,
            f'isbn={B}': {'docs': [{'cover_i': 77}]},
            'search.json?fields=cover_i': {'docs': []},
            f'q=isbn:{C}': {'items': [{'volumeInfo': {}}, {'volumeInfo': {'imageLinks': {'thumbnail': 'http://books.google.com/c?id=1&edge=curl'}}}]},
            'googleapis.com': {},
            'title=Found+By+Title': {'docs': [{'title': 'Something Else', 'cover_i': 1}, {'title': 'Found by Title', 'cover_i': 88}]},
            'search.json?title=': {'docs': []},
            'images-amazon.com': lambda url: picture(100, 150) if isbn10(E) in url else picture(1, 1),
        })
        self.find = load('find_covers')

    def tearDown(self):
        self.box.__exit__(None, None, None)

    def ol_api(self, url):
        # meanwhile the server saves a cover for a book just added on the site: it must survive this run
        covers = self.box.read('covers.json')
        covers['id-add0009'] = {'src': 'https://example.invalid/new.jpg', 'from': 'added'}
        self.box.write('covers.json', covers)
        return {f'ISBN:{A}': {'cover': {'large': 'https://covers.openlibrary.org/b/id/1-L.jpg'}}, f'ISBN:{F}': {'cover': {'medium': 'https://covers.openlibrary.org/b/id/6-M.jpg'}}}

    def covers(self):
        with self.web:
            run(self.find)
        return self.box.read('covers.json')

    def test_open_library_first(self):
        c = self.covers()
        self.assertEqual(c[A], {'src': 'https://covers.openlibrary.org/b/id/1-L.jpg', 'from': 'Open Library'})
        self.assertEqual(c[F]['src'], 'https://covers.openlibrary.org/b/id/6-M.jpg', 'a book read elsewhere')

    def test_then_another_edition_then_google(self):
        c = self.covers()
        self.assertEqual(c[B], {'src': 'https://covers.openlibrary.org/b/id/77-L.jpg', 'from': 'Open Library (another edition)'})
        self.assertEqual(c[C], {'src': 'https://books.google.com/c?id=1', 'from': 'Google Books'})

    def test_then_by_title_then_amazon(self):
        c = self.covers()
        self.assertEqual(c['id-b5'], {'src': 'https://covers.openlibrary.org/b/id/88-L.jpg', 'from': 'Open Library (title search)'})
        self.assertEqual(c[E]['from'], 'Amazon')
        self.assertIn(isbn10(E), c[E]['src'])

    def test_nothing_found_is_remembered_as_tried(self):
        c = self.covers()
        self.assertIsNone(c[D])
        self.assertIs(c['_byTitle']['id-b4'], False)
        self.assertIs(c['_amazon'][D], False, 'Amazon’s 1-pixel “no cover” counted as a cover')

    def test_known_covers_and_old_books_arent_asked_about(self):
        self.covers()
        self.assertFalse([u for u in self.web.asked if G in u], 'looked up a book that has a cover')
        self.assertFalse([u for u in self.web.asked if 'Too+Old' in u], 'looked for a modern cover of an old book')

    def test_a_cover_the_server_saved_meanwhile_is_kept(self):
        self.assertIn('id-add0009', self.covers())

    def test_a_second_run_asks_nothing_new(self):
        self.covers()
        self.web.asked.clear()
        self.covers()
        self.assertEqual(self.web.asked, [])

    def test_retry_asks_again_about_the_misses_only(self):
        self.covers()
        self.web.asked.clear()
        with self.web:
            run(self.find, '--retry')
        asked = ' '.join(self.web.asked)
        self.assertIn(D, asked)
        self.assertNotIn(f'isbn={A}', asked)

    def test_google_stopping_leaves_the_rest_untried(self):
        self.web.table[f'q=isbn:{C}'] = urllib.error.URLError('quota')
        c = self.covers()
        self.assertNotIn(C, c, 'a book Google never answered for was marked as having no cover')
        self.assertNotIn(D, c)


class FillDetails(unittest.TestCase):
    def setUp(self):
        self.box = Sandbox(data=False, covers=False).__enter__()
        self.box.write('books.json', [
            book('d1', 'Edition Book', '9781111111111'),
            book('d2', 'Old Thing: A Subtitle (1950)', author='Ann Old'),
            book('d3', 'Complete Book', '9782222222222', description='Hers.', pages=10, publisher='P'),
            book('d4', 'Unknown Book', '9783333333333')])
        self.box.write('added.json', [book('add0001', 'Added Book', '9784444444444', addedHere=True)])
        self.web = FakeWeb({
            'isbn/9781111111111.json': {'number_of_pages': 320, 'publishers': ['Pub One', 'Pub Two'], 'works': [{'key': '/works/OL1W'}]},
            'works/OL1W.json': {'description': {'value': 'A [linked](https://example.invalid) story.\n\n----\nsource notes'}},
            'title=Old+Thing': {'docs': [{'key': '/works/OL2W', 'title': 'Old Thing'}]},
            'works/OL2W.json': {'description': '**Bold** words_'},
            'isbn/9784444444444.json': {'number_of_pages': 99, 'description': 'Its own words.'},
            'search.json?title=': {'docs': []},
        })
        self.fill = load('fill_details')

    def tearDown(self):
        self.box.__exit__(None, None, None)

    def details(self, *args):
        with self.web:
            run(self.fill, *args)
        return self.box.read('details.json')

    def test_by_isbn_pages_publisher_and_the_works_description(self):
        self.assertEqual(self.details()['d1'], {'pages': 320, 'publisher': 'Pub One, Pub Two', 'description': 'A linked story.'})

    def test_without_isbn_only_the_description_by_title(self):
        d = self.details()['d2']
        self.assertEqual(d, {'description': 'Bold words'})
        self.assertTrue(any('author=Old' in u and 'title=Old+Thing&' in u for u in self.web.asked), 'brackets or subtitle sent with the title')

    def test_books_added_on_the_site_too(self):
        self.assertEqual(self.details()['add0001'], {'pages': 99, 'description': 'Its own words.'})

    def test_a_complete_book_isnt_looked_up(self):
        self.assertNotIn('d3', self.details())
        self.assertFalse([u for u in self.web.asked if '9782222222222' in u])

    def test_nothing_found_is_remembered_and_retried_only_when_asked(self):
        self.assertEqual(self.details()['d4'], {})
        self.web.asked.clear()
        self.details()
        self.assertEqual(self.web.asked, [], 'a second run looked things up again')
        self.details('--retry')
        self.assertTrue(any('9783333333333' in u for u in self.web.asked))
        self.assertFalse(any('9781111111111' in u for u in self.web.asked), 'retried a book that was found')

    def test_the_internet_stopping_keeps_what_was_found_and_leaves_the_rest_untried(self):
        self.web.table['title=Old+Thing'] = urllib.error.URLError('down')
        d = self.details()
        self.assertIn('d1', d)
        self.assertNotIn('d2', d, 'a book never answered for was marked as tried')


class CopyCovers(unittest.TestCase):
    def setUp(self):
        from PIL import Image
        self.box = Sandbox(data=False, covers=False).__enter__()
        self.dir = self.box.path('site', 'covers')
        for name in ('done', 'straight'):
            Image.new('RGB', (100, 150), (1, 2, 3)).save(os.path.join(self.dir, name + '.jpg'))
        self.box.write('covers.json', {
            'big': {'src': 'https://example.invalid/big.jpg'}, 'small': {'src': 'https://example.invalid/small.jpg'},
            'missing': {'src': 'https://example.invalid/missing.jpg'}, 'done': {'src': 'https://example.invalid/done.jpg'},
            'straight': {'src': 'https://example.invalid/straight.jpg', 'straightened': True},
            'none': None, '_byTitle': {'id-x': True}})
        self.web = FakeWeb({'big.jpg': picture(400, 1200, (200, 40, 40)), 'small.jpg': picture(10, 10), 'missing.jpg': 404,
                            'done.jpg': picture(300, 450), 'straight.jpg': picture(300, 450)})
        self.copy = load('copy_covers')

    def tearDown(self):
        self.box.__exit__(None, None, None)

    def size(self, name):
        from PIL import Image
        p = os.path.join(self.dir, name + '.jpg')
        if not os.path.exists(p):
            return None
        with Image.open(p) as im:
            return im.size

    def test_new_covers_copied_no_taller_than_600(self):
        with self.web:
            out = run(self.copy)
        self.assertEqual(self.size('big'), (200, 600))
        self.assertIn('missing', out)

    def test_blank_and_missing_pictures_arent_kept(self):
        with self.web:
            run(self.copy)
        self.assertIsNone(self.size('small'))
        self.assertIsNone(self.size('missing'))
        self.assertEqual([f for f in os.listdir(self.dir) if f.endswith('.tmp')], [], 'half-written pictures left behind')

    def test_copied_ones_are_left_unless_all(self):
        with self.web:
            run(self.copy)
        self.assertEqual(self.size('done'), (100, 150))
        self.assertFalse([u for u in self.web.asked if 'done.jpg' in u])
        with self.web:
            run(self.copy, '--all')
        self.assertEqual(self.size('done'), (300, 450))

    def test_her_straightened_covers_are_never_replaced(self):
        with self.web:
            run(self.copy, '--all')
        self.assertEqual(self.size('straight'), (100, 150))
        self.assertFalse([u for u in self.web.asked if 'straight.jpg' in u])


if __name__ == '__main__':
    unittest.main()
