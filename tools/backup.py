"""Weekly backup of Jemma's Library (18 Oct, her ask).

    pythonw tools/backup.py

Saves any changes in the project to git (books added on the site since the last save, new covers, a reading import),
then sends them to her GitHub copy (19 Nov; see push()). GitHub keeps every version, off this PC.
Until 19 Nov it also zipped the project to Documents\\HomeLibraryBackups; she dropped that once GitHub was set up (the
zips sat on the same disk and held nothing git doesn't, apart from the logs).
Run every Sunday by the Windows task "Jemma's Library - weekly backup" (tools/make_backup_task.ps1); log in logs/backup.log.
"""
import os, subprocess, sys
from datetime import date, datetime

ROOT = os.environ.get('LIBRARY_ROOT') or os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # tests run on a copy (9 Nov)
LOG = os.path.join(ROOT, 'logs', 'backup.log')
NO_WINDOW = getattr(subprocess, 'CREATE_NO_WINDOW', 0)
GH = os.path.join(os.environ.get('ProgramFiles', r'C:\Program Files'), 'GitHub CLI', 'gh.exe')


def log(msg):
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    with open(LOG, 'a', encoding='utf-8') as fh:
        fh.write(f'{datetime.now():%Y-%m-%d %H:%M} {msg}\n')


def git(*args):
    return subprocess.run(['git', *args], cwd=ROOT, capture_output=True, text=True, creationflags=NO_WINDOW, timeout=600)


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


def main():
    log('started')
    ok = True
    try:
        if git('status', '--porcelain').stdout.strip():
            git('add', '-A')
            r = git('commit', '-q', '-m', f'Weekly backup {date.today().isoformat()}: changes since the last save')
            log('git: saved changes' if r.returncode == 0 else 'git: ' + (r.stderr or r.stdout).strip())
            ok = r.returncode == 0
    except Exception as e:
        log(f'git failed: {e}'); ok = False
    try:
        ok = push() and ok
    except Exception as e:
        log(f'github push failed: {e}'); ok = False
    if not ok:
        sys.exit(1)


if __name__ == '__main__':
    main()
