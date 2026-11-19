"""The weekly backup gives the library back (19 Nov): tools/backup.py run on a small made-up library that is its own git
repo, then the zip unpacked and the history bundle cloned, as she would after losing the folder. Nothing here touches
her library, her backups folder or her git settings (the test's git reads no global or system settings)."""
import os, shutil, stat, subprocess, sys, tempfile, unittest, zipfile
from datetime import date
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from support import PYTHON, REAL, TOOLS, Sandbox
import fixture_library


def _writable(func, path, *exc):   # git keeps its objects read-only on Windows
    os.chmod(path, stat.S_IWRITE)
    func(path)


class Restore(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.mkdtemp(prefix='library-backup-test-')
        cls.root, cls.dest = os.path.join(cls.tmp, 'HomeLibrary'), os.path.join(cls.tmp, 'backups')
        empty = os.path.join(cls.tmp, 'gitconfig'); open(empty, 'w').close()
        cls.env = {**os.environ, 'LIBRARY_ROOT': cls.root, 'LIBRARY_BACKUPS': cls.dest, 'GIT_CONFIG_GLOBAL': empty, 'GIT_CONFIG_NOSYSTEM': '1',
                   'GIT_AUTHOR_NAME': 'Test', 'GIT_AUTHOR_EMAIL': 'test@example.invalid', 'GIT_COMMITTER_NAME': 'Test', 'GIT_COMMITTER_EMAIL': 'test@example.invalid'}
        # a small library: the made-up books and covers, the page, a board with its big pictures, a log
        with Sandbox(data=False, covers=False) as box:
            fixture_library.make(box)
            os.makedirs(os.path.join(cls.root, 'site', 'js'))
            shutil.copytree(box.path('data'), os.path.join(cls.root, 'data'))
            shutil.copytree(box.path('site', 'covers'), os.path.join(cls.root, 'site', 'covers'))
        for f in ('index.html', 'js/app.js'):
            shutil.copy2(os.path.join(REAL, 'site', *f.split('/')), os.path.join(cls.root, 'site', *f.split('/')))
        os.makedirs(os.path.join(cls.root, 'for-jemma', 'board-x', 'pictures'))
        open(os.path.join(cls.root, 'for-jemma', 'board-x', 'board.jpg'), 'wb').write(b'board')
        open(os.path.join(cls.root, 'for-jemma', 'board-x', 'pictures', 'huge.jpg'), 'wb').write(b'x' * 5000)
        os.makedirs(os.path.join(cls.root, 'logs'))
        open(os.path.join(cls.root, 'logs', 'old.log'), 'w').write('old log\n')
        cls.git('init', '-q', '-b', 'main'); cls.git('add', '-A'); cls.git('commit', '-q', '-m', 'first')
        # a book added since the last save: the backup must keep it in both the zip and the history
        added = os.path.join(cls.root, 'data', 'added.json')
        open(added, 'a', encoding='utf-8').write('\n')
        cls.added = open(added, 'rb').read()
        os.makedirs(cls.dest)
        for d in range(1, 10):   # nine old backups: only the newest eight are kept
            open(os.path.join(cls.dest, f'HomeLibrary backup 2020-01-0{d}.zip'), 'wb').write(b'old')
        cls.run_backup = subprocess.run([PYTHON, '-X', 'utf8', os.path.join(TOOLS, 'backup.py')], capture_output=True, text=True, env=cls.env, timeout=300)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp, onexc=_writable)

    @classmethod
    def git(cls, *args, cwd=None):
        r = subprocess.run(['git', *args], cwd=cwd or cls.root, capture_output=True, text=True, env=cls.env)
        if r.returncode:
            raise AssertionError(f'git {" ".join(args)}: {r.stderr}')
        return r.stdout

    def library_files(self, root):
        out = {}
        for here, dirs, files in os.walk(root):
            dirs[:] = [d for d in dirs if d not in ('.git', 'logs')]
            for f in files:
                rel = os.path.relpath(os.path.join(here, f), root).replace(os.sep, '/')
                if not rel.startswith('for-jemma/board-x/pictures/'):
                    out[rel] = open(os.path.join(here, f), 'rb').read()
        return out

    def test_backup_ran(self):
        self.assertEqual(self.run_backup.returncode, 0, self.run_backup.stderr[-800:])

    def test_the_zip_gives_back_every_file(self):
        z = os.path.join(self.dest, f'HomeLibrary backup {date.today().isoformat()}.zip')
        out = os.path.join(self.tmp, 'unzipped')
        with zipfile.ZipFile(z) as zf:
            zf.extractall(out)
        got, want = self.library_files(os.path.join(out, 'HomeLibrary')), self.library_files(self.root)
        self.assertEqual(sorted(got), sorted(want))
        self.assertEqual([f for f in want if got[f] != want[f]], [], 'files differ after unzipping')
        self.assertEqual(got['data/added.json'], self.added, 'the book added since the last save is missing')

    def test_the_unzipped_library_builds(self):
        out = os.path.join(self.tmp, 'unzipped-build')
        with zipfile.ZipFile(os.path.join(self.dest, f'HomeLibrary backup {date.today().isoformat()}.zip')) as zf:
            zf.extractall(out)
        env = {**self.env, 'LIBRARY_ROOT': os.path.join(out, 'HomeLibrary')}
        r = subprocess.run([PYTHON, '-X', 'utf8', os.path.join(TOOLS, 'build.py')], capture_output=True, text=True, env=env)
        self.assertEqual(r.returncode, 0, r.stderr[-800:])
        self.assertIn(f'{len(fixture_library.BOOKS) + len(fixture_library.ADDED)} books', r.stdout)

    def test_the_history_bundle_gives_back_the_library_with_its_latest_changes(self):
        bundle = os.path.join(self.dest, 'library-history.bundle')
        self.assertTrue(os.path.exists(bundle), 'no history bundle')
        clone = os.path.join(self.tmp, 'cloned')
        self.git('clone', '-q', bundle, clone, cwd=self.tmp)
        self.assertIn('Weekly backup', self.git('log', '--format=%s', cwd=clone))
        self.assertEqual(open(os.path.join(clone, 'data', 'added.json'), 'rb').read(), self.added, 'the latest change isn’t in the history')
        got, want = self.library_files(clone), self.library_files(self.root)
        self.assertEqual(sorted(got), sorted(want), 'files missing from the history')
        self.assertEqual([f for f in want if got[f] != want[f]], [], 'files differ in the history')

    def test_only_the_newest_eight_zips_are_kept(self):
        zips = sorted(f for f in os.listdir(self.dest) if f.endswith('.zip'))
        self.assertEqual(len(zips), 8)
        self.assertEqual(zips[-1], f'HomeLibrary backup {date.today().isoformat()}.zip')
        self.assertNotIn('HomeLibrary backup 2020-01-01.zip', zips)

    def test_nothing_half_done_is_left(self):
        self.assertEqual([f for f in os.listdir(self.dest) if f.endswith(('.part', '.tmp'))], [])


if __name__ == '__main__':
    unittest.main()
