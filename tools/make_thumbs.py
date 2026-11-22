"""Small copies of the covers for where they show small (22 Nov, for the Try switch "Pictures on Home: Smaller").

For every picture in site/covers/ it writes two WebP copies into site/covers/thumbs/, about twice the size they are
shown so they stay sharp on her screens:
  <name>.webp    460px tall at most (Home's cover cards are at most 222px tall at 1600 wide)
  <name>-s.webp  180px tall at most (the covers in a page's banner are at most 88px tall)
Only new or changed covers are redone; a copy whose cover has gone is deleted. Run it again after copy_covers.py.
Uses Pillow. LIBRARY_ROOT points it at another copy of the library (the tests).
"""
import os
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(os.environ.get("LIBRARY_ROOT") or Path(__file__).resolve().parent.parent)
COVERS = ROOT / "site" / "covers"
THUMBS = COVERS / "thumbs"
SIZES = {"": 460, "-s": 180}   # file name ending -> greatest height
EXTS = {".jpg", ".jpeg", ".png", ".webp"}


def make(src: Path) -> int:
    made = 0
    for end, tall in SIZES.items():
        out = THUMBS / f"{src.stem}{end}.webp"
        if out.exists() and out.stat().st_mtime >= src.stat().st_mtime:
            continue
        with Image.open(src) as im:
            im = im.convert("RGB")
            if im.height > tall:
                im = im.resize((max(1, round(im.width * tall / im.height)), tall), Image.LANCZOS)
            tmp = out.with_suffix(".part")
            im.save(tmp, "WEBP", quality=82, method=6)
            os.replace(tmp, out)
        made += 1
    return made


def main() -> int:
    THUMBS.mkdir(exist_ok=True)
    covers = [p for p in COVERS.iterdir() if p.is_file() and p.suffix.lower() in EXTS]
    made = sum(make(p) for p in covers)
    keep = {f"{p.stem}{end}.webp" for p in covers for end in SIZES}
    gone = [p for p in THUMBS.glob("*.webp") if p.name not in keep]
    for p in gone:
        p.unlink()
    total = sum(p.stat().st_size for p in THUMBS.glob("*.webp"))
    print(f"{len(covers)} covers: {made} small copies made, {len(gone)} removed; thumbs/ is {total / 1e6:.1f} MB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
