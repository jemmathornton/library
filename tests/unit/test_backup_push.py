"""The weekly backup also sends the week's saves to her GitHub copy (19 Nov). Tested with a stand-in "GitHub" folder on
this computer, never the real one."""
import os, subprocess, sys, unittest
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from support import PYTHON, TOOLS, Sandbox


def git(root, *args):
    return subprocess.run(['git', *args], cwd=root, capture_output=True, text=True)


def run_backup():
    return subprocess.run([PYTHON, '-X', 'utf8', os.path.join(TOOLS, 'backup.py')], capture_output=True, text=True, env=os.environ.copy(), timeout=600)


class BackupPush(unittest.TestCase):
    def test_the_weeks_saves_reach_the_github_copy(self):
        with Sandbox(covers=False) as box:
            git(box.root, 'init', '-q', '-b', 'main')
            git(box.root, '-c', 'user.name=t', '-c', 'user.email=t@example.org', 'commit', '-q', '--allow-empty', '-m', 'start')
            remote = box.path('stand-in-github.git')
            git(box.root, 'init', '-q', '--bare', remote)
            git(box.root, 'remote', 'add', 'origin', remote)
            open(box.path('data', 'new-this-week.json'), 'w').write('{}')
            env_name = {'GIT_AUTHOR_NAME': 't', 'GIT_AUTHOR_EMAIL': 't@example.org', 'GIT_COMMITTER_NAME': 't', 'GIT_COMMITTER_EMAIL': 't@example.org'}
            os.environ.update(env_name)
            try:
                r = run_backup()
            finally:
                for k in env_name:
                    os.environ.pop(k, None)
            self.assertEqual(r.returncode, 0, r.stderr[-600:])
            mine, theirs = git(box.root, 'rev-parse', 'HEAD').stdout.strip(), git(remote, 'rev-parse', 'main').stdout.strip()
            self.assertEqual(mine, theirs, 'the GitHub copy didn’t get the week’s save')
            self.assertIn('new-this-week.json', git(remote, 'show', '--stat', 'main').stdout)
            self.assertIn('github: pushed', open(box.path('logs', 'backup.log'), encoding='utf-8').read())

    def test_no_github_copy_no_push_and_the_zip_still_happens(self):
        with Sandbox(covers=False) as box:
            r = run_backup()
            self.assertEqual(r.returncode, 0, r.stderr[-600:])
            log = open(box.path('logs', 'backup.log'), encoding='utf-8').read()
            self.assertNotIn('github', log)
            self.assertIn('zipped', log)


if __name__ == '__main__':
    unittest.main()
