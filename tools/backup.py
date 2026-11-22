"""Weekly backup of Jemma's Library (18 Oct, her ask).

    pythonw tools/backup.py

Saves the week's changes to the library's own files in git (books added on the site, new covers, a reading import),
then sends them to her GitHub copy (19 Nov; see push()). GitHub keeps every version, off this PC.
21 Nov (her yes): only the library's own folders and notes are saved (LIBRARY_PARTS); any other new file in the folder is
left out and named in the log, since the GitHub copy is public. Each run also writes site/backup-status.json (not kept in
git), which the Home page reads to say when the last backup failed or hasn't run for over a week.
Until 19 Nov it also zipped the project to Documents\\HomeLibraryBackups; she dropped that once GitHub was set up.
22 Nov: it saves only on the main branch (as a submodule the Library could be left on a detached HEAD) and pushes main by
name; after a push it runs Jemma's Journals' tools/record_apps.py, so the parent records the Library's new version.
Run every Sunday by the Windows task "Jemma's Library - weekly backup" (tools/make_backup_task.ps1); log in logs/backup.log.
"""
import json, os, subprocess, sys
from datetime import date, datetime

ROOT = os.environ.get('LIBRARY_ROOT') or os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # tests run on a copy (9 Nov)
LOG = os.path.join(ROOT, 'logs', 'backup.log')
STATUS = os.path.join(ROOT, 'site', 'backup-status.json')
NO_WINDOW = getattr(subprocess, 'CREATE_NO_WINDOW', 0)
GH = os.path.join(os.environ.get('ProgramFiles', r'C:\Program Files'), 'GitHub CLI', 'gh.exe')
# the library's own files: what the weekly save may add (her yes, 21 Nov); files already in git are always saved
LIBRARY_PARTS = ['data', 'site', 'tools', 'tests', 'for-jemma', 'research', 'imports', 'CLAUDE.md', 'TODO.md', '.gitignore',
                 '.claude/launch.json']


def log(msg):
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    with open(LOG, 'a', encoding='utf-8') as fh:
        fh.write(f'{datetime.now():%Y-%m-%d %H:%M} {msg}\n')


def git(*args):
    env = {**os.environ, 'GIT_TERMINAL_PROMPT': '0'}   # never wait for a typed password (no one is there)
    return subprocess.run(['git', *args], cwd=ROOT, capture_output=True, text=True, creationflags=NO_WINDOW, timeout=600, env=env)


def push():
    """Sends the week's saves to her GitHub copy (her yes, 19 Nov: https://github.com/jemmathornton/library, public),
    signed in through the GitHub app on this PC. Skipped when there's no GitHub copy set up. True when it went."""
    if git('remote', 'get-url', 'origin').returncode != 0:
        log('github: no GitHub copy set up, nothing sent')
        return True
    helper = ['-c', 'credential.helper=', '-c', f"credential.helper=!'{GH.replace(os.sep, '/')}' auth git-credential"] if os.path.exists(GH) else []
    r = git(*helper, 'push', 'origin', 'main')   # the main branch by name (22 Nov: as a submodule it could be on a detached HEAD)
    log('github: pushed' if r.returncode == 0 else 'github push failed: ' + (r.stderr or r.stdout).strip()[-300:])
    return r.returncode == 0


def on_main():
    """The week's save must land on main (22 Nov: the Library is a submodule of Jemma's Journals, and updating submodules
    leaves them on a detached HEAD). Detached at main's own commit: back onto main. Anywhere else: False, nothing saved."""
    if git('rev-parse', '--git-dir').returncode != 0:   # no git here at all: nothing to save (save() and push() say so)
        return True
    if git('symbolic-ref', '-q', 'HEAD').stdout.strip() == 'refs/heads/main':
        return True
    head, main = git('rev-parse', 'HEAD').stdout.strip(), git('rev-parse', '-q', '--verify', 'refs/heads/main').stdout.strip()
    if head and head == main and git('checkout', '-q', 'main').returncode == 0:
        log('git: was on a detached HEAD at main, back on main')
        return True
    log('git: not on the main branch, so nothing saved or sent (' + (git('rev-parse', '--abbrev-ref', 'HEAD').stdout.strip() or '?') + ')')
    return False


def record_in_parent():
    """After a push, record the Library's new version in Jemma's Journals, the parent (its tools/record_apps.py; 22 Nov).
    Only when it's there; its output goes in the log; it never makes the backup fail."""
    script = os.path.join(ROOT, '..', 'tools', 'record_apps.py')
    if not os.path.exists(script):
        return
    try:
        r = subprocess.run([sys.executable, '-X', 'utf8', script], cwd=os.path.dirname(os.path.dirname(script)), capture_output=True,
                           text=True, encoding='utf-8', errors='replace', creationflags=NO_WINDOW, timeout=600,
                           env={**os.environ, 'GIT_TERMINAL_PROMPT': '0'})
        out = ' '.join((r.stdout + ' ' + r.stderr).split())[-400:]
        log(f'parent: record_apps.py {"done" if r.returncode == 0 else "failed (exit " + str(r.returncode) + ")"}' + (f': {out}' if out else ''))
    except Exception as e:
        log(f'parent: record_apps.py didn’t run: {e}')


def save():
    """The week's changes to the library's own files, committed. False if git failed."""
    if not git('status', '--porcelain').stdout.strip():
        return True
    git('add', '-u')   # changes to files already saved before
    parts = [p for p in LIBRARY_PARTS if os.path.exists(os.path.join(ROOT, p))]
    if parts:
        git('add', '-A', '--', *parts)
    left = [l[3:] for l in git('status', '--porcelain', '--untracked-files=all').stdout.splitlines() if l.startswith('??')]
    if left:
        log('left out (not the library\'s own files, so not sent to the public GitHub copy): ' + ', '.join(left[:20]) + (' …' if len(left) > 20 else ''))
    if not git('diff', '--cached', '--quiet').returncode:
        return True   # nothing of the library's own changed
    r = git('commit', '-q', '-m', f'Weekly backup {date.today().isoformat()}: changes since the last save')
    log('git: saved changes' if r.returncode == 0 else 'git: ' + (r.stderr or r.stdout).strip())
    return r.returncode == 0


def write_status(ok, why=''):
    """For the Home page's note: when it last tried, whether that worked, and when it last worked."""
    try:
        before = json.load(open(STATUS, encoding='utf-8'))
    except Exception:
        before = {}
    now = datetime.now().isoformat(timespec='minutes')
    status = {'lastTry': now, 'ok': ok, 'lastOk': now if ok else before.get('lastOk', ''), 'why': '' if ok else why[-200:]}
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from safe_write import write_json
    os.makedirs(os.path.dirname(STATUS), exist_ok=True)
    write_json(STATUS, status)


def main():
    log('started')
    ok, why, branch_ok = True, '', False
    try:
        branch_ok = on_main()
        if not branch_ok:
            ok, why = False, 'the library wasn’t on its main branch'
        elif not save():
            ok, why = False, 'saving the changes in git failed'
    except Exception as e:
        log(f'git failed: {e}'); ok, why = False, 'git failed'
    pushed = False
    try:
        if branch_ok:
            pushed = push()
            if not pushed:
                ok, why = False, why or 'sending to GitHub failed'
    except Exception as e:
        log(f'github push failed: {e}'); ok, why = False, why or 'sending to GitHub failed'
    if pushed:
        record_in_parent()
    try:
        write_status(ok, why)
    except Exception as e:
        log(f'status not written: {e}')
    if not ok:
        sys.exit(1)


if __name__ == '__main__':
    main()
