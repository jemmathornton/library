"""Straighten a cover photographed at an angle, or cut away what's round it ("Cropped or at an angle" on the Add a Book
page, her ask, 1 Nov).

Tested overnight 1–2 Nov on about 500 AbeBooks sellers' pictures of books whose right cover is already on the site
(the first try, cutting along wherever the background seemed to stop, made two thirds of them worse). What it does:

1. Is there a background? Each side of the picture's border is checked for being mostly one plain colour (a table, a
   sheet, a cloth). Fewer than two plain sides: the picture is the cover itself and is left alone.
2. The book is whatever is clearly unlike that background (judged mostly by colour, since folds and shadows change a
   cloth's brightness, not its colour, and in units of how much the background itself varies).
3. Each edge is a straight line fitted where the book stops, then moved onto the strongest straight edge within a few
   pixels. An edge that runs off the picture is the picture's own edge, so all the cover in the photo is kept (her
   choice, 1 Nov).
4. Only used when it's clearly a book: solid inside the outline, a book's shape (corners near square, opposite sides
   alike), and not one of the look-alikes that fooled earlier tries: a frame printed on the cover (dead level and exactly
   centred, as on Katabasis), a coloured border of perfectly even colour (Inheritance's green, a painted border), or a
   thin coloured margin all round (Heartstopper's printed line). A white or black border does go (her choice, 1 Nov).
5. The four corners are pulled square in true perspective.

    straighten(image, edge=0) -> PIL image, or None when it's best left as it is
    edge moves every side out (more than 0) or in (less than 0) by that many pixels of the original picture.
    warp(image, corners) -> the four corners she set pulled square ("Set the corners", 2 Nov)
"""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps

SIZE = 700                              # the picture is examined at this size (long side); the cut is from the original
FLOOR = np.array([5.0, 3.0, 3.0])       # least spread allowed for the background (LAB), or every shadow looks like book


def to_lab(im):
    """LAB as numbers. Pillow keeps a and b as signed bytes; read as 0..255, a neutral grey jumps between 0 and 255."""
    a = np.asarray(im.convert('LAB')).astype(float)
    a[..., 1:] = (a[..., 1:] + 128) % 256 - 128
    return a


def background(lab, band=6, plain=.6):
    """The background's colour and spread from the plain sides of the border, or None when fewer than two are plain."""
    sides = {'top': lab[:band].reshape(-1, 3), 'bottom': lab[-band:].reshape(-1, 3),
             'left': lab[:, :band].reshape(-1, 3), 'right': lab[:, -band:].reshape(-1, 3)}
    allb = np.concatenate(list(sides.values()))
    med = np.median(allb, axis=0)
    spread = np.maximum(np.median(np.abs(allb - med), axis=0) * 1.4826, FLOOR)
    plain_sides = [k for k, v in sides.items() if ((np.abs(v - med) / spread).max(axis=1) < 3).mean() >= plain]
    if len(plain_sides) < 2:
        return None
    pb = np.concatenate([sides[k] for k in plain_sides])
    med = np.median(pb, axis=0)
    return med, np.maximum(np.median(np.abs(pb - med), axis=0) * 1.4826, FLOOR), len(plain_sides)


def _fit(t, v, lo, hi):
    """A straight edge v = k*t + c through the points where the book stops; None when it's mostly off the picture."""
    off_pic = (v <= lo + 2) | (v >= hi - 2)
    if off_pic.mean() > .7 or (~off_pic).sum() < 8:
        return None
    t, v = t[~off_pic], v[~off_pic]
    k, c = np.polyfit(t, v, 1)
    for _ in range(3):   # leave out stray points (a thumb, a shadow, a sticker) and fit again
        off = np.abs(v - (k * t + c))
        keep = off <= max(2.0, np.percentile(off, 60))
        k, c = np.polyfit(t[keep], v[keep], 1)
    return k, c


def _gradients(small):
    lab = to_lab(small.filter(ImageFilter.GaussianBlur(1.0)))
    lab[..., 1:] *= 2
    gx = np.zeros(lab.shape[:2]); gy = np.zeros(lab.shape[:2])
    for c in range(3):
        dy, dx = np.gradient(lab[..., c])
        gx += dx * dx; gy += dy * dy
    return np.sqrt(gx), np.sqrt(gy)


def _snap(line, g, upright, n_across, n_along, strong):
    """The fitted edge moved (and turned a little) onto the strongest straight edge within 8 pixels; with the share of
    its length where an edge is clearly there."""
    k0, c0 = line
    t = np.arange(int(n_along * .06), int(n_along * .94))
    best = (-1, k0, c0, 0.0)
    for dk in np.tan(np.deg2rad(np.arange(-1.5, 1.51, .25))):
        for dc in range(-8, 9):
            k, c = k0 + dk, c0 + dc
            v = np.round(k * t + c).astype(int)
            ok = (v >= 0) & (v < n_across)
            if ok.mean() < .7:
                continue
            vals = g[t[ok], v[ok]] if upright else g[v[ok], t[ok]]
            if vals.mean() > best[0]:
                best = (vals.mean(), k, c, float((vals > strong).mean()))
    return (best[1], best[2]), best[3]


