"""The weekly backup gives the library back (19 Nov): tools/backup.py run on a small made-up library that is its own git
repo with a stand-in "GitHub" folder, then the library cloned back from that, as she would after losing this PC. Nothing
here touches her library, her GitHub copy or her git settings (the test's git reads no global or system settings)."""
import os, shutil, stat, subprocess, sys, tempfile, unittest
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
        cls.root, cls.github = os.path.join(cls.tmp, 'HomeLibrary'), os.path.join(cls.tmp, 'stand-in-github.git')
        empty = os.path.join(cls.tmp, 'gitconfig'); open(empty, 'w').close()
        cls.env = {**os.environ, 'LIBRARY_ROOT': cls.root, 'GIT_CONFIG_GLOBAL': empty, 'GIT_CONFIG_NOSYSTEM': '1',
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
        shutil.copy2(os.path.join(REAL, '.gitignore'), os.path.join(cls.root, '.gitignore'))
        cls.git('init', '-q', '-b', 'main'); cls.git('add', '-A'); cls.git('commit', '-q', '-m', 'first')
        cls.git('init', '-q', '--bare', '-b', 'main', cls.github, cwd=cls.tmp); cls.git('remote', 'add', 'origin', cls.github)
        # a book added since the last save: the backup must send it to GitHub
        added = os.path.join(cls.root, 'data', 'added.json')
        open(added, 'a', encoding='utf-8').write('\n')
        cls.added = open(added, 'rb').read()
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
                if not rel.startswith('for-jemma/board-x/pictures/') and rel != 'site/backup-status.json':   # this PC's own note, not kept in git
                    out[rel] = open(os.path.join(here, f), 'rb').read()
        return out

    def test_backup_ran(self):
        self.assertEqual(self.run_backup.returncode, 0, self.run_backup.stderr[-800:])

    def test_a_clone_from_github_gives_back_every_file_with_the_latest_changes(self):
        clone = os.path.join(self.tmp, 'cloned')
        self.git('clone', '-q', self.github, clone, cwd=self.tmp)
        self.assertIn('Weekly backup', self.git('log', '--format=%s', cwd=clone))
        self.assertEqual(open(os.path.join(clone, 'data', 'added.json'), 'rb').read(), self.added, 'the latest change isn’t on GitHub')
        got, want = self.library_files(clone), self.library_files(self.root)
        self.assertEqual(sorted(got), sorted(want), 'files missing from GitHub')
        self.assertEqual([f for f in want if got[f] != want[f]], [], 'files differ on GitHub')

    def test_the_cloned_library_builds(self):
        clone = os.path.join(self.tmp, 'cloned-build')
        self.git('clone', '-q', self.github, clone, cwd=self.tmp)
        r = subprocess.run([PYTHON, '-X', 'utf8', os.path.join(TOOLS, 'build.py')], capture_output=True, text=True, env={**self.env, 'LIBRARY_ROOT': clone})
        self.assertEqual(r.returncode, 0, r.stderr[-800:])
        self.assertIn(f'{len(fixture_library.BOOKS) + len(fixture_library.ADDED)} books', r.stdout)


if __name__ == '__main__':
    unittest.main()
