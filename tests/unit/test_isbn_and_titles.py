"""Book numbers and titles: ISBN-10 to ISBN-13, which barcodes count as books, shop titles tidied."""
import os, sys, unittest
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from support import load

serve = load('serve')


class Isbn13(unittest.TestCase):
    def test_ten_figure_isbn_becomes_thirteen(self):
        self.assertEqual(serve.isbn13('0-306-40615-2'), '9780306406157')

    def test_ten_figure_isbn_ending_in_x(self):
        self.assertEqual(serve.isbn13('080442957X'), '9780804429573')

    def test_thirteen_figures_kept(self):
        self.assertEqual(serve.isbn13('978-0-306-40615-7'), '9780306406157')

    def test_x_in_the_middle_is_not_an_isbn(self):   # used to crash the add (review, 9 Nov)
        self.assertEqual(serve.isbn13('12345X6789'), '')

    def test_rubbish_gives_nothing(self):
        for s in ('', None, 'abc', '12345', '97803064061579'):
            self.assertEqual(serve.isbn13(s), '', s)


class BookNumber(unittest.TestCase):
    def test_real_book_barcode(self):
        self.assertEqual(serve.book_number('9780306406157'), '9780306406157')
        self.assertEqual(serve.book_number('978 0306 40615 7'), '9780306406157')

    def test_wrong_check_digit(self):
        self.assertEqual(serve.book_number('9780306406158'), '')

    def test_shop_price_code_is_not_a_book(self):
        self.assertEqual(serve.book_number('2000001234567'), '')

    def test_979_books_count(self):
        core = '979100000000'
        ck = (10 - sum((3 if i % 2 else 1) * int(c) for i, c in enumerate(core)) % 10) % 10
        self.assertEqual(serve.book_number(core + str(ck)), core + str(ck))


class CleanTitle(unittest.TestCase):
    def test_series_in_brackets_goes(self):
        self.assertEqual(serve.clean_title('The Callista Prophecy (The Natural Human Saga)'), 'The Callista Prophecy')

    def test_series_after_colon_with_book_number_goes(self):
        self.assertEqual(serve.clean_title('Lycan Lamia: The Beyond Series - Book Four'), 'Lycan Lamia')

    def test_plain_title_unchanged(self):
        self.assertEqual(serve.clean_title('Small Things Like These'), 'Small Things Like These')

    def test_never_empty(self):
        self.assertTrue(serve.clean_title('(Untitled)'))


if __name__ == '__main__':
    unittest.main()
