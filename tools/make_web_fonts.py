"""EB Garamond for the site, small (her OK, 21 Nov): the full TTFs in fonts/ (about 2.5 MB, from her Parahumans print set,
SIL OFL) cut down to the characters the site uses and saved as WOFF2 in site/fonts/. Every OpenType feature is kept (the
small capitals in Details, figures, ligatures). Run again after a new book brings a letter not in the set:

    python -X utf8 tools/make_web_fonts.py

Needs fontTools and brotli (pip install fonttools brotli)."""
import os
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = os.environ.get('LIBRARY_ROOT') or os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEIGHTS = ('Regular', 'Italic', 'Medium', 'SemiBold')


def wanted():
    """Basic Latin, Latin-1, Latin Extended-A, the punctuation (curly quotes, dashes, ellipsis, £, €, ❦…) and every
    character in the site's own text and her books."""
    text = ''.join(open(os.path.join(ROOT, p), encoding='utf-8').read() for p in ('site/js/data.js', 'site/js/app.js', 'site/index.html'))
    cps = {ord(c) for c in text}
    cps |= set(range(0x20, 0x7F)) | set(range(0xA0, 0x180)) | set(range(0x2010, 0x2028)) | set(range(0x2030, 0x203B))
    cps |= {0x192, 0x2C6, 0x2DC, 0x2044, 0x20AC, 0x2116, 0x2122, 0x2190, 0x2191, 0x2192, 0x2193, 0x2212, 0x2215, 0x2766, 0x2767}
    return cps


def main():
    cps = wanted()
    for name in WEIGHTS:
        src = os.path.join(ROOT, 'fonts', f'EBGaramond-{name}.ttf')
        out = os.path.join(ROOT, 'site', 'fonts', f'EBGaramond-{name}.woff2')
        font = TTFont(src)
        have = sorted(c for c in cps if c in font.getBestCmap())
        opts = subset.Options()
        opts.flavor = 'woff2'
        opts.layout_features = ['*']
        opts.name_IDs = ['*']
        opts.name_languages = ['*']
        opts.notdef_outline = True
        opts.hinting = False
        sub = subset.Subsetter(opts)
        sub.populate(unicodes=have)
        sub.subset(font)
        font.flavor = 'woff2'
        font.save(out)
        print(f'{name}: {os.path.getsize(src):,} -> {os.path.getsize(out):,} bytes ({len(have)} characters)')


if __name__ == '__main__':
    main()