def _corners(L, R, T, B, w, h):
    """Corners from the edges (x = k*y + c for left and right, y = k*x + c for top and bottom); a missing edge is the
    picture's own."""
    kL, cL = L or (0.0, 0.0); kR, cR = R or (0.0, w - 1.0)
    kT, cT = T or (0.0, 0.0); kB, cB = B or (0.0, h - 1.0)
    out = []
    for (sk, sc), (ek, ec) in (((kL, cL), (kT, cT)), ((kR, cR), (kT, cT)), ((kR, cR), (kB, cB)), ((kL, cL), (kB, cB))):
        x = (sk * ec + sc) / (1 - sk * ek)
        out.append((min(max(x, 0), w - 1), min(max(ek * x + ec, 0), h - 1)))
    return np.array(out)


def find_outline(im):
    """The book's corners (top left, top right, bottom right, bottom left) in the picture, or None when it's best left
    alone."""
    sc = min(1.0, SIZE / max(im.size))
    small = im.resize((round(im.width * sc), round(im.height * sc)), Image.BILINEAR) if sc < 1 else im
    w, h = small.size
    lab = to_lab(small)
    bg = background(lab)
    if bg is None:
        return None
    med, spread, plain = bg
    z = np.abs(lab - med) / spread
    raw_mask = np.maximum(z[..., 0] / 2, np.hypot(z[..., 1], z[..., 2])) > 4
    mask = raw_mask
    mask = np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(9))) > 127
    if not .08 < mask.mean() < .985:
        return None
    rows, cols = np.nonzero(mask.mean(1) > .02)[0], np.nonzero(mask.mean(0) > .02)[0]
    if len(rows) < 20 or len(cols) < 20:
        return None
    y0, y1, x0, x1 = rows[0], rows[-1], cols[0], cols[-1]
    ry = np.arange(int(y0 + .08 * (y1 - y0)), int(y1 - .08 * (y1 - y0)))
    cx = np.arange(int(x0 + .08 * (x1 - x0)), int(x1 - .08 * (x1 - x0)))
    ry, cx = ry[mask[ry].any(1)], cx[mask[:, cx].any(0)]
    if len(ry) < 10 or len(cx) < 10:
        return None
    edges = {'L': _fit(ry, np.array([np.argmax(mask[y]) for y in ry], float), 0, w - 1),
             'R': _fit(ry, np.array([w - 1 - np.argmax(mask[y][::-1]) for y in ry], float), 0, w - 1),
             'T': _fit(cx, np.array([np.argmax(mask[:, x]) for x in cx], float), 0, h - 1),
             'B': _fit(cx, np.array([h - 1 - np.argmax(mask[::-1, x]) for x in cx], float), 0, h - 1)}
    gx, gy = _gradients(small)
    strong = np.percentile(np.concatenate([gx.ravel(), gy.ravel()]), 90)
    support = []
    found = [k for k, v in edges.items() if v is not None]
    for name, line in edges.items():
        if line is not None:
            upright = name in 'LR'
            edges[name], s = _snap(line, gx if upright else gy, upright, w if upright else h, h if upright else w, strong)
            support.append(s)
    if len(support) < 2:
        return None   # one edge alone is a strip cut off, as often a cover's own white space as a background (My Brilliant Friend)
    pts = _corners(edges['L'], edges['R'], edges['T'], edges['B'], w, h)

    # is it a book?
    q = Image.new('L', (w, h), 0); ImageDraw.Draw(q).polygon([tuple(p) for p in pts], fill=255)
    q = np.asarray(q) > 0
    fill = float(mask[q].mean())                    # solid inside (cover art taken for an edge leaves holes)
    outside = float(mask[~q].mean()) if (~q).any() else 0.0
    margin = 1 - float(q.mean())
    tl, tr, br, bl = pts
    ang = []
    for i in range(4):
        v1, v2 = pts[i - 1] - pts[i], pts[(i + 1) % 4] - pts[i]
        ang.append(np.degrees(np.arccos(np.clip(np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-9), -1, 1))))
    lens = [np.linalg.norm(tr - tl), np.linalg.norm(br - tr), np.linalg.norm(bl - br), np.linalg.norm(tl - bl)]
    if not (min(ang) > 65 and max(ang) < 115 and .6 < lens[0] / (lens[2] + 1e-9) < 1.65 and .6 < lens[1] / (lens[3] + 1e-9) < 1.65):
        return None                                 # not a book's shape
    level = max(abs(tl[0] - bl[0]) / h, abs(tr[0] - br[0]) / h, abs(tl[1] - tr[1]) / w, abs(bl[1] - br[1]) / w)
    lm, rm = (tl[0] + bl[0]) / 2 / w, 1 - (tr[0] + br[0]) / 2 / w
    chroma = float(np.hypot(med[1], med[2]))
    neutral = (med[0] > 225 or med[0] < 35) and chroma < 10
    if level < .004 and abs(lm - rm) < .012 and med[0] < 245:
        return None                                 # a frame printed on the cover (Katabasis)
    if chroma > 12 and (spread[0] <= 7 or level < .012):
        return None                                 # a printed coloured border (Inheritance, a painted border)
    if margin < .1 and plain == 4 and not neutral:
        return None                                 # a thin printed margin all round (Heartstopper)
    if med[0] >= 240:
        # on white, print just outside an edge (a title above a picture) means the "book" is a panel on a white cover
        # (My Brilliant Friend); a studio photo has nothing but white there
        c = pts.mean(axis=0)
        for i, (p, q2) in enumerate(((tl, bl), (tr, br), (tl, tr), (bl, br))):
            if 'LRTB'[i] not in found:
                continue
            n = np.array([q2[1] - p[1], p[0] - q2[0]]); n = n / (np.linalg.norm(n) + 1e-9)
            if np.dot((p + q2) / 2 - c, n) < 0:
                n = -n
            t = np.linspace(.08, .92, 120)[:, None]
            hits = []
            for d in range(3, 13):
                xy = p + (q2 - p) * t + n * d
                inside = (xy[:, 0] >= 0) & (xy[:, 0] < w) & (xy[:, 1] >= 0) & (xy[:, 1] < h)
                if inside.mean() > .5:
                    hits.append(raw_mask[xy[inside, 1].astype(int), xy[inside, 0].astype(int)].mean())
            if hits and np.mean(hits) > .04:
                return None
    ok = ((fill >= .9 and outside <= .22)
          or (fill >= .7 and outside <= .1 and sum(s >= .73 for s in support) >= 2)    # a dark cover on a dark cloth
          or (len(support) == 4 and min(support) >= .7 and outside <= .1)            # clear edges all round
          or (fill >= .85 and outside <= .25 and sum(s >= .6 for s in support) >= 3))
    if not ok:
        return None
    if (np.abs(pts - np.array([[0, 0], [w - 1, 0], [w - 1, h - 1], [0, h - 1]])) / np.array([w, h])).max() < .02:
        return None                                 # a sliver at most: not worth changing
    pts = pts / sc
    if level > .03 and _worse_level(im, pts):
        return None                                 # squaring it would turn the lettering crooked: it was flat already (Son of a Witch)
    return pts


