"""tools/check_cover_shapes.py (22 Nov): books that should share a cover shape but don't, and covers with a white margin
or a strip down one side. Made-up books and pictures; nothing of hers is read or changed."""
import os, random, sys, unittest
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from support import load
from PIL import Image, ImageDraw

cs = load('check_cover_shapes')


def book(i, title, ratio, surname='Klune', publisher='Tor', published='2024-01-01', special=None):
    b = {'id': f'b{i}', 'title': title, 'surname': surname, 'publisher': publisher, 'published': published,
         'shelf': 'display', 'cover': f'covers/b{i}.jpg', 'coverRatio': ratio}
    if special:
        b['special'] = special
    return b


def busy(w=200, h=300, seed=1):
    rnd = random.Random(seed)
    im = Image.new('RGB', (w, h), (120, 60, 40))
    d = ImageDraw.Draw(im)
    for _ in range(60):
        x, y = rnd.randrange(w), rnd.randrange(h)
        d.rectangle([x, y, x + rnd.randrange(5, 40), y + rnd.randrange(5, 40)], fill=tuple(rnd.randrange(30, 200) for _ in range(3)))
    return im


class CoverShapes(unittest.TestCase):
    def test_edition_lines(self):
        self.assertEqual(cs.edition_line({'title': 'Somewhere Beyond the Sea (Illumicrate Edition)'}), 'illumicrate')
        self.assertEqual(cs.edition_line({'title': 'Philosopher’s Stone', 'special': 'Hufflepuff Edition'}), 'house edition')
        self.assertIsNone(cs.edition_line({'title': 'Somewhere Beyond the Sea'}))

    def test_a_special_edition_with_a_different_shape_is_flagged(self):
        books = [book(1, 'A (Illumicrate Edition)', 1.58), book(2, 'B (Illumicrate Edition)', 1.58),
                 book(3, 'C (Illumicrate Edition)', 1.44), book(4, 'D', 1.40, publisher='Pan')]
        flagged = cs.flag_groups(cs.shape_groups(books))
        self.assertEqual(len(flagged), 1)
        kind, label, usual, odd = flagged[0]
        self.assertEqual(kind, 'Edition')
        self.assertAlmostEqual(usual, 1.58)
        self.assertEqual([b['id'] for b, _ in odd], ['b3'])
        self.assertIn('Too wide', cs.crop_advice(1.44, 1.58, (380, 546)))

    def test_matching_shapes_and_far_apart_years_are_quiet(self):
        same = [book(1, 'A (Illumicrate Edition)', 1.58), book(2, 'B (Illumicrate Edition)', 1.57)]
        apart = [book(3, 'C', 1.50, published='1990'), book(4, 'D', 1.70, published='2020')]
        self.assertEqual(cs.flag_groups(cs.shape_groups(same + apart)), [])

    def test_series_from_one_publisher(self):
        series = [{'name': 'Murderbot', 'author': 'Wells', 'books': ['All Systems Red', 'Artificial Condition|AC']}]
        books = [book(1, 'All Systems Red', 1.50, 'Wells', published='2017'), book(2, 'AC', 1.62, 'Wells', published='2025')]
        kinds = [g[0] for g in cs.flag_groups(cs.shape_groups(books, series))]
        self.assertEqual(kinds, ['Series'])

    def test_white_margin_is_found_and_a_plain_cover_is_not(self):
        art = busy()
        padded = Image.new('RGB', (art.width + 20, art.height), (255, 255, 255))
        padded.paste(art, (0, 0))
        self.assertEqual(cs.blank_margins(art), {})
        self.assertIn('right', cs.blank_margins(padded))

    def test_spine_strip_is_found(self):
        art = busy(seed=2)
        photo = Image.new('RGB', (art.width + 8, art.height), (20, 20, 20))
        photo.paste(art, (8, 0))
        self.assertIn('left', cs.side_strip(photo))
        self.assertNotIn('left', cs.side_strip(busy(seed=3)))


if __name__ == '__main__':
    unittest.main()
