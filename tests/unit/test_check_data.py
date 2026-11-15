"""tools/check_data.py: quiet on her data as it is, and it does catch the problems it's for."""
import os, subprocess, sys, time, unittest
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from support import PYTHON, TOOLS, Sandbox


def check():
    r = subprocess.run([PYTHON, '-X', 'utf8', os.path.join(TOOLS, 'check_data.py')], capture_output=True, text=True, env=os.environ.copy())
    return r.returncode, r.stdout


def rebuild():
    subprocess.run([PYTHON, '-X', 'utf8', os.path.join(TOOLS, 'build.py')], capture_output=True, env=os.environ.copy(), check=True)


class CheckData(unittest.TestCase):
    def test_her_data_passes(self):
        with Sandbox():
            rebuild()
            code, out = check()
            self.assertEqual(code, 0, out)

    def test_catches_a_fix_for_a_missing_book(self):
        with Sandbox() as box:
            box.write('condition.json', {**box.read('condition.json', {}), 'no-such-book': 'Good'})
            rebuild()
            code, out = check()
            self.assertEqual(code, 1)
            self.assertIn('no-such-book', out)

    def test_catches_buying_a_book_she_owns(self):
        with Sandbox() as box:
            owned = next(b for b in box.read('books.json') if b.get('isbn13'))
            box.write('to-buy-added.json', box.read('to-buy-added.json', []) + [{'id': 'buy-dup', 'title': owned['title'], 'isbn13': owned['isbn13']}])
            rebuild()
            code, out = check()
            self.assertIn('already on her shelves', out)

    def test_catches_an_out_of_date_site(self):
        with Sandbox() as box:
            rebuild()
            later = time.time() + 60
            os.utime(box.path('data', 'books.json'), (later, later))
            code, out = check()
            self.assertIn('run tools/build.py', out)

    def test_catches_blurbs_that_arent_blurbs(self):   # 15 Nov: shop listings and other languages were showing
        with Sandbox() as box:
            books = box.read('books.json')
            a, c = next(b for b in books if b['shelf'] != 'old-book-collection'), [b for b in books if b['shelf'] != 'old-book-collection'][5]
            fixes = box.read('description-fixes.json', {})
            fixes[a['id']] = '¡¡LIBRO NUEVO!! NEW BOOK!! Envio desde España entre 24 y 48 horas.'
            fixes[c['id']] = 'Det er ei historie om to venninner som vokser opp, og den er ei av de beste som er skrevet.'
            box.write('description-fixes.json', fixes)
            rebuild()
            code, out = check()
            self.assertIn('shop listing', out)
            self.assertIn('isn’t in English', out)

    def test_catches_a_broken_data_file(self):
        with Sandbox() as box:
            open(box.path('data', 'signed.json'), 'w').write('{broken')
            code, out = check()
            self.assertIn('signed.json', out)


if __name__ == '__main__':
    unittest.main()
