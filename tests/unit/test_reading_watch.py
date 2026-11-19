"""The reading watcher in tools/serve.py (every 5 minutes: the newest StoryGraph export in Downloads, imported and the
site rebuilt). The import and the rebuild are faked here, so each test says exactly what worked and what failed; the
watcher's 5-minute wait is cut to one round."""
import json, os, subprocess, sys, time, types, unittest
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from support import Sandbox, load

HEADER = 'Title,Authors,Contributors,ISBN/UID,Format,Read Status,Date Added,Last Date Read,Dates Read,Read Count,Moods,Pace,Character- or Plot-Driven?,Strong Character Development?,Loveable Characters?,Diverse Characters?,Flawed Characters?,Star Rating,Review,Content Warnings,Content Warning Description,Tags,Owned?'


class Stop(Exception):
    """Ends the watcher after one look."""


class Watcher(unittest.TestCase):
    def setUp(self):
        self.box = Sandbox(data=False, covers=False).__enter__()
        self.reading = {'books': [{'title': f'Old Read {i}', 'authors': 'Ann Old', 'status': 'read'} for i in range(3)]}
        self.box.write('storygraph.json', self.reading)
        self.serve = load('serve')
        self.imports, self.builds = [], []
        self.import_works, self.build_works = True, True

        def run(args, **kw):   # tools/import_storygraph.py <export> --apply
            self.imports.append(args[-2])
            if not self.import_works:
                return subprocess.CompletedProcess(args, 1, '', 'Traceback: the export is broken')
            self.box.write('storygraph.json', {'books': [{'title': f'New Read {len(self.imports)}', 'authors': 'Bo New', 'status': 'read'}]})
            return subprocess.CompletedProcess(args, 0, 'StoryGraph books: 1', '')

        def build():
            self.builds.append(1)
            return subprocess.CompletedProcess([], 0 if self.build_works else 1, '', '' if self.build_works else 'build broke')
        self.serve.subprocess = types.SimpleNamespace(run=run, CompletedProcess=subprocess.CompletedProcess)
        self.serve.build = build

        def sleep(s):
            if s == 300:
                raise Stop
        self.serve.time = types.SimpleNamespace(sleep=sleep)

    def tearDown(self):
        self.box.__exit__(None, None, None)

    def export(self, name='storygraph_export.csv', rows=3, when=None):
        p = os.path.join(self.box.downloads, name)
        with open(p, 'w', encoding='utf-8', newline='') as fh:
            fh.write(HEADER + '\n' + ''.join(f'Book {i},Some One,,,paperback,read,,,,1,,,,,,,,,,,,,No\n' for i in range(rows)))
        when = when or time.time() - 60
        os.utime(p, (when, when))
        return p

    def look(self):
        """One round of the watcher."""
        with self.assertRaises(Stop):
            self.serve.watch_reading()

    def state(self):
        return self.box.read('storygraph-source.json', {})

    def log(self):
        p = self.box.path('logs', 'reading-updates.log')
        return open(p, encoding='utf-8').read() if os.path.exists(p) else ''

    def test_a_new_export_is_imported_rebuilt_and_remembered(self):
        p = self.export()
        self.look()
        self.assertEqual((len(self.imports), len(self.builds)), (1, 1))
        self.assertEqual(self.state()['file'], os.path.basename(p))
        self.assertEqual(self.state()['mtime'], os.path.getmtime(p))
        self.assertIn('imported storygraph_export.csv', self.log())

    def test_the_same_export_isnt_imported_twice(self):
        self.export()
        self.look(); self.look()
        self.assertEqual(len(self.imports), 1)

    def test_a_newer_export_is_imported(self):
        self.export('first.csv', when=time.time() - 600)
        self.look()
        self.export('second.csv', when=time.time() - 60)
        self.look()
        self.assertEqual([os.path.basename(p) for p in self.imports], ['first.csv', 'second.csv'])

    def test_a_failed_import_is_marked_done_and_not_tried_again(self):
        self.import_works = False
        p = self.export()
        self.look()
        self.assertEqual(self.builds, [], 'rebuilt after a failed import')
        self.assertEqual(self.state()['mtime'], os.path.getmtime(p))
        self.assertIn('failed', self.log())
        self.look()
        self.assertEqual(len(self.imports), 1, 'a broken export was tried again')

    def test_a_failed_rebuild_is_tried_again(self):
        self.build_works = False
        self.export()
        self.look()
        self.assertNotIn('mtime', self.state(), 'marked done although the site wasn’t rebuilt')
        self.assertIn('rebuild failed', self.log())
        self.build_works = True
        self.look()
        self.assertEqual((len(self.imports), len(self.builds)), (2, 2))
        self.assertEqual(self.state()['file'], 'storygraph_export.csv')

    def test_a_cut_short_export_is_refused_and_not_tried_again(self):
        self.reading = {'books': [{'title': f'Old Read {i}', 'authors': 'Ann Old', 'status': 'read'} for i in range(30)]}
        self.box.write('storygraph.json', self.reading)
        self.export(rows=10)   # a third of her reading
        self.look(); self.look()
        self.assertEqual(self.imports, [])
        self.assertEqual(self.box.read('storygraph.json'), self.reading)
        self.assertIn('cut short', self.log())

    def test_her_reading_as_it_was_is_kept(self):
        self.export()
        self.look()
        self.assertEqual(self.box.read('storygraph.prev.json'), self.reading)

    def test_her_reading_as_it_was_is_kept_when_the_rebuild_is_tried_again(self):
        self.build_works = False
        self.export()
        self.look()
        self.build_works = True
        self.look()
        self.assertEqual(self.box.read('storygraph.prev.json'), self.reading, 'the reading before the import was lost')

    def test_other_csv_files_are_left_alone(self):
        p = os.path.join(self.box.downloads, 'bank.csv')
        open(p, 'w', encoding='utf-8').write('Date,Description,Amount\n1,2,3\n')
        self.look()
        self.assertEqual(self.imports, [])

    def test_a_problem_is_logged_and_the_watcher_carries_on(self):
        def broken():
            raise OSError('Downloads unreadable')
        self.serve.newest_export = broken
        self.look()   # reaches its 5-minute wait instead of stopping
        self.assertIn('watch failed: Downloads unreadable', self.log())


if __name__ == '__main__':
    unittest.main()
