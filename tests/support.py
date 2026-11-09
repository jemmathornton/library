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


def _link_tree(src, dst):
    os.makedirs(dst, exist_ok=True)
    for name in os.listdir(src):
        s, d = os.path.join(src, name), os.path.join(dst, name)
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
    """with Sandbox() as root: ...  -> a library copy at root, removed afterwards."""

    def __init__(self, data=True):
        self.data = data

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
        _link_tree(os.path.join(REAL, 'site'), site)
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
