"""The covers' small copies (tools/make_thumbs.py; round 5, 22 Nov): made by every build, so a book added on the site or a
replaced cover gets them at once; a replaced cover (even by an older file) is redone; a cover gone takes its copies with it."""
import os, subprocess, sys, tempfile, shutil, unittest
from pathlib import Path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from support import PYTHON, REAL, TOOLS, Sandbox, load
import fixture_library
from PIL import Image


def colour(path):
    with Image.open(path) as im:
        return im.convert('RGB').getpixel((im.width // 2, im.height // 2))


class SmallCopies(unittest.TestCase):
    def setUp(self):
        self.dir = Path(tempfile.mkdtemp(prefix='thumbs-test-'))
        self.covers = self.dir / 'covers'
        self.covers.mkdir()
        self.mt = load('make_thumbs')

    def tearDown(self):
        shutil.rmtree(self.dir, ignore_errors=True)

    def cover(self, name, rgb, size=(400, 640)):
        p = self.covers / name
        Image.new('RGB', size, rgb).save(p, quality=95)
        return p

    def test_both_sizes_made_and_carry_the_covers_time(self):
        p = self.cover('9780000000001.jpg', (200, 20, 20))
        self.assertEqual(self.mt.make_all(self.covers, quiet=True), 2)
        for end, tall in (('', 460), ('-s', 180)):
            t = self.covers / 'thumbs' / f'9780000000001{end}.webp'
            with Image.open(t) as im:
                self.assertEqual(im.height, tall)
            self.assertEqual(t.stat().st_mtime_ns, p.stat().st_mtime_ns)
        self.assertEqual(self.mt.make_all(self.covers, quiet=True), 0, 'nothing redone when nothing changed')

    def test_a_replaced_cover_is_redone_even_by_an_older_file(self):
        p = self.cover('9780000000001.jpg', (200, 20, 20))
        self.mt.make_all(self.covers, quiet=True)
        old = p.stat().st_mtime_ns
        new = self.cover('new.jpg', (20, 20, 200))
        os.utime(new, ns=(old - 10**10, old - 10**10))   # an older picture, swapped in under the same name
        os.replace(new, p)
        self.assertEqual(self.mt.make_all(self.covers, quiet=True), 2)
        r, g, b = colour(self.covers / 'thumbs' / '9780000000001.webp')
        self.assertGreater(b, r, 'the small copy shows the new cover')

    def test_copies_of_a_cover_gone_are_deleted(self):
        p = self.cover('9780000000001.jpg', (200, 20, 20))
        self.mt.make_all(self.covers, quiet=True)
        p.unlink()
        self.mt.make_all(self.covers, quiet=True)
        self.assertEqual(list((self.covers / 'thumbs').glob('*.webp')), [])


class MadeByTheBuild(unittest.TestCase):
    def test_build_and_adding_a_book_make_them(self):
        with Sandbox(data=False, covers=False) as box:
            fixture_library.make(box)
            r = subprocess.run([PYTHON, '-X', 'utf8', os.path.join(TOOLS, 'build.py')], capture_output=True, text=True, env=os.environ.copy())
            self.assertEqual(r.returncode, 0, r.stderr[-1500:])
            covers = Path(box.path('site', 'covers'))
            for p in covers.glob('*.jpg'):
                for end in ('', '-s'):
                    self.assertTrue((covers / 'thumbs' / f'{p.stem}{end}.webp').exists(), f'{p.name}{end}')
            # the Add page saves a book with a cover straightened there: serve.py's real rebuild makes its small copies
            serve = load('serve')
            name = 'covers/_straightened/0123456789abcdef.jpg'
            os.makedirs(box.path('site', 'covers', '_straightened'), exist_ok=True)
            Image.new('RGB', (400, 640), (30, 160, 30)).save(box.path('site', *name.split('/')))
            shelf = box.read('shelves.json')[1]['id']
            res = serve.add({'title': 'A Test Book', 'authors': ['Ann Author'], 'shelf': shelf, 'cover': name, 'coverOriginal': 'https://example.org/p.jpg'})
            self.assertTrue(res['ok'], res)
            key = 'id-' + res['id']
            for end in ('', '-s'):
                t = covers / 'thumbs' / f'{key}{end}.webp'
                self.assertTrue(t.exists(), t.name)
                self.assertEqual(t.stat().st_mtime_ns, (covers / f'{key}.jpg').stat().st_mtime_ns)


class HerSite(unittest.TestCase):
    def test_every_cover_has_both_small_copies_up_to_date(self):
        """Her real site/covers (read only): run tools/build.py (or tools/make_thumbs.py) if this fails."""
        covers = Path(REAL, 'site', 'covers')
        missing = []
        for p in covers.iterdir():
            if p.is_file() and p.suffix.lower() in ('.jpg', '.jpeg', '.png', '.webp'):
                for end in ('', '-s'):
                    t = covers / 'thumbs' / f'{p.stem}{end}.webp'
                    if not t.exists() or t.stat().st_mtime_ns != p.stat().st_mtime_ns:
                        missing.append(t.name)
        self.assertEqual(missing[:10], [], f'{len(missing)} small copies missing or out of date')


if __name__ == '__main__':
    unittest.main()
