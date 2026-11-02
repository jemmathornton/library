"""Per-side edges, for a book that fills the photo with thin strips of table, cloth or shadow showing round it, each
side its own colour. Each side of the picture is checked on its own: if its outer strip is plain, the book's edge on
that side is where pixels stop looking like that strip, scanning inwards. Then the usual line fit, snap and checks."""
import sys
import numpy as np
from PIL import Image, ImageFilter
sys.path.insert(0, 'C:/Users/Jemma/Documents/HomeLibrary/tools')
import straighten as S

DIAG = {}
WEAK = 0.0   # 2 Nov: dropping weak sides made 24 of 244 worse; every found edge must be clear (below)


def _side_edge(lab, side, band=4, depth=.25):
    """Edge positions along one side (for each row/column, how far in the book starts), or None when that side's strip
    isn't plain."""
    h, w, _ = lab.shape
    if side == 'L':   strip, arr = lab[:, :band], lab
    elif side == 'R': strip, arr = lab[:, -band:], lab[:, ::-1]
    elif side == 'T': strip, arr = lab[:band].transpose(1, 0, 2), lab.transpose(1, 0, 2)
    else:             strip, arr = lab[-band:].transpose(1, 0, 2), lab[::-1].transpose(1, 0, 2)
    px = strip.reshape(-1, 3)
    med = np.median(px, axis=0)
    spread = np.maximum(np.median(np.abs(px - med), axis=0) * 1.4826, S.FLOOR)
    near = (np.abs(px - med) / spread).max(axis=1) < 3
    if near.mean() < .6:
        return None, None
    n_along, n_in = arr.shape[0], arr.shape[1]
    lim = max(4, int(n_in * depth))
    z = np.abs(arr[:, :lim] - med) / spread
    book = np.maximum(z[..., 0] / 2, np.hypot(z[..., 1], z[..., 2])) > 4
    # the book starts at the first run of 3 book pixels
    run = book[:, :-2] & book[:, 1:-1] & book[:, 2:]
    pos = np.where(run.any(axis=1), run.argmax(axis=1), lim).astype(float)
    return pos, med


def find(im):
    sc = min(1.0, S.SIZE / max(im.size))
    small = im.resize((round(im.width * sc), round(im.height * sc)), Image.BILINEAR) if sc < 1 else im
    w, h = small.size
    lab = S.to_lab(small.filter(ImageFilter.GaussianBlur(.8)))
    DIAG.clear()
    edges, meds = {}, {}
    for side in 'LRTB':
        pos, med = _side_edge(lab, side)
        if pos is None:
            edges[side] = None; continue
        n = len(pos); t = np.arange(n)
        sel = (t > n * .08) & (t < n * .92) & (pos > 1) & (pos < (w if side in 'LR' else h) * .25 - 1)
        if sel.sum() < n * .3:
            edges[side] = None; continue
        line = S._fit(t[sel].astype(float), pos[sel], -1e9, 1e9)
        if line is None:
            edges[side] = None; continue
        k, c = line
        # into picture co-ordinates: L x = k*y + c; R x = w-1-(k*y + c); T y = k*x + c; B y = h-1-(k*x + c)
        edges[side] = {'L': (k, c), 'R': (-k, w - 1 - c), 'T': (k, c), 'B': (-k, h - 1 - c)}[side]
        meds[side] = med
    found = [s for s in 'LRTB' if edges[s] is not None]
    if not found:
        return None
    gx, gy = S._gradients(small)
    strong = np.percentile(np.concatenate([gx.ravel(), gy.ravel()]), 90)
    support = []
    for s in found:
        upright = s in 'LR'
        edges[s], sup = S._snap(edges[s], gx if upright else gy, upright, w if upright else h, h if upright else w, strong)
        if sup < WEAK:      # not clearly an edge (a line across the picture): that side is the picture's own edge
            edges[s] = None
        else:
            support.append(sup)
    found = [s for s in found if edges[s] is not None]
    if not found or min(support) < .55:
        return None   # every edge found must clearly be an edge
    pts = S._corners(edges['L'], edges['R'], edges['T'], edges['B'], w, h)
    DIAG.update(found=''.join(found), support=[round(x, 2) for x in support])
    tl, tr, br, bl = pts
    ang = []
    for i in range(4):
        v1, v2 = pts[i - 1] - pts[i], pts[(i + 1) % 4] - pts[i]
        ang.append(np.degrees(np.arccos(np.clip(np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-9), -1, 1))))
    if min(ang) < 70 or max(ang) > 110:
        return None
    level = max(abs(tl[0] - bl[0]) / h, abs(tr[0] - br[0]) / h, abs(tl[1] - tr[1]) / w, abs(bl[1] - br[1]) / w)
    DIAG['level'] = level
    # printed frames: level and symmetric
    if 'L' in found and 'R' in found:
        lm, rm = (tl[0] + bl[0]) / 2 / w, 1 - (tr[0] + br[0]) / 2 / w
        if level < .006 and abs(lm - rm) < .015:
            return None
    if level < .004:
        return None   # nothing turned, and only a strip cut: a printed border as often as not
    if (np.abs(pts - np.array([[0, 0], [w - 1, 0], [w - 1, h - 1], [0, h - 1]])) / np.array([w, h])).max() < .015:
        return None
    return pts / sc


def straighten(im):
    im = im.convert('RGB')
    out = S.straighten(im)
    if out is not None:
        return out
    pts = find(im)
    if pts is None:
        return None
    return warp(im, pts)


def warp(im, pts):
    tl, tr, br, bl = pts
    W = round((np.linalg.norm(tr - tl) + np.linalg.norm(br - bl)) / 2)
    H = round((np.linalg.norm(bl - tl) + np.linalg.norm(br - tr)) / 2)
    eq, rhs = [], []
    for (X, Y), (x, y) in zip([(0, 0), (W, 0), (W, H), (0, H)], [tl, tr, br, bl]):
        eq += [[X, Y, 1, 0, 0, 0, -x * X, -x * Y], [0, 0, 0, X, Y, 1, -y * X, -y * Y]]
        rhs += [x, y]
    coef = np.linalg.solve(np.array(eq, float), np.array(rhs, float))
    return im.transform((W, H), Image.PERSPECTIVE, tuple(coef), Image.BICUBIC)
