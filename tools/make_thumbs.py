"""Small copies of the covers for where they show small (her pick, 22 Nov: "smaller pictures").

For every picture in site/covers/ it writes two WebP copies into site/covers/thumbs/, about twice the size they are
shown so they stay sharp on her screens:
  <name>.webp    460px tall at most (cover cards on Home, the shelves, authors, History...: at most 222px tall at 1600 wide)
  <name>-s.webp  180px tall at most (the covers in a page's banner are at most 88px tall)
A book's own page and the lightbox keep the cover itself.

Run by tools/build.py on every build (so after the Add page saves a book or a cover is replaced, as tools/serve.py rebuilds
then), and by hand with this script. Only new or changed covers are redone: each small copy carries its cover's exact
modified time, so a cover replaced by any other picture (even an older file) no longer matches and is redone. A copy
whose cover has gone is deleted. Existing files are never changed in place (the tests' copies are hard links to hers):
a new copy is written beside and swapped in. Uses Pillow. LIBRARY_ROOT points it at another copy of the library (the tests).
"""
import os
import sys
from pathlib import Path

ROOT = Path(os.environ.get("LIBRARY_ROOT") or Path(__file__).resolve().parent.parent)
COVERS = ROOT / "site" / "covers"
SIZES = {"": 460, "-s": 180}   # file name ending -> greatest height
EXTS = {".jpg", ".jpeg", ".png", ".webp"}


def current(src: Path, out: Path) -> bool:
    """The small copy is there and was made from this very cover (it carries the cover's modified time)."""
    try:
        return out.stat().st_mtime_ns == src.stat().st_mtime_ns
    except FileNotFoundError:
        return False


def make(src: Path, thumbs: Path = None) -> int:
    """Both small copies of one cover, where missing or out of date; how many were made."""
    from PIL import Image
    thumbs = thumbs or src.parent / "thumbs"
    thumbs.mkdir(parents=True, exist_ok=True)
    made = 0
    for end, tall in SIZES.items():
        out = thumbs / f"{src.stem}{end}.webp"
        if current(src, out):
            continue
        stamp = src.stat().st_mtime_ns
        with Image.open(src) as im:
            im = im.convert("RGB")
            if im.height > tall:
                im = im.resize((max(1, round(im.width * tall / im.height)), tall), Image.LANCZOS)
            tmp = out.with_suffix(".part")
            im.save(tmp, "WEBP", quality=82, method=6)
        os.utime(tmp, ns=(stamp, stamp))   # the new file only, before it's swapped in
        os.replace(tmp, out)
        made += 1
    return made


def make_all(folder: Path = None, quiet=False) -> int:
    """Every cover in the folder (site/covers): small copies made where needed, those of covers gone deleted."""
    folder = Path(folder or COVERS)
    thumbs = folder / "thumbs"
    if not folder.is_dir():
        return 0
    covers = [p for p in folder.iterdir() if p.is_file() and p.suffix.lower() in EXTS]
    made = sum(make(p, thumbs) for p in covers)
    keep = {f"{p.stem}{end}.webp" for p in covers for end in SIZES}
    gone = [p for p in thumbs.glob("*.webp") if p.name not in keep] if thumbs.is_dir() else []
    for p in gone:
        p.unlink()
    if not quiet or made or gone:
        total = sum(p.stat().st_size for p in thumbs.glob("*.webp")) if thumbs.is_dir() else 0
        print(f"{len(covers)} covers: {made} small copies made, {len(gone)} removed; thumbs/ is {total / 1e6:.1f} MB")
    return made


def main() -> int:
    make_all()
    return 0


if __name__ == "__main__":
    sys.exit(main())
