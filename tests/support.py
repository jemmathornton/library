"""Shared test setup: a throwaway copy of the library for each test, so the tests never touch her real files.

A sandbox is a temporary folder laid out like the library: data/ and imports/ copied, logs/ empty, and site/ with its
pictures linked rather than copied (hard links: instant and take no space; every write in the code replaces a file
rather than writing into it, so the real pictures can't change). index.html and js/ are real copies because the build
writes them. The scripts in tools/ are loaded fresh with LIBRARY_ROOT pointing at the sandbox.
"""
import importlib.util, json, os, shutil, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
REAL = os.path.dirname(HERE)
TOOLS = os.path.join(REAL, 'tools')
PYTHON = sys.executable
if TOOLS not in sys.path:
    sys.path.insert(0, TOOLS)


def _link_tree(src, dst, skip=()):
    os.makedirs(dst, exist_ok=True)
    for name in os.listdir(src):
        s, d = os.path.join(src, name), os.path.join(dst, name)
        if name in skip:   # left empty (a made-up library brings its own pictures)
            os.makedirs(d, exist_ok=True)
            continue
        if os.path.isdir(s):
            if name == '_straightened':   # straightened covers waiting to be added: not needed, can be many
                os.makedirs(d, exist_ok=True)
                continue
            _link_tree(s, d)
        else:
            try:
                os.link(s, d)
            except OSError:
                shutil.copy2(s, d)


class Sandbox:
    """with Sandbox() as box: ...  -> a library copy at box.root, removed afterwards.
    data=False: an empty data/ (a test writes its own); covers=False: an empty site/covers (no links to her pictures)."""

    def __init__(self, data=True, covers=True):
        self.data, self.covers = data, covers

    def __enter__(self):
        self.root = tempfile.mkdtemp(prefix='library-test-')
        if self.data:
            shutil.copytree(os.path.join(REAL, 'data'), os.path.join(self.root, 'data'),
                            ignore=shutil.ignore_patterns('*.tmp', 'scanned.json'))
        else:
            os.makedirs(os.path.join(self.root, 'data'))
        os.makedirs(os.path.join(self.root, 'imports'))
        os.makedirs(os.path.join(self.root, 'logs'))
        site = os.path.join(self.root, 'site')
        _link_tree(os.path.join(REAL, 'site'), site, skip=() if self.covers else ('covers', 'covers-trial'))
        for name in ('index.html',):   # written by the build: real copies, never links
            os.remove(os.path.join(site, name)); shutil.copy2(os.path.join(REAL, 'site', name), os.path.join(site, name))
        shutil.rmtree(os.path.join(site, 'js')); shutil.copytree(os.path.join(REAL, 'site', 'js'), os.path.join(site, 'js'))
        self.downloads = os.path.join(self.root, 'downloads'); os.makedirs(self.downloads)
        self.appdata = os.path.join(self.root, 'appdata'); os.makedirs(self.appdata)
        self._env = {k: os.environ.get(k) for k in ('LIBRARY_ROOT', 'LIBRARY_DOWNLOADS', 'LOCALAPPDATA', 'LIBRARY_BACKUPS')}
        os.environ.update(LIBRARY_ROOT=self.root, LIBRARY_DOWNLOADS=self.downloads, LOCALAPPDATA=self.appdata,
                          LIBRARY_BACKUPS=os.path.join(self.root, 'backups'))
        return self

    def __exit__(self, *exc):
        for k, v in self._env.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v
        shutil.rmtree(self.root, ignore_errors=True)

    # helpers
    def path(self, *parts):
        return os.path.join(self.root, *parts)

    def read(self, name, default=None):
        p = self.path('data', name)
        return json.load(open(p, encoding='utf-8')) if os.path.exists(p) else default

    def write(self, name, obj):
        with open(self.path('data', name), 'w', encoding='utf-8') as fh:
            json.dump(obj, fh, ensure_ascii=False, indent=1)

    def built(self):
        """site/js/data.js of the sandbox, as a dict."""
        text = open(self.path('site', 'js', 'data.js'), encoding='utf-8').read()
        return json.loads(text.split('const DATA = ', 1)[1].rsplit(';', 1)[0])


def load(name):
    """A fresh copy of tools/<name>.py, reading LIBRARY_ROOT as it is now."""
    spec = importlib.util.spec_from_file_location(f'{name}_under_test', os.path.join(TOOLS, name + '.py'))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def real_built():
    text = open(os.path.join(REAL, 'site', 'js', 'data.js'), encoding='utf-8').read()
    return json.loads(text.split('const DATA = ', 1)[1].rsplit(';', 1)[0])


def run_build(box):
    """tools/build.py on the sandbox; site/js/data.js as a dict."""
    import subprocess
    r = subprocess.run([PYTHON, '-X', 'utf8', os.path.join(TOOLS, 'build.py')], capture_output=True, text=True, env=os.environ.copy())
    if r.returncode:
        raise AssertionError('build failed:\n' + r.stderr[-1500:])
    return box.built()


class FakeWeb:
    """The internet, faked (19 Nov): while it's on, urllib's urlopen answers from a table instead of going out.

        with FakeWeb({'openlibrary.org/isbn/97': {...}, 'amazon': picture_bytes, 'google': 404}) as web: ...

    Each key is looked for in the address (the first that fits answers): a dict or list is sent as JSON, bytes as they
    are, a number is that HTTP error, an exception is raised. Anything not in the table is a 404. web.asked lists every
    address asked for, so a test can check nothing went out that shouldn't."""

    def __init__(self, table):
        self.table, self.asked = table, []

    def _open(self, req, *a, **kw):
        import io, urllib.error
        url = req.full_url if hasattr(req, 'full_url') else str(req)
        self.asked.append(url)
        answer = next((v for k, v in self.table.items() if k in url), 404)
        if callable(answer) and not isinstance(answer, type):
            answer = answer(url)
        if isinstance(answer, BaseException) or (isinstance(answer, type) and issubclass(answer, BaseException)):
            raise answer
        if isinstance(answer, int):
            raise urllib.error.HTTPError(url, answer, 'fake', {}, io.BytesIO(b''))
        body = answer if isinstance(answer, bytes) else json.dumps(answer).encode()

        class Reply(io.BytesIO):
            status = 200

            def __enter__(self):
                return self

            def __exit__(self, *exc):
                self.close()
        return Reply(body)

    def __enter__(self):
        import urllib.request
        self._real = urllib.request.urlopen
        urllib.request.urlopen = self._open
        return self

    def __exit__(self, *exc):
        import urllib.request
        urllib.request.urlopen = self._real


def picture(w, h, colour=(120, 80, 40)):
    """A made-up JPEG, as bytes."""
    import io
    from PIL import Image
    out = io.BytesIO()
    Image.new('RGB', (w, h), colour).save(out, 'JPEG')
    return out.getvalue()
