"""Fixes from the 15 Nov review, kept fixed: the weekly backup, the reading import's sanity check, reading corrections
that stop when her reading moves on, a second copy's own cover, and smaller guards."""
import json, os, subprocess, sys, time, unittest, zipfile
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from support import PYTHON, TOOLS, Sandbox, load
import fixture_library


class Backup(unittest.TestCase):
    def test_backup_finishes_and_clears_a_stopped_one(self):
        with Sandbox() as box:
            dest = box.path('backups'); os.makedirs(dest)
            open(os.path.join(dest, 'HomeLibrary backup 2026-01-01.zip.part'), 'wb').write(b'half')
            pics = box.path('for-jemma', 'board-x', 'pictures'); os.makedirs(pics)
            open(os.path.join(pics, 'huge.jpg'), 'wb').write(b'x' * 1000)
            open(box.path('for-jemma', 'board-x', 'board.jpg'), 'wb').write(b'y')
            r = subprocess.run([PYTHON, '-X', 'utf8', os.path.join(TOOLS, 'backup.py')], capture_output=True, text=True, env=os.environ.copy(), timeout=600)
            self.assertEqual(r.returncode, 0, r.stderr[-800:])
            files = os.listdir(dest)
            self.assertFalse([f for f in files if f.endswith('.part')], 'a stopped run’s .part was kept')
            zips = [f for f in files if f.endswith('.zip')]
            self.assertEqual(len(zips), 1)
            with zipfile.ZipFile(os.path.join(dest, zips[0])) as z:
                names = z.namelist()
                self.assertIsNone(z.testzip())
                self.assertIn('HomeLibrary/data/books.json', names)
                self.assertIn('HomeLibrary/for-jemma/board-x/board.jpg', names)
                self.assertNotIn('HomeLibrary/for-jemma/board-x/pictures/huge.jpg', names)
                jpg = next(i for i in z.infolist() if i.filename.endswith('.jpg'))
                self.assertEqual(jpg.compress_type, zipfile.ZIP_STORED)
            log = open(box.path('logs', 'backup.log'), encoding='utf-8').read()
            self.assertIn('started', log)
            self.assertIn('removed an unfinished', log)


class ReadingImport(unittest.TestCase):
    HEADER = 'Title,Authors,Contributors,ISBN/UID,Format,Read Status,Date Added,Last Date Read,Dates Read,Read Count,Moods,Pace,Character- or Plot-Driven?,Strong Character Development?,Loveable Characters?,Diverse Characters?,Flawed Characters?,Star Rating,Review,Content Warnings,Content Warning Description,Tags,Owned?'

    def test_a_cut_short_export_is_not_taken(self):
        with Sandbox() as box:
            serve = load('serve')
            before = open(box.path('data', 'storygraph.json'), 'rb').read()
            p = os.path.join(box.downloads, 'short.csv')
            open(p, 'w', encoding='utf-8').write(self.HEADER + '\nOne Book,Some One,,,paperback,read,,,,1,,,,,,,,,,,,,No\n')
            serve.import_export(p, {})
            self.assertEqual(open(box.path('data', 'storygraph.json'), 'rb').read(), before)
            self.assertIn('not imported', open(box.path('logs', 'reading-updates.log'), encoding='utf-8').read())

    def test_previous_reading_kept(self):
        with Sandbox() as box:
            serve = load('serve')
            serve.build = lambda: type('R', (), {'returncode': 0, 'stdout': '', 'stderr': ''})()
            n = len(box.read('storygraph.json')['books'])
            p = os.path.join(box.downloads, 'full.csv')
            rows = '\n'.join(f'Book {i},Some One,,,paperback,read,,,,1,,,,,,,,,,,,,No' for i in range(n))
            open(p, 'w', encoding='utf-8').write(self.HEADER + '\n' + rows + '\n')
            before = box.read('storygraph.json')
            serve.import_export(p, {})
            self.assertEqual(box.read('storygraph.prev.json'), before)

    def test_isbn_with_x_in_the_middle_doesnt_stop_the_import(self):
        sg = load('import_storygraph')
        self.assertEqual(sg.isbn13('12345X6789'), '')
        self.assertEqual(sg.isbn13('080442957X'), '9780804429573')


class ReadingCorrections(unittest.TestCase):
    def build(self, box):
        subprocess.run([PYTHON, '-X', 'utf8', os.path.join(TOOLS, 'build.py')], capture_output=True, env=os.environ.copy(), check=True)
        sg = box.built()['storygraph']
        return {e['title']: e['status'] for e in (sg['books'] if isinstance(sg, dict) else sg)}

    # on the made-up library (19 Nov: not her own reading, which changes)
    def test_correction_applies_while_storygraph_agrees(self):
        with Sandbox(data=False, covers=False) as box:
            fixture_library.make(box)
            box.write('reading-fixes.json', {'Moon Harbour': {'from': 'read', 'to': 'paused'}})
            self.assertEqual(self.build(box)['Moon Harbour'], 'paused')

    def test_correction_stops_when_her_reading_moves_on(self):   # 15 Nov: "paused" stuck after she finished a book
        with Sandbox(data=False, covers=False) as box:
            fixture_library.make(box)
            box.write('reading-fixes.json', {'Moon Harbour': {'from': 'something-else', 'to': 'paused'}})
            self.assertEqual(self.build(box)['Moon Harbour'], 'read')


# a second copy's own cover (15 Nov): now in test_build_covers.py, on the made-up library


class Guards(unittest.TestCase):
    def test_scanned_list_never_grows_past_200(self):
        with Sandbox() as box:
            serve = load('serve')
            box.write('scanned.json', [{'isbn': f'978{i:010d}', 'title': ''} for i in range(205)])
            items = serve.scanned(new={'isbn': '9780306406157', 'title': 'x'})
            self.assertEqual(len(items), 200)
            self.assertEqual(items[-1]['isbn'], '9780306406157')

    def test_no_name_sent_to_other_sites(self):
        for name in ('serve', 'copy_covers', 'find_covers', 'fill_details'):
            self.assertNotIn('Jemma', load(name).UA['User-Agent'], name)

    def test_saved_files_reach_the_disk(self):
        import inspect, safe_write
        self.assertIn('fsync', inspect.getsource(safe_write.write_json))


if __name__ == '__main__':
    unittest.main()
