"""Method A: what the app does now (1 Nov evening): background colour from the picture's border, book = clearly unlike
it (LAB, in units of the background's spread), each edge a line fitted where the background stops, true perspective."""
import numpy as np
from PIL import Image, ImageFilter


def straighten(im, edge=0, thr=4.0):
    im = im.convert('RGB')
    lab = np.asarray(im.convert('LAB'), dtype=float)
    h, w, _ = lab.shape
    border = np.concatenate([lab[:6].reshape(-1, 3), lab[-6:].reshape(-1, 3), lab[:, :6].reshape(-1, 3), lab[:, -6:].reshape(-1, 3)])
    med = np.median(border, axis=0)
    spread = np.median(np.abs(border - med), axis=0) * 1.4826 + np.array([2.0, 1.0, 1.0])
    z = np.abs(lab - med) / spread
    mask = np.maximum(z[..., 0] / 2, np.hypot(z[..., 1], z[..., 2])) > thr
    mask = np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(9))) > 127
    if not .25 < mask.mean() < .97:
        return None
    rows, cols = np.nonzero(mask.any(1))[0], np.nonzero(mask.any(0))[0]
    y0, y1, x0, x1 = rows[0], rows[-1], cols[0], cols[-1]
    ry = np.arange(int(y0 + .1 * (y1 - y0)), int(y1 - .1 * (y1 - y0)))
    cx = np.arange(int(x0 + .1 * (x1 - x0)), int(x1 - .1 * (x1 - x0)))
    ry, cx = ry[mask[ry].any(1)], cx[mask[:, cx].any(0)]
    if len(ry) < 10 or len(cx) < 10:
        return None

    def line(t, v, lo, hi):
        off_pic = (v <= lo + 2) | (v >= hi - 2)
        if off_pic.mean() > .8 or (~off_pic).sum() < 8:
            return 0.0, float(lo if np.median(v) < (lo + hi) / 2 else hi)
        t, v = t[~off_pic], v[~off_pic]
        k, c = np.polyfit(t, v, 1)
        for _ in range(2):
            off = np.abs(v - (k * t + c))
            keep = off <= max(2.5, np.percentile(off, 70))
            k, c = np.polyfit(t[keep], v[keep], 1)
        return k, c
    left = line(ry, np.array([np.argmax(mask[y]) for y in ry], float), 0, w - 1)
    right = line(ry, np.array([w - 1 - np.argmax(mask[y][::-1]) for y in ry], float), 0, w - 1)
    top = line(cx, np.array([np.argmax(mask[:, x]) for x in cx], float), 0, h - 1)
    bottom = line(cx, np.array([h - 1 - np.argmax(mask[::-1, x]) for x in cx], float), 0, h - 1)
    left, right, top, bottom = (left[0], left[1] - edge), (right[0], right[1] + edge), (top[0], top[1] - edge), (bottom[0], bottom[1] + edge)

    def corner(side, end):
        x = (side[0] * end[1] + side[1]) / (1 - side[0] * end[0])
        return min(max(x, 0), w - 1), min(max(end[0] * x + end[1], 0), h - 1)
    tl, tr, br, bl = corner(left, top), corner(right, top), corner(right, bottom), corner(left, bottom)
    return warp(im, np.array([tl, tr, br, bl]))


def warp(im, pts, inset=1):
    tl, tr, br, bl = pts
    W = round((np.hypot(*(tr - tl)) + np.hypot(*(br - bl))) / 2)
    H = round((np.hypot(*(bl - tl)) + np.hypot(*(br - tr))) / 2)
    if W < 40 or H < 40 or not .8 < H / W < 2.3:
        return None
    eq, rhs = [], []
    for (X, Y), (x, y) in zip([(0, 0), (W, 0), (W, H), (0, H)], [tl, tr, br, bl]):
        eq += [[X, Y, 1, 0, 0, 0, -x * X, -x * Y], [0, 0, 0, X, Y, 1, -y * X, -y * Y]]
        rhs += [x, y]
    try:
        coef = np.linalg.solve(np.array(eq, float), np.array(rhs, float))
    except np.linalg.LinAlgError:
        return None
    out = im.transform((W, H), Image.PERSPECTIVE, tuple(coef), Image.BICUBIC)
    return out.crop((inset, inset, W - inset, H - inset)) if inset else out
