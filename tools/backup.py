"""Weekly backup of Jemma's Library (18 Oct, her ask).

    pythonw tools/backup.py

1. Saves any changes in the project to git (books added on the site since the last save, new covers, a reading import).
2. Zips the whole library (everything but git's own folder) to Documents\\HomeLibraryBackups\\HomeLibrary backup <date>.zip,
   like the Sims site's backups, and keeps the newest 8.
Run every Sunday by the Windows task "Jemma's Library - weekly backup" (tools/make_backup_task.ps1); log in logs/backup.log.
"""
import os, subprocess, sys, zipfile
from datetime import date, datetime

ROOT = os.environ.get('LIBRARY_ROOT') or os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # tests run on a copy (9 Nov)
DEST = os.environ.get('LIBRARY_BACKUPS') or os.path.join(os.path.expanduser('~'), 'Documents', 'HomeLibraryBackups')
KEEP = 8
LOG = os.path.join(ROOT, 'logs', 'backup.log')
NO_WINDOW = getattr(subprocess, 'CREATE_NO_WINDOW', 0)


def log(msg):
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    with open(LOG, 'a', encoding='utf-8') as fh:
        fh.write(f'{datetime.now():%Y-%m-%d %H:%M} {msg}\n')


def git(*args):
    return subprocess.run(['git', *args], cwd=ROOT, capture_output=True, text=True, creationflags=NO_WINDOW)


# Review, 15 Nov: the zip took so long that Windows stopped the task half-way, and nothing said so. Now: pictures are
# stored as they are (squeezing a JPEG again only costs time), big downloads not kept in git (for-jemma/*/pictures) are
# left out, a leftover .part is cleared, the start is logged, and the git history goes in as one file
# (library-history.bundle; `git clone library-history.bundle HomeLibrary` gives it back).
SKIP_DIRS = {'.git', '__pycache__', 'logs'}
STORED = ('.jpg', '.jpeg', '.png', '.webp', '.gif', '.zip', '.exe', '.bundle')   # already squeezed


def skipped(rel):
    """Big downloads not kept in git: full-size seller pictures behind the boards in for-jemma."""
    parts = rel.replace(os.sep, '/').split('/')
    return len(parts) >= 3 and parts[0] == 'for-jemma' and parts[2] == 'pictures'


def main():
    log('started')
    os.makedirs(DEST, exist_ok=True)
    for f in os.listdir(DEST):   # a run Windows stopped half-way leaves a .part behind: it's no backup
        if f.startswith('HomeLibrary backup ') and f.endswith('.part'):
            try:
                os.remove(os.path.join(DEST, f)); log(f'removed an unfinished {f}')
            except OSError:
                pass
    try:   # on its own: if git can't run (not found, the repo busy), the zip still happens
        if git('status', '--porcelain').stdout.strip():
            git('add', '-A')
            r = git('commit', '-q', '-m', f'Weekly backup {date.today().isoformat()}: changes since the last save')
            log('git: saved changes' if r.returncode == 0 else 'git: ' + (r.stderr or r.stdout).strip())
    except Exception as e:
        log(f'git failed: {e}')
    out = os.path.join(DEST, f'HomeLibrary backup {date.today().isoformat()}.zip')
    part = out + '.part'   # renamed once finished, so a broken zip is never kept as a backup
    bundle = os.path.join(DEST, 'library-history.bundle.tmp')
    try:
        n = 0
        with zipfile.ZipFile(part, 'w', zipfile.ZIP_DEFLATED) as z:
            for here, dirs, files in os.walk(ROOT):
                dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not skipped(os.path.relpath(os.path.join(here, d), ROOT))]
                for f in files:
                    if f.endswith(('.lnk', '.tmp')):
                        continue
                    p = os.path.join(here, f)
                    z.write(p, os.path.join('HomeLibrary', os.path.relpath(p, ROOT)),
                            zipfile.ZIP_STORED if f.lower().endswith(STORED) else zipfile.ZIP_DEFLATED)
                    n += 1
            try:   # the whole git history, as one file
                if git('bundle', 'create', bundle, '--all').returncode == 0:
                    z.write(bundle, 'library-history.bundle', zipfile.ZIP_STORED)
                else:
                    log('git bundle failed: the zip has the files but not their history')
            except Exception as e:
                log(f'git bundle failed: {e}')
        with zipfile.ZipFile(part) as z:
            bad = z.testzip()
        if bad:
            raise RuntimeError(f'the zip came out broken ({bad})')
        os.replace(part, out)
        old = sorted(f for f in os.listdir(DEST) if f.startswith('HomeLibrary backup ') and f.endswith('.zip'))
        for f in old[:-KEEP]:
            os.remove(os.path.join(DEST, f))
        log(f'zipped {n} files to {out} ({os.path.getsize(out) / 1e6:.1f} MB); {min(len(old), KEEP)} backups kept')
    except Exception as e:
        log(f'failed: {e}')
        if os.path.exists(part):
            os.remove(part)
        sys.exit(1)
    finally:
        if os.path.exists(bundle):
            os.remove(bundle)


if __name__ == '__main__':
    main()
