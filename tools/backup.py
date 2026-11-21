"""Weekly backup of Jemma's Library (18 Oct, her ask).

    pythonw tools/backup.py

Saves the week's changes to the library's own files in git (books added on the site, new covers, a reading import),
then sends them to her GitHub copy (19 Nov; see push()). GitHub keeps every version, off this PC.
21 Nov (her yes): only the library's own folders and notes are saved (LIBRARY_PARTS); any other new file in the folder is
left out and named in the log, since the GitHub copy is public. Each run also writes site/backup-status.json (not kept in
git), which the Home page reads to say when the last backup failed or hasn't run for over a week.
Until 19 Nov it also zipped the project to Documents\\HomeLibraryBackups; she dropped that once GitHub was set up.
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
    r = git(*helper, 'push', 'origin', 'HEAD')
    log('github: pushed' if r.returncode == 0 else 'github push failed: ' + (r.stderr or r.stdout).strip()[-300:])
    return r.returncode == 0


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
    ok, why = True, ''
    try:
        if not save():
            ok, why = False, 'saving the changes in git failed'
    except Exception as e:
        log(f'git failed: {e}'); ok, why = False, 'git failed'
    try:
        if not push():
            ok, why = False, why or 'sending to GitHub failed'
    except Exception as e:
        log(f'github push failed: {e}'); ok, why = False, why or 'sending to GitHub failed'
    try:
        write_status(ok, why)
    except Exception as e:
        log(f'status not written: {e}')
    if not ok:
        sys.exit(1)


if __name__ == '__main__':
    main()
