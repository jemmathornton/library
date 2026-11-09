"""Cover straightening ("Cropped or at an angle", "Set the corners"), on made-up photos: a cover lying at an angle
on a table must come out square and the right shape; a flat scan must be left alone; her own corners pull exactly."""
import os, random, sys, unittest
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from support import load
from PIL import Image, ImageDraw, ImageFilter

st = load('straighten')


def cover(w=300, h=460, seed=1):
    """A busy printed cover: a coloured ground, blocks, lettering-like bars."""
    rnd = random.Random(seed)
    im = Image.new('RGB', (w, h), (190, 40, 50))
    d = ImageDraw.Draw(im)
    for _ in range(40):
        x, y = rnd.randrange(w), rnd.randrange(h)
        d.rectangle((x, y, x + rnd.randrange(10, 80), y + rnd.randrange(5, 40)), fill=tuple(rnd.randrange(256) for _ in range(3)))
    for y in range(30, 110, 22):
        d.rectangle((30, y, w - 30, y + 12), fill=(250, 235, 200))
    return im


def photo(angle=5, bg=(120, 95, 70)):
    """A seller's photo: the cover (with the light falling across it and a little grain, as in any real photo) lying
    on a plain table, turned a little and not quite in the middle."""
    c = cover()
    light = Image.linear_gradient('L').resize(c.size).rotate(30)
    c = Image.composite(c, Image.blend(c, Image.new('RGB', c.size, 'black'), .25), light)
    c = Image.blend(c, Image.effect_noise(c.size, 40).convert('RGB'), .06)
    c = c.convert('RGBA').rotate(angle, expand=True, resample=Image.BICUBIC)
    table = Image.new('RGB', (c.width + 170, c.height + 150), bg)
    grain = Image.effect_noise((table.width // 4, table.height), 60).resize(table.size).convert('RGB')   # wood grain
    table = Image.blend(table, grain, .18)
    ramp = Image.linear_gradient('L').rotate(90).resize(table.size)   # light falling across: darker to one side
    table = Image.composite(table, Image.blend(table, Image.new('RGB', table.size, 'black'), .45), ramp)
    # (a perfectly even coloured surround is read as a border printed on the cover, by design)
    table.paste(c, (60, 95), c)
    return table.filter(ImageFilter.GaussianBlur(.6))


class Straighten(unittest.TestCase):
    def test_flat_scan_left_alone(self):
        self.assertIsNone(st.straighten(cover()))

    def test_dead_level_centred_frame_left_alone(self):   # by design: that's a frame printed on the cover (Katabasis)
        c = cover()
        framed = Image.new('RGB', (c.width + 80, c.height + 80), (30, 30, 30)); framed.paste(c, (40, 40))
        self.assertIsNone(st.straighten(framed))

    def test_perfectly_even_coloured_surround_left_alone(self):   # by design: a printed coloured border (Inheritance)
        c = cover().rotate(5, expand=True, fillcolor=(30, 120, 60))
        self.assertIsNone(st.straighten(c))

    def test_cover_on_a_table_comes_out_the_right_shape(self):
        for angle in (4, -6, 9):
            out = st.straighten(photo(angle))
            self.assertIsNotNone(out, f'angle {angle}: not found')
            ratio = out.height / out.width
            self.assertAlmostEqual(ratio, 460 / 300, delta=.08, msg=f'angle {angle}: shape {out.size}')
            self.assertTrue(260 <= out.width <= 340, f'angle {angle}: size {out.size}')

    def test_table_cut_away(self):
        out = st.straighten(photo(3))
        self.assertIsNotNone(out)
        w, h = out.size
        edge = [out.getpixel((x, y)) for x in (3, w // 2, w - 4) for y in (3, h - 4)]
        table = sum(1 for p in edge if abs(p[0] - 120) < 25 and abs(p[1] - 95) < 25 and abs(p[2] - 70) < 25)
        self.assertLessEqual(table, 2, 'the table still shows round the edge')

    def test_trim_more_is_smaller(self):
        a, b = st.straighten(photo(4)), st.straighten(photo(4), -6)
        self.assertLess(b.width, a.width)


class Corners(unittest.TestCase):
    def test_her_corners_pull_square(self):
        im = photo(0)
        out = st.warp(im, [(80, 80), (380, 80), (380, 540), (80, 540)])
        self.assertEqual(out.size, (300, 460))

    def test_any_four_sided_shape(self):
        im = Image.new('RGB', (400, 400), 'white')
        out = st.warp(im, [(50, 40), (330, 70), (350, 360), (30, 330)])
        self.assertTrue(250 < out.width < 320 and 260 < out.height < 320, out.size)


class ServerCorners(unittest.TestCase):
    """The server refuses corners that make no sense (review, 6 Nov)."""

    def setUp(self):
        self.serve = load('serve')
        self.serve.picture = lambda src: Image.new('RGB', (200, 300), 'white')
        self.serve.save_straightened = lambda out: {'ok': True, 'size': out.size}

    def test_good_corners(self):
        self.assertTrue(self.serve.straighten_corners('x', '10,10,190,10,190,290,10,290')['ok'])

    def test_crossed_corners_refused(self):
        self.assertFalse(self.serve.straighten_corners('x', '10,10,10,290,190,10,190,290')['ok'])

    def test_broken_numbers_refused(self):
        self.assertFalse(self.serve.straighten_corners('x', 'NaN,1,2,3,4,5,6,7')['ok'])
        self.assertFalse(self.serve.straighten_corners('x', '1,2,3')['ok'])

    def test_trim_moves_her_corners(self):
        a = self.serve.straighten_corners('x', '20,20,180,20,180,280,20,280')['size']
        b = self.serve.straighten_corners('x', '20,20,180,20,180,280,20,280', -6)['size']
        self.assertLess(b[0], a[0])


if __name__ == '__main__':
    unittest.main()
