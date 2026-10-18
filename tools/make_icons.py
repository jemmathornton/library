"""The app icon: Lucide's "library" (four books on a shelf, one leaning; ISC licence) in brass on the sidebar's green.
Same method as the Sims site's icon: a lighter green than the sidebar and thick strokes, so it doesn't look black or blurry small.

    python -X utf8 tools/make_icons.py

Writes site/icon.svg, site/icon-<size>.png (browser tab, app window) and site/icon.ico (Windows shortcut).
Every size is drawn on its own (at 4x, then scaled down), so the small ones stay crisp.
"""
import os
from PIL import Image, ImageDraw

SITE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'site')
GREEN, GREEN_TOP, BRASS = "#24453A", "#335C4E", "#E3BC5C"
# Lucide's library drawing (24-unit grid), moved into the middle of a 32-unit square
BOOKS = [((20, 7), (24, 21)), ((16, 7), (16, 21)), ((12, 9), (12, 21)), ((8, 5), (8, 21))]
WIDTH = 2.6
SIZES = (16, 24, 32, 48, 64, 96, 192, 512)

SVG = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">'
       f'<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{GREEN_TOP}"/><stop offset="1" stop-color="{GREEN}"/></linearGradient></defs>'
       f'<rect width="32" height="32" rx="7" fill="url(#g)"/><g stroke="{BRASS}" stroke-width="{WIDTH}" stroke-linecap="round">'
       + "".join(f'<line x1="{a[0]}" y1="{a[1] + 3}" x2="{b[0]}" y2="{b[1] + 3}"/>' for a, b in BOOKS) + '</g></svg>\n')


def draw(px):
    S = px * 4; u = S / 32
    grad = Image.linear_gradient("L").resize((S, S))
    bg = Image.composite(Image.new("RGBA", (S, S), GREEN), Image.new("RGBA", (S, S), GREEN_TOP), grad)
    mask = Image.new("L", (S, S), 0); ImageDraw.Draw(mask).rounded_rectangle((0, 0, S - 1, S - 1), radius=7 * u, fill=255)
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0)); im.paste(bg, mask=mask)
    d = ImageDraw.Draw(im); w = WIDTH * u
    for (x1, y1), (x2, y2) in BOOKS:
        p1, p2 = (x1 * u, (y1 + 3) * u), (x2 * u, (y2 + 3) * u)
        d.line([p1, p2], fill=BRASS, width=round(w))
        for x, y in (p1, p2):     # round ends
            d.ellipse((x - w / 2, y - w / 2, x + w / 2, y + w / 2), fill=BRASS)
    return im.resize((px, px), Image.LANCZOS)


def main():
    open(os.path.join(SITE, 'icon.svg'), 'w', encoding='utf-8', newline='\n').write(SVG)
    imgs = {px: draw(px) for px in SIZES}
    for px, im in imgs.items():
        im.save(os.path.join(SITE, f'icon-{px}.png'))
    imgs[256] = draw(256)
    imgs[16].save(os.path.join(SITE, 'icon.ico'), sizes=[(s, s) for s in (16, 24, 32, 48, 64, 256)],
                  append_images=[imgs[s] for s in (24, 32, 48, 64, 256)])
    print('Written site/icon.svg, icon-<size>.png and icon.ico')


if __name__ == '__main__':
    main()
