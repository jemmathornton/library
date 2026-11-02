"""How close a straightened picture is to the book's true flat cover.

Both are brought to the true cover's shape at a small size, then compared as greyscale with each one's brightness and
contrast evened out (normalised cross-correlation, best of small shifts). 1 is identical; a picture squashed to the
wrong shape, turned, zoomed in or with background left on scores lower. Also: how much of the true cover is missing
(content cut off) and how much extra (background) the result has, from the best-matching scale."""
import numpy as np
from PIL import Image, ImageFilter, ImageOps

W, H = 90, 135


def _prep(im, size):
    g = ImageOps.grayscale(im).resize(size, Image.BILINEAR).filter(ImageFilter.GaussianBlur(1))
    a = np.asarray(g, float)
    return (a - a.mean()) / (a.std() + 1e-6)


def similarity(result, true):
    if result is None:
        return None
    tw, th = true.size
    size = (W, max(20, round(W * th / tw)))
    t = _prep(true, size)
    r = _prep(result, size)
    best = -1
    for dy in (-2, -1, 0, 1, 2):
        for dx in (-2, -1, 0, 1, 2):
            a = t[max(0, dy):size[1] + min(0, dy), max(0, dx):size[0] + min(0, dx)]
            b = r[max(0, -dy):size[1] + min(0, -dy), max(0, -dx):size[0] + min(0, -dx)]
            best = max(best, float((a * b).mean()))
    return best


def zoom_check(result, true):
    """Is the result zoomed in (cover cut off, <1) or zoomed out (background left, >1)? The scale of the true cover that
    best matches the result, 0.8..1.25."""
    if result is None:
        return None
    tw, th = true.size
    size = (W, max(20, round(W * th / tw)))
    r = _prep(result, size)
    best, best_s = -2, 1
    for s in np.arange(.8, 1.26, .025):
        if s >= 1:   # true cover shrunk inside the frame: the result has extra round it
            inner = (max(4, round(size[0] / s)), max(4, round(size[1] / s)))
            t = np.zeros((size[1], size[0]))
            ti = _prep(true, inner)
            oy, ox = (size[1] - inner[1]) // 2, (size[0] - inner[0]) // 2
            rr = r[oy:oy + inner[1], ox:ox + inner[0]]
            v = float((ti * (rr - rr.mean()) / (rr.std() + 1e-6)).mean())
        else:        # the result is a middle piece of the true cover
            big = (round(size[0] / s), round(size[1] / s))
            tb = _prep(true, big)
            oy, ox = (big[1] - size[1]) // 2, (big[0] - size[0]) // 2
            tt = tb[oy:oy + size[1], ox:ox + size[0]]
            tt = (tt - tt.mean()) / (tt.std() + 1e-6)
            v = float((tt * r).mean())
        if v > best:
            best, best_s = v, s
    return float(best_s)