def _lean(im, span=10, size=500, step=.25):
    """How far the picture's lettering and panel edges lean from level, in degrees (rows of print line up best at the
    right turn). Slanted lettering adds the same to every picture of a cover, so only differences are used."""
    sc = min(1.0, size / max(im.size))
    g = ImageOps.grayscale(im.resize((max(1, round(im.width * sc)), max(1, round(im.height * sc))))).filter(ImageFilter.GaussianBlur(1.0))
    a = np.asarray(g, float)
    gy = np.abs(np.gradient(a)[0])
    h, w = a.shape
    ys, xs = np.mgrid[0:h, 0:w]
    keep = gy > np.percentile(gy, 85)
    wv, p, o = gy[keep], (ys - h / 2)[keep], (xs - w / 2)[keep]
    best, best_d = -1, 0.0
    for d in np.arange(-span, span + 1e-9, step):
        t = np.radians(d)
        proj = p * np.cos(t) + o * np.sin(t)
        sc2 = (np.bincount(np.round(proj - proj.min()).astype(int), weights=wv) ** 2).sum()
        if sc2 > best:
            best, best_d = sc2, float(d)
    return best_d


def _worse_level(im, pts):
    """Would squaring this outline leave the lettering leaning more than before? Then the outline is wrong: a real
    photo at an angle comes out more level, a flat cover cut along a slanted line comes out crooked."""
    return abs(_lean(warp(im, pts))) - abs(_lean(im)) > 1.5


def straighten(im, edge=0):
    im = im.convert('RGB')
    pts = find_outline(im)
    if pts is None:
        return None
    w, h = im.size
    if edge:   # every corner moved out (or in) from the middle
        c = pts.mean(axis=0)
        pts = np.array([p + (p - c) / np.linalg.norm(p - c) * edge * 1.414 for p in pts])
        pts[:, 0] = pts[:, 0].clip(0, w - 1); pts[:, 1] = pts[:, 1].clip(0, h - 1)
    return warp(im, pts)


def warp(im, pts):
    """The four corners (top left, top right, bottom right, bottom left; any four-sided shape) pulled square in true
    perspective. Used for the found outline, and for corners she drags into place herself."""
    tl, tr, br, bl = np.asarray(pts, float)
    W = max(2, round((np.linalg.norm(tr - tl) + np.linalg.norm(br - bl)) / 2))
    H = max(2, round((np.linalg.norm(bl - tl) + np.linalg.norm(br - tr)) / 2))
    eq, rhs = [], []
    for (X, Y), (x, y) in zip([(0, 0), (W, 0), (W, H), (0, H)], [tl, tr, br, bl]):
        eq += [[X, Y, 1, 0, 0, 0, -x * X, -x * Y], [0, 0, 0, X, Y, 1, -y * X, -y * Y]]
        rhs += [x, y]
    coef = np.linalg.solve(np.array(eq, float), np.array(rhs, float))
    return im.transform((W, H), Image.PERSPECTIVE, tuple(coef), Image.BICUBIC)
