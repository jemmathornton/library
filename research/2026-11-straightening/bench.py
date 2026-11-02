"""Score straightening methods on the test set. Usage: bench.py module[:function] [module...] [--limit N] [--sheet out.jpg]
For each photo: similarity of the raw photo to the true cover (baseline) and of each method's result. Prints a summary:
mean score, how often each method beats the raw photo, how often it gives up, and zoom (cut-off vs background)."""
import importlib, os, sys, time
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import score

HERE = os.path.dirname(os.path.abspath(__file__))
TS = os.path.join(HERE, os.environ.get('TESTSET', 'testset'))
args = sys.argv[1:]
limit = int(args[args.index('--limit') + 1]) if '--limit' in args else 10 ** 6
sheet_out = args[args.index('--sheet') + 1] if '--sheet' in args else None
names = [a for i, a in enumerate(args) if not a.startswith('--') and (i == 0 or args[i - 1] not in ('--limit', '--sheet'))]
methods = []
for n in names:
    mod, _, fn = n.partition(':')
    m = importlib.import_module(mod)
    methods.append((n, getattr(m, fn or 'straighten')))

cases = []
for d in sorted(os.listdir(TS)):
    p = os.path.join(TS, d)
    if not os.path.isdir(p) or not os.path.exists(os.path.join(p, 'true.jpg')):
        continue
    for f in sorted(os.listdir(p)):
        if f.startswith('photo-'):
            cases.append((d, os.path.join(p, 'true.jpg'), os.path.join(p, f)))
cases = cases[:limit]
rows = []
for isbn, tp, pp in cases:
    true, photo = Image.open(tp).convert('RGB'), Image.open(pp).convert('RGB')
    base = score.similarity(photo, true)
    r = {'case': f'{isbn}/{os.path.basename(pp)}', 'raw': base, 'img': {}}
    for n, f in methods:
        t0 = time.time()
        try:
            out = f(photo)
        except Exception as e:
            out = None
        r[n] = score.similarity(out, true) if out is not None else None
        r[n + '#t'] = time.time() - t0
        r[n + '#z'] = score.zoom_check(out, true) if out is not None else None
        r['img'][n] = out
    r['true'], r['photo'] = true, photo
    rows.append(r)

# a photo of a different printing can't match whatever we do: judged only on photos something matches reasonably
good = [r for r in rows if max([r['raw']] + [r[n] for n, _ in methods if r[n] is not None]) > .45]
print(f'{len(rows)} photos, {len(good)} where some version resembles the true cover')
groups = [('ALL', good), ('FLAT (seller used the publisher picture)', [r for r in good if r['raw'] > .93]), ('REAL PHOTOS', [r for r in good if r['raw'] <= .93])]
if '--only-photos' in args:
    good = groups[2][1]
for gname, grp in groups:
  if not grp: continue
  print(gname, len(grp))
  print(f'  raw photo: mean {np.mean([r["raw"] for r in grp]):.3f}')
  for n, _ in methods:
    sc = [r[n] if r[n] is not None else r['raw'] for r in grp]
    gave = sum(r[n] is None for r in grp)
    better = sum(r[n] is not None and r[n] > r['raw'] + .03 for r in grp)
    worse = sum(r[n] is not None and r[n] < r['raw'] - .03 for r in grp)
    print(f'  {n}: mean {np.mean(sc):.3f}  better {better}  worse {worse}  left alone {gave}')
if False:
  print(f'  raw photo: mean {np.mean([r["raw"] for r in good]):.3f}')
for n, _ in ([] if True else methods):
    sc = [r[n] if r[n] is not None else r['raw'] for r in good]   # giving up leaves the photo as it was
    gave = sum(r[n] is None for r in good)
    better = sum(r[n] is not None and r[n] > r['raw'] + .03 for r in good)
    worse = sum(r[n] is not None and r[n] < r['raw'] - .03 for r in good)
    zs = [r[n + '#z'] for r in good if r[n + '#z'] is not None]
    print(f'  {n}: mean {np.mean(sc):.3f}  better {better}  worse {worse}  gave up {gave}  '
          f'zoomed-in {sum(z < .95 for z in zs)}  background-left {sum(z > 1.05 for z in zs)}  time {np.mean([r[n + "#t"] for r in rows]):.2f}s')

if sheet_out:
    Hh = 150
    tiles = []
    for r in good:
        ims = [r['true'], r['photo']] + [r['img'][n] for n, _ in methods]
        labs = ['true', f'raw {r["raw"]:.2f}'] + [f'{n[:10]} {r[n]:.2f}' if r[n] is not None else f'{n[:10]} -' for n, _ in methods]
        parts = []
        for im, lab in zip(ims, labs):
            if im is None:
                im = Image.new('RGB', (60, Hh), (200, 60, 60))
            t = im.resize((max(1, round(im.width * Hh / im.height)), Hh))
            c = Image.new('RGB', (max(t.width, 70), Hh + 14), 'white'); c.paste(t, (0, 14)); ImageDraw.Draw(c).text((1, 1), lab, fill='black')
            parts.append(c)
        row = Image.new('RGB', (sum(p.width + 6 for p in parts), Hh + 14), (230, 230, 230)); x = 0
        for p in parts:
            row.paste(p, (x, 0)); x += p.width + 6
        tiles.append(row)
    Wd = max(t.width for t in tiles)
    sheet = Image.new('RGB', (Wd, sum(t.height + 6 for t in tiles)), (210, 210, 210)); y = 0
    for t in tiles:
        sheet.paste(t, (0, y)); y += t.height + 6
    sheet.save(sheet_out, quality=80)
    print('sheet', sheet.size)
