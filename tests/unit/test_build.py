"""The site build (tools/build.py): data/ -> site/js/data.js. Her own fixes and marks must all land, removed books must
stay away, and one bad file mustn't stop it."""
import json, os, re, subprocess, sys, unittest
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from support import PYTHON, TOOLS, Sandbox, load, real_built
import fixture_library


def run_build(box):
    r = subprocess.run([PYTHON, '-X', 'utf8', os.path.join(TOOLS, 'build.py')], capture_output=True, text=True, env=os.environ.copy())
    if r.returncode:
        raise AssertionError('build failed:\n' + r.stderr[-1500:])
    return box.built()


class WholeBuild(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.box = Sandbox().__enter__()
        cls.d = run_build(cls.box)
        cls.books = {b['id']: b for b in cls.d['books']}

    @classmethod
    def tearDownClass(cls):
        cls.box.__exit__(None, None, None)

    def test_same_as_the_site_now(self):
        """Building her data again gives exactly what the site shows (so the site is up to date and the build is steady)."""
        real = real_built()
        for k in self.d:
            if k != 'built':
                self.assertEqual(self.d[k], real[k], f'“{k}” differs: rebuild the site, or the build changed')

    def test_every_book_once(self):
        ids = [b['id'] for b in self.d['books']]
        self.assertEqual(len(ids), len(set(ids)))
        gone = {x['id'] for x in self.box.read('removed.json', [])}
        expected = {b['id'] for b in self.box.read('books.json') + self.box.read('added.json', [])} - gone
        self.assertEqual(set(ids), expected)

    def test_removed_books_gone_from_reading_too(self):   # review, 9 Nov
        gone = {x['id'] for x in self.box.read('removed.json', [])}
        for e in self.d['storygraph']['books'] if isinstance(self.d['storygraph'], dict) else self.d['storygraph']:
            self.assertFalse(gone & set(e.get('books', [])), e['title'])

    def test_her_marks_land(self):
        for name, field in (('signed.json', 'signed'), ('condition.json', 'condition'), ('inscriptions.json', 'inscription'), ('editions.json', 'special')):
            for i, v in self.box.read(name, {}).items():
                if not i.startswith('_') and i in self.books:
                    self.assertEqual(self.books[i].get(field), v, f'{name}: {i}')

    def test_shelf_moves_land(self):
        for i, shelf in self.box.read('shelf-moves.json', {}).items():
            if i in self.books:
                self.assertEqual(self.books[i]['shelf'], shelf)

    def test_bought_and_split_to_buy_lines_gone(self):
        ids = {w['id'] for w in self.d['toBuy']}
        for x in self.box.read('bought.json', []):
            self.assertNotIn(x['wish'], ids)
        for x in self.box.read('to-buy-added.json', []):
            if x.get('splitFrom'):
                self.assertNotIn(x['splitFrom'], ids)

    def test_old_lines_marked(self):
        for w in self.d['toBuy']:
            if re.search(r'\((old|original paperback)\)', w['title'], re.I):
                self.assertTrue(w.get('old'), w['title'])

    def test_local_covers_exist_and_have_a_shape(self):
        for b in self.d['books']:
            c = b.get('cover', '')
            if c.startswith('covers/'):
                self.assertTrue(os.path.exists(self.box.path('site', c.split('?')[0])), c)
                self.assertTrue(b.get('coverRatio'), b['id'])

    def test_old_books_get_a_spine_colour(self):
        for b in self.d['books']:
            if b['shelf'] == 'old-book-collection' and b.get('cover', '').startswith('covers/'):
                self.assertRegex(b.get('cloth', ''), r'^#[0-9a-f]{6}$', b['title'])

    def test_page_fingerprints_match_the_files(self):
        import hashlib
        page = open(self.box.path('site', 'index.html'), encoding='utf-8').read()
        for f, v in re.findall(r'(?:href|src)="((?:js/[\w.-]+\.js)|site\.css)\?v=(\w+)"', page):
            self.assertEqual(hashlib.md5(open(self.box.path('site', f), 'rb').read()).hexdigest()[:8], v, f)


class Awkward(unittest.TestCase):
    """Odd data the build has to cope with (on the made-up library, 19 Nov: quicker, and not tied to her books)."""

    def setUp(self):
        self.box = Sandbox(data=False, covers=False).__enter__()
        fixture_library.make(self.box)

    def tearDown(self):
        self.box.__exit__(None, None, None)

    def test_a_damaged_cover_doesnt_stop_the_build(self):   # review, 9 Nov
        p = self.box.path('site', 'covers', 'id-old-t1.jpg')   # a made-up picture (an old book's, so its cloth colour is read too)
        open(p, 'wb').write(b'\xff\xd8\xff\xe0 not really a picture')
        b = {x['id']: x for x in run_build(self.box)['books']}['old-t1']
        self.assertTrue(b['cover'].startswith('covers/id-old-t1.jpg'))
        self.assertNotIn('cloth', b)

    def test_name_fix_still_works_on_a_special_edition(self):   # review, 9 Nov: the edition went on first and hid the title
        box = self.box
        box.write('editions.json', {**box.read('editions.json', {}), 'fx-moon': 'Test Edition'})
        box.write('name-fixes.json', {'names': {}, 'remove': [], 'roles': {}, 'books': {}, 'surnames': {}, 'titles': {'Moon Harbour': 'Fixed Test Title'}})
        b = {x['id']: x for x in run_build(box)['books']}['fx-moon']
        self.assertTrue(b['title'].startswith('Fixed Test Title'), b['title'])
        self.assertIn('Test Edition', b['title'])

    def test_empty_marks_files(self):
        for name in ('signed.json', 'condition.json', 'inscriptions.json', 'editions.json'):
            self.box.write(name, {})
        d = run_build(self.box)
        self.assertFalse(any(b.get('signed') or b.get('condition') or b.get('inscription') or b.get('special') for b in d['books']))


class Pieces(unittest.TestCase):
    def setUp(self):
        self.build = load('build')

    def test_shape_of_a_damaged_picture_is_none(self):
        import tempfile
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as fh:
            fh.write(b'nope')
        try:
            self.assertIsNone(self.build.shape(fh.name))
        finally:
            os.remove(fh.name)

    def test_spine_colour_is_the_main_colour(self):
        from PIL import Image, ImageDraw
        import tempfile
        im = Image.new('RGB', (300, 450), (180, 30, 30))   # red cloth
        ImageDraw.Draw(im).rectangle((120, 150, 180, 220), fill=(20, 20, 200))   # a small blue label
        p = tempfile.mktemp(suffix='.jpg'); im.save(p, quality=95)
        try:
            r, g, b = (int(self.build.cloth(p)[i:i + 2], 16) for i in (1, 3, 5))
            self.assertTrue(r > 150 and g < 60 and b < 60, (r, g, b))
        finally:
            os.remove(p)

    def test_name_fixes(self):
        books = [{'title': 'X', 'authors': [{'name': 'J.K Rowling'}, {'name': 'Bloomsbury'}, {'name': 'J.K Rowling'}]}]
        fixes = {'names': {'J.K Rowling': 'J.K. Rowling'}, 'remove': ['Bloomsbury'], 'roles': {}, 'books': {}, 'surnames': {}, 'titles': {}}
        self.build.fix_names(books, fixes)
        self.assertEqual(books[0]['authors'], [{'name': 'J.K. Rowling'}])
        self.assertEqual(books[0]['surname'], 'Rowling')


if __name__ == '__main__':
    unittest.main()
