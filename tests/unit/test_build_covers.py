"""Which cover the build gives each book (19 Nov), on the made-up library (tests/fixture_library.py): copies sharing an
ISBN, second copies added on the site, links, old books and their cloth colours, books read elsewhere."""
import os, sys, unittest
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from support import Sandbox, run_build
import fixture_library as fx


class Covers(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.box = Sandbox(data=False, covers=False).__enter__()
        fx.make(cls.box)
        cls.d = run_build(cls.box)
        cls.b = {b['id']: b for b in cls.d['books']}

    @classmethod
    def tearDownClass(cls):
        cls.box.__exit__(None, None, None)

    def cover(self, i):
        return self.b[i].get('cover', '')

    def test_a_copied_cover_is_used_with_a_fingerprint_and_its_shape(self):
        self.assertRegex(self.cover('fx-owl1'), r'^covers/9790000000011\.jpg\?v=[0-9a-f]{8}$')
        self.assertEqual(self.b['fx-owl1']['coverRatio'], 1.5)

    def test_two_copies_with_one_isbn_share_its_cover(self):
        self.assertTrue(self.cover('fx-moon').startswith(f'covers/{fx.MOON}.jpg'))
        self.assertEqual(self.cover('fx-moon2'), self.cover('fx-moon'))

    def test_a_copy_added_on_the_site_with_its_own_picture_shows_it(self):
        self.assertTrue(self.cover('add0001').startswith('covers/id-add0001.jpg'))
        self.assertTrue(self.cover('fx-moon').startswith(f'covers/{fx.MOON}.jpg'), 'the first copy lost its cover')

    def test_a_copy_added_on_the_site_without_a_picture_shows_the_isbns(self):
        self.assertEqual(self.cover('add0002'), self.cover('fx-moon'))

    def test_a_cover_not_copied_yet_is_linked(self):
        self.assertEqual(self.cover('fx-owl1b'), 'https://example.invalid/owl-special.jpg')
        self.assertEqual(self.cover('fx-display'), 'https://example.invalid/crown.jpg', 'a book found by title')
        self.assertNotIn('coverRatio', self.b['fx-owl1b'])

    def test_no_cover_anywhere_means_none(self):
        self.assertNotIn('cover', self.b['fx-owl2'])

    def test_an_old_book_gets_its_cover_and_cloth_colour(self):
        self.assertTrue(self.cover('old-t1').startswith('covers/id-old-t1.jpg'))
        r, g, b = (int(self.b['old-t1']['cloth'][i:i + 2], 16) for i in (1, 3, 5))
        self.assertTrue(r > 150 and g < 60 and b < 60, self.b['old-t1']['cloth'])

    def test_an_old_book_never_gets_a_modern_cover(self):
        old = self.b['old-fic']
        self.assertNotIn('cover', old, 'a modern reprint’s cover shown (no-cover.json)')
        self.assertNotIn('cloth', old)

    def test_an_old_book_without_a_picture_has_no_cloth_colour(self):
        self.assertNotIn('cloth', self.b['old-t3'])

    def test_modern_books_get_no_cloth_colour(self):
        self.assertNotIn('cloth', self.b['fx-owl1'])

    def test_a_book_read_elsewhere_gets_its_cover_by_title(self):
        e = next(x for x in self.d['storygraph']['books'] if x['title'] == 'Borrowed Tale')
        self.assertTrue(e.get('cover', '').startswith('covers/sg-borrowed-tale.jpg'))

    def test_special_editions_named_in_the_title_and_marked(self):
        self.assertEqual((self.b['fx-owl1b']['title'], self.b['fx-owl1b']['special']), ('The Glass Owl (Illumicrate Edition)', 'Illumicrate Edition'))
        self.assertNotIn('special', self.b['fx-owl1'])

    def test_old_printings_to_find_are_marked(self):
        self.assertEqual({w['id'] for w in self.d['toBuy'] if w.get('old')}, {'buy-last-testwood'})

    def test_a_new_picture_gets_a_new_fingerprint(self):
        from PIL import Image
        before = self.cover('add0001')
        Image.new('RGB', (210, 300), (10, 10, 10)).save(self.box.path('site', 'covers', 'id-add0001.jpg'))   # a made-up picture, not hers
        try:
            after = {b['id']: b for b in run_build(self.box)['books']}['add0001']['cover']
            self.assertNotEqual(after, before)
            self.assertTrue(after.startswith('covers/id-add0001.jpg?v='))
        finally:
            type(self).d = run_build(self.box)
            type(self).b = {b['id']: b for b in self.d['books']}


if __name__ == '__main__':
    unittest.main()
