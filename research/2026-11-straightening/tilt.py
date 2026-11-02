"""Tilt of a cover from its own lines (lettering, panels, borders run level and upright on a cover): the strongest
direction of edges, folded onto a quarter turn. Tested on real covers turned by known amounts."""
import numpy as np
from PIL import Image, ImageFilter, ImageOps


def tilt(im, span=12, size=600):
    """Degrees the picture is turned anticlockwise (so rotating by -tilt makes it level), and how sure (peak / background)."""
    sc = min(1.0, size / max(im.size))
    g = ImageOps.grayscale(im.resize((round(im.width * sc), round(im.height * sc)))).filter(ImageFilter.GaussianBlur(.8))
    a = np.asarray(g, float)
    gy, gx = np.gradient(a)
    mag = np.hypot(gx, gy)
    m = mag[3:-3, 3:-3]; gx = gx[3:-3, 3:-3]; gy = gy[3:-3, 3:-3]
    keep = m > np.percentile(m, 80)
    th = np.degrees(np.arctan2(gy[keep], gx[keep]))
    th = (th + 45) % 90 - 45              # level and upright lines fold together
    w = m[keep] ** 2
    bins = np.arange(-span, span + .001, .1)
    hist, _ = np.histogram(th, bins=bins, weights=w)
    k = np.exp(-np.arange(-6, 7) ** 2 / (2 * 2.0 ** 2)); hist = np.convolve(hist, k / k.sum(), 'same')
    i = int(np.argmax(hist))
    # refine with the weighted middle of the peak
    lo, hi = max(0, i - 4), min(len(hist), i + 5)
    centres = (bins[:-1] + bins[1:]) / 2
    ang = -float((centres[lo:hi] * hist[lo:hi]).sum() / hist[lo:hi].sum())   # picture y runs down: turn the sign
    sure = float(hist[i] / (np.median(hist) + 1e-9))
    return ang, sure


def inner_box(w, h, deg):
    """The largest upright rectangle inside a w x h picture turned by deg (no blank corners)."""
    a = abs(np.radians(deg))
    if w <= 0 or h <= 0:
        return 0, 0
    long_side, short_side = (w, h) if w >= h else (h, w)
    sin_a, cos_a = np.sin(a), np.cos(a)
    if short_side <= 2 * sin_a * cos_a * long_side or abs(sin_a - cos_a) < 1e-10:
        x = .5 * short_side
        wr, hr = (x / sin_a, x / cos_a) if w >= h else (x / cos_a, x / sin_a)
    else:
        cos_2a = cos_a * cos_a - sin_a * sin_a
        wr, hr = (w * cos_a - h * sin_a) / cos_2a, (h * cos_a - w * sin_a) / cos_2a
    return wr, hr


def level(im, deg):
    """Turn the picture level and cut to the largest piece with no blank corners."""
    w, h = im.size
    r = im.rotate(-deg, resample=Image.BICUBIC, expand=True)
    wr, hr = inner_box(w, h, deg)
    cx, cy = r.width / 2, r.height / 2
    return r.crop((round(cx - wr / 2), round(cy - hr / 2), round(cx + wr / 2), round(cy + hr / 2)))


def tilt_profile(im, span=10, size=600, step=.1):
    """Deskew by projection: at the right turn, lines of lettering and panel edges pile up into sharp rows (and columns),
    so the projected edge strength is most uneven. Degrees the picture is turned anticlockwise, and how sure."""
    sc = min(1.0, size / max(im.size))
    g = ImageOps.grayscale(im.resize((round(im.width * sc), round(im.height * sc)))).filter(ImageFilter.GaussianBlur(1.0))
    a = np.asarray(g, float)
    gy, gx = np.gradient(a)
    h, w = a.shape
    ys, xs = np.mgrid[0:h, 0:w]
    xs = xs - w / 2; ys = ys - h / 2
    out = []
    for which, mag, pos_main, pos_other in (('rows', np.abs(gy), ys, xs), ('cols', np.abs(gx), xs, ys)):
        keep = mag > np.percentile(mag, 85)
        wv, p, o = mag[keep], pos_main[keep], pos_other[keep]
        scores = []
        angles = np.arange(-span, span + 1e-9, step)
        for d in angles:
            t = np.radians(d)
            proj = p * np.cos(t) + (o * np.sin(t) if which == 'rows' else -o * np.sin(t))
            hist = np.bincount(np.round(proj - proj.min()).astype(int), weights=wv)
            scores.append((hist ** 2).sum())
        out.append(np.array(scores))
    total = out[0] / out[0].max() + out[1] / out[1].max()
    i = int(np.argmax(total))
    angles = np.arange(-span, span + 1e-9, step)
    a_rows, a_cols = float(angles[int(np.argmax(out[0]))]), float(angles[int(np.argmax(out[1]))])
    TILT_DIAG.update(rows=a_rows, cols=a_cols)
    sure = float((total[i] - np.median(total)) / (np.std(total) + 1e-9))
    return float(angles[i]), sure


TILT_DIAG = {}
