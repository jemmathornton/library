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

    def test_only_the_librarys_own_files_are_saved(self):   # her yes, 21 Nov: the GitHub copy is public
        with Sandbox(covers=False) as box:
            git(box.root, 'init', '-q', '-b', 'main')
            os.environ.update(GIT_AUTHOR_NAME='t', GIT_AUTHOR_EMAIL='t@example.org', GIT_COMMITTER_NAME='t', GIT_COMMITTER_EMAIL='t@example.org')
            try:
                open(box.path('data', 'new-this-week.json'), 'w').write('{}')
                open(box.path('my bank statement.csv'), 'w').write('private')
                os.makedirs(box.path('Downloads copy')); open(box.path('Downloads copy', 'x.txt'), 'w').write('private')
                r = run_backup()
            finally:
                for k in ('GIT_AUTHOR_NAME', 'GIT_AUTHOR_EMAIL', 'GIT_COMMITTER_NAME', 'GIT_COMMITTER_EMAIL'):
                    os.environ.pop(k, None)
            self.assertEqual(r.returncode, 0, r.stderr[-600:])
            saved = git(box.root, 'ls-files').stdout
            self.assertIn('data/new-this-week.json', saved)
            self.assertNotIn('bank statement', saved)
            self.assertNotIn('Downloads copy', saved)
            self.assertIn('left out', open(box.path('logs', 'backup.log'), encoding='utf-8').read())

    def test_each_run_leaves_a_status_for_the_home_page(self):   # her yes, 21 Nov: a failed backup is said on Home
        import json
        with Sandbox(covers=False) as box:
            run_backup()
            st = json.load(open(box.path('site', 'backup-status.json'), encoding='utf-8'))
            self.assertTrue(st['ok']); self.assertEqual(st['lastOk'], st['lastTry'])
            git(box.root, 'init', '-q', '-b', 'main')
            git(box.root, 'remote', 'add', 'origin', box.path('no-such-github.git'))
            run_backup()
            st2 = json.load(open(box.path('site', 'backup-status.json'), encoding='utf-8'))
            self.assertFalse(st2['ok'])
            self.assertEqual(st2['lastOk'], st['lastOk'], 'the last good backup is remembered')
            self.assertTrue(st2['why'])

    def test_no_github_copy_is_logged_not_an_error(self):
        with Sandbox(covers=False) as box:
            r = run_backup()
            self.assertEqual(r.returncode, 0, r.stderr[-600:])
            self.assertIn('no GitHub copy', open(box.path('logs', 'backup.log'), encoding='utf-8').read())

    def test_no_zips_any_more(self):   # 19 Nov, her call: GitHub is the backup, the zips folder is gone
        with Sandbox(covers=False) as box:
            run_backup()
            self.assertFalse(os.path.exists(box.path('backups')))

    def test_a_failed_push_is_logged_and_the_task_fails(self):   # so Windows shows the task as failed
        with Sandbox(covers=False) as box:
            git(box.root, 'init', '-q', '-b', 'main')
            git(box.root, 'remote', 'add', 'origin', box.path('no-such-github.git'))
            r = run_backup()
            self.assertNotEqual(r.returncode, 0)
            self.assertIn('github push failed', open(box.path('logs', 'backup.log'), encoding='utf-8').read())

    def _repo_with_github(self, box):
        git(box.root, 'init', '-q', '-b', 'main')
        git(box.root, 'commit', '-q', '--allow-empty', '-m', 'start')
        remote = box.path('stand-in-github.git')
        git(box.root, 'init', '-q', '--bare', remote)
        git(box.root, 'remote', 'add', 'origin', remote)
        return remote

    def _named(self):
        names = {'GIT_AUTHOR_NAME': 't', 'GIT_AUTHOR_EMAIL': 't@example.org', 'GIT_COMMITTER_NAME': 't', 'GIT_COMMITTER_EMAIL': 't@example.org'}
        os.environ.update(names)
        self.addCleanup(lambda: [os.environ.pop(k, None) for k in names])

    def test_a_detached_head_at_main_goes_back_on_main_and_main_is_pushed(self):   # round 3 (22 Nov): it's a submodule now
        self._named()
        with Sandbox(covers=False) as box:
            remote = self._repo_with_github(box)
            git(box.root, 'checkout', '-q', '--detach')
            open(box.path('data', 'new-this-week.json'), 'w').write('{}')
            r = run_backup()
            self.assertEqual(r.returncode, 0, r.stderr[-600:])
            self.assertEqual(git(box.root, 'symbolic-ref', '-q', 'HEAD').stdout.strip(), 'refs/heads/main')
            self.assertIn('new-this-week.json', git(remote, 'show', '--stat', 'main').stdout)

    def test_detached_somewhere_else_saves_nothing_and_says_so(self):
        self._named()
        with Sandbox(covers=False) as box:
            self._repo_with_github(box)
            git(box.root, 'commit', '-q', '--allow-empty', '-m', 'second')
            git(box.root, 'checkout', '-q', 'HEAD~1')
            open(box.path('data', 'new-this-week.json'), 'w').write('{}')
            r = run_backup()
            self.assertNotEqual(r.returncode, 0)
            self.assertIn('not on the main branch', open(box.path('logs', 'backup.log'), encoding='utf-8').read())
            self.assertIn('new-this-week.json', git(box.root, 'status', '--porcelain', '--untracked-files=all').stdout, 'nothing saved')

    def test_after_a_push_the_parent_records_the_new_version(self):   # round 3: Jemma's Journals' tools/record_apps.py
        self._named()
        with Sandbox(covers=False) as box:
            self._repo_with_github(box)
            os.makedirs(os.path.join(box.outer, 'tools'))
            open(os.path.join(box.outer, 'tools', 'record_apps.py'), 'w', encoding='utf-8').write(
                "import os" + chr(10) + "open(os.path.join(os.getcwd(), 'ran.txt'), 'w').write('yes')" + chr(10) + "print('library: recorded (stand-in)')" + chr(10))
            r = run_backup()
            self.assertEqual(r.returncode, 0, r.stderr[-600:])
            self.assertTrue(os.path.exists(os.path.join(box.outer, 'ran.txt')), 'record_apps.py didn’t run in the parent')
            log = open(box.path('logs', 'backup.log'), encoding='utf-8').read()
            self.assertIn('parent: record_apps.py done: library: recorded (stand-in)', log)

    def test_a_failing_record_in_the_parent_never_fails_the_backup(self):
        self._named()
        with Sandbox(covers=False) as box:
            self._repo_with_github(box)
            os.makedirs(os.path.join(box.outer, 'tools'))
            open(os.path.join(box.outer, 'tools', 'record_apps.py'), 'w', encoding='utf-8').write("print('push failed'); raise SystemExit(1)" + chr(10))
            r = run_backup()
            self.assertEqual(r.returncode, 0, r.stderr[-600:])
            self.assertIn('parent: record_apps.py failed (exit 1)', open(box.path('logs', 'backup.log'), encoding='utf-8').read())
            import json
            self.assertTrue(json.load(open(box.path('site', 'backup-status.json'), encoding='utf-8'))['ok'])

    def test_no_record_without_a_push(self):
        with Sandbox(covers=False) as box:
            git(box.root, 'init', '-q', '-b', 'main')
            git(box.root, 'remote', 'add', 'origin', box.path('no-such-github.git'))
            os.makedirs(os.path.join(box.outer, 'tools'))
            open(os.path.join(box.outer, 'tools', 'record_apps.py'), 'w', encoding='utf-8').write("open('ran.txt', 'w').write('x')" + chr(10))
            run_backup()
            self.assertFalse(os.path.exists(os.path.join(box.outer, 'ran.txt')))


if __name__ == '__main__':
    unittest.main()
