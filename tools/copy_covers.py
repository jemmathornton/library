"""Copy every cover in data/covers.json into site/covers/<isbn>.jpg, so the site shows them straight away and works offline.

    python -X utf8 tools/copy_covers.py          copies only covers not copied yet
    python -X utf8 tools/copy_covers.py --all    copies them all again

Pictures taller than 600px are made 600px tall (enough for the book page); the build then uses the copy instead of the link.
"""
import io, json, os, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COVERS = os.path.join(ROOT, 'site', 'covers')
UA = {'User-Agent': "Jemma's Home Library (private prototype)"}
TALL = 600


def copy(isbn, src):
    out = os.path.join(COVERS, isbn + '.jpg')
    try:
        with urllib.request.urlopen(urllib.request.Request(src, headers=UA), timeout=60) as r:
            img = Image.open(io.BytesIO(r.read()))
            img.load()
    except Exception as e:
        return isbn, f'failed: {e}'
    if img.width < 20 or img.height < 20:          # a blank placeholder, not a cover
        return isbn, 'blank picture'
    img = img.convert('RGB')
    if img.height > TALL:
        img = img.resize((round(img.width * TALL / img.height), TALL), Image.LANCZOS)
    img.save(out, 'JPEG', quality=86, optimize=True, progressive=True)
    return isbn, None


def main():
    os.makedirs(COVERS, exist_ok=True)
    covers = json.load(open(os.path.join(ROOT, 'data', 'covers.json'), encoding='utf-8'))
    todo = [(i, c['src']) for i, c in covers.items()
            if c and c.get('src') and not i.startswith('_') and not (c.get('straightened') and os.path.exists(os.path.join(COVERS, i + '.jpg')))
            and ('--all' in sys.argv or not os.path.exists(os.path.join(COVERS, i + '.jpg')))]
    print(f'{len(todo)} covers to copy')
    problems = []
    with ThreadPoolExecutor(4) as pool:
        for n, (isbn, err) in enumerate(pool.map(lambda t: copy(*t), todo), 1):
            if err:
                problems.append((isbn, err))
            if n % 50 == 0:
                print(f'  {n} done', flush=True)
    size = sum(os.path.getsize(os.path.join(COVERS, f)) for f in os.listdir(COVERS))
    print(f'Copied {len(todo) - len(problems)}; site/covers now holds {len(os.listdir(COVERS))} pictures, {size / 1e6:.1f} MB.')
    for isbn, err in problems:
        print(f'  {isbn}: {err}')


if __name__ == '__main__':
    main()
