"""A small made-up library for tests that aren't about her own books (19 Nov). Every title, name and number here is
invented, so a test that uses it gives the same answer whatever she adds, removes or reads.

    with Sandbox(data=False, covers=False) as box:
        fixture_library.make(box)      # data/ files and a few cover pictures
        ...run tools/build.py...

What's in it (the page tests in e2e/fixture.test.js count on these exact numbers):
  Fantasy (18 copies)  The Glass Owl twice (one an Illumicrate special), The Iron Owl, Kit Marlowe's The Second Act;
                       Moon Harbour four times (two Libib copies with one ISBN, two added on the site: one with its own
                       cover, one without), read three times (last year, twice this year); A Sunless Sea (didn't finish),
                       Quiet Fields (paused), Lantern Days (reading), The Unread Door, Waiting Rooms (to read);
                       Lonely Hill twice (one a Collector's Edition; read this year) and another Lonely Hill by someone
                       else; The Fox's Winter (signed to her); WINTER'S CROWN PB shown as Crown of Winter (a Fairyloot special).
                       Not owned on the shelf: Borrowed Tale (read this year). Someday Story (only to read) stays off.
  Children's (2)       First Term at Testwood (a modern copy of an old book she has), Puddle Jumpers.
  Old books (5)        Children's: First Term at Testwood (first edition, red cloth), Third Term at Testwood (a doubtful
                       first edition), The Mill Mystery (Brook Mysteries 2). Fiction: The Quiet Mill (no modern cover).
                       Non-fiction: An Odd Old Almanac.
  Reading elsewhere    Library Loan, on StoryGraph twice (read last year and this year); Second Wind, finished in
                       January and being read again now.
  To buy               Last Term at Testwood (old), Testwood Again (by a later author), The Paper Owl.
"""
import json, os
from datetime import date

Y = str(date.today().year)
LAST = str(date.today().year - 1)

SHELVES = [
    {'id': 'fantasy', 'name': 'Fantasy', 'libib': 'Fantasy', 'color': '#7A3F7A'},
    {'id': 'childrens', 'name': 'Children’s', 'libib': "Children's", 'color': '#CF9A2B'},
    {'id': 'old-book-collection', 'name': 'Old Book Collection', 'libib': 'Old Book Collection', 'color': '#8C6A3F'},
    {'id': 'empty-shelf', 'name': 'Empty Shelf', 'libib': 'Empty Shelf', 'color': '#555555'},
    {'id': 'unsorted', 'name': 'Not on a shelf yet', 'libib': None, 'color': '#8A8178'},
]

MOON = '9790000000035'   # one ISBN for four copies of Moon Harbour
OLD_FIC = '9790000000066'


def book(i, title, author, shelf='fantasy', **kw):
    return {'id': i, 'title': title, 'authors': [{'name': author}], 'shelf': shelf, 'added': kw.pop('added', '2025-01-10'),
            'copies': 1, **kw}


BOOKS = [
    book('fx-owl1', 'The Glass Owl (Owl Trilogy Book 1)', 'Ada Quill', isbn13='9790000000011', published='2019-04-02', pages=320),
    book('fx-owl1b', 'The Glass Owl', 'Ada Quill', isbn13='9790000000028', published='2021-09-09', pages=330),
    book('fx-owl2', 'Owl Trilogy 2: The Iron Owl', 'Ada Quill', published='2020', pages=300),
    book('fx-marlowe2', 'Kit Marlowe: The Second Act', 'Ada Quill', pages=250),
    book('fx-moon', 'Moon Harbour', 'Bea Tern', isbn13=MOON, pages=400, added='2025-03-01'),
    book('fx-moon2', 'Moon Harbour', 'Bea Tern', isbn13=MOON, added='2025-03-01'),
    book('fx-sunless', 'A Sunless Sea', 'Cy Vale', pages=100),
    book('fx-quiet', 'Quiet Fields', 'Cy Vale'),
    book('fx-lantern', 'Lantern Days', 'Dee Wick'),
    book('fx-unread', 'The Unread Door', 'Dee Wick'),
    book('fx-toread', 'Waiting Rooms', 'Dee Wick'),
    book('fx-lonely', "Lonely Hill (Collector's Edition)", 'Eli Moss'),
    book('fx-lonely2', 'Lonely Hill', 'Eli Moss'),
    book('fx-other-lonely', 'Lonely Hill', 'Fay Other'),
    book('fx-apos', "The Fox's Winter", 'Gus Hale', isbn13='9790000000073', description='A fox.Then winter came.Mr Hale says so.'),
    book('fx-display', "WINTER'S CROWN PB", 'Kay Lane', displayTitle='Crown of Winter'),
    book('ch-testwood', 'First Term at Testwood', 'Gwen Ashby', shelf='childrens', isbn13='9790000000059', published='2015'),
    book('ch-puddle', 'Puddle Jumpers', 'Hal Brook', shelf='childrens', pages=100),
    book('old-t1', 'First Term at Testwood', 'Gwen Ashby', shelf='old-book-collection', published='1946', description='First edition, 1946'),
    book('old-t3', 'Third Term at Testwood', 'Gwen Ashby', shelf='old-book-collection', published='1950', description='First edition? Probably a reprint'),
    book('old-b2', 'The Mill Mystery', 'Hal Brook', shelf='old-book-collection', published='1938'),
    book('old-fic', 'The Quiet Mill', 'Jon Yard', shelf='old-book-collection', isbn13=OLD_FIC, published='1955'),
    book('old-odd', 'An Odd Old Almanac', 'Ivy Zane', shelf='old-book-collection', published='1921',
         description='A long description of an almanac, far longer than a note on her own copy would ever be, so it is shown as a blurb.'),
]

ADDED = [   # two more Moon Harbours added on the site: one with its own cover, one without
    {**book('add0001', 'Moon Harbour', 'Bea Tern', isbn13=MOON, added='2026-11-01'), 'addedHere': True},
    {**book('add0002', 'Moon Harbour', 'Bea Tern', isbn13=MOON, added='2026-11-02'), 'addedHere': True},
]

STORYGRAPH = {'books': [
    {'title': 'Moon Harbour', 'authors': 'Bea Tern', 'status': 'read', 'format': 'paperback', 'rating': 4.5, 'readCount': 3,
     'dates': [[f'{LAST}-03-01', f'{LAST}-03-10'], [f'{Y}-02-01', f'{Y}-02-14'], [f'{Y}-08-20', f'{Y}-09-01']],
     'moods': 'hopeful', 'pace': 'slow', 'review': 'Lovely. [spoiler]The harbour floods.[/spoiler]', 'books': ['fx-moon']},
    {'title': 'A Sunless Sea', 'authors': 'Cy Vale', 'status': 'stopped', 'books': ['fx-sunless']},
    {'title': 'Quiet Fields', 'authors': 'Cy Vale', 'status': 'paused', 'books': ['fx-quiet']},
    {'title': 'Lantern Days', 'authors': 'Dee Wick', 'status': 'reading', 'dates': [[f'{Y}-11-01', None]], 'books': ['fx-lantern']},
    {'title': 'Waiting Rooms', 'authors': 'Dee Wick', 'status': 'to-read', 'books': ['fx-toread']},
    {'title': 'Lonely Hill', 'authors': 'Eli Moss', 'status': 'read', 'dates': [[f'{Y}-05-01', f'{Y}-05-20']], 'books': ['fx-lonely2']},
    {'title': 'Borrowed Tale', 'authors': 'Ena Fox', 'status': 'read', 'format': 'digital', 'rating': 3, 'dates': [[f'{Y}-03-01', f'{Y}-03-03']]},
    {'title': 'Someday Story', 'authors': 'Ena Fox', 'status': 'to-read'},
    {'title': 'Library Loan', 'authors': 'Ena Fox', 'status': 'read', 'rating': 4, 'dates': [[f'{LAST}-08-01', f'{LAST}-08-08']]},
    {'title': 'The Library Loan', 'authors': 'Ena Fox', 'status': 'read', 'dates': [[f'{Y}-01-10', f'{Y}-01-15']]},
    {'title': 'Second Wind', 'authors': 'Ena Fox', 'status': 'reading', 'dates': [[f'{Y}-01-01', f'{Y}-01-20'], [f'{Y}-11-10', None]]},
]}

SERIES = {'series': [   # Brook first on purpose: the old-books page must sort the shelves by surname itself
    {'name': 'Brook Mysteries', 'author': 'Brook', 'books': ['The Cave Mystery', 'The Mill Mystery']},
    {'name': 'Owl Trilogy', 'author': 'Quill', 'books': ['The Glass Owl', 'The Iron Owl', 'The Paper Owl']},
    {'name': 'Kit Marlowe', 'author': 'Quill', 'books': ['Kit Marlowe', 'The Second Act']},
    {'name': 'Testwood', 'author': 'Ashby|Newer', 'books': ['First Term at Testwood', 'Second Term at Testwood|The Second Term at Testwood',
                                                            'Third Term at Testwood', 'Last Term at Testwood', 'Testwood Again']},
]}

TO_BUY = [
    book('buy-last-testwood', 'Last Term at Testwood (old)', 'Gwen Ashby', shelf=None),
    book('buy-testwood-again', 'Testwood Again', 'Pam Newer', shelf=None),
    book('buy-paper-owl', 'The Paper Owl', 'Ada Quill', shelf=None),
]
for w in TO_BUY:
    del w['shelf']

FILES = {
    'shelves.json': SHELVES, 'books.json': BOOKS, 'added.json': ADDED, 'to-buy.json': TO_BUY, 'storygraph.json': STORYGRAPH,
    'series.json': SERIES,
    'covers.json': {'9790000000028': {'src': 'https://example.invalid/owl-special.jpg', 'from': 'made up'},
                    'id-fx-display': {'src': 'https://example.invalid/crown.jpg', 'from': 'made up'},
                    OLD_FIC: {'src': 'https://example.invalid/modern-reprint.jpg', 'from': 'made up'}},
    'editions.json': {'fx-owl1b': 'Illumicrate Edition', 'fx-display': 'Fairyloot Edition'},
    'signed.json': {'fx-apos': 'to-you'},
    'no-cover.json': {'books': [{'id': 'old-fic', 'title': 'The Quiet Mill'}]},
    'old-books-kinds.json': {'old-fic': 'fiction', 'old-odd': 'non-fiction'},
    'elsewhere-shelves.json': {'Borrowed Tale': 'fantasy', 'Someday Story': 'fantasy'},
}

# made-up cover pictures (solid colours): name in site/covers -> (width, height, colour)
PICTURES = {
    '9790000000011': (200, 300, (30, 60, 160)),     # The Glass Owl
    MOON: (200, 320, (20, 120, 140)),               # Moon Harbour, by ISBN
    'id-add0001': (210, 300, (150, 90, 20)),        # Moon Harbour added on the site with its own cover
    'id-old-t1': (200, 300, (180, 30, 30)),         # red cloth
    OLD_FIC: (200, 300, (40, 40, 40)),              # a modern reprint: must not be shown (no-cover.json)
    'sg-borrowed-tale': (200, 300, (90, 90, 160)),  # a book read elsewhere
}


def make(box):
    for name, obj in FILES.items():
        box.write(name, obj)
    from PIL import Image
    covers = box.path('site', 'covers')
    os.makedirs(covers, exist_ok=True)
    for key, (w, h, colour) in PICTURES.items():
        p = os.path.join(covers, key + '.jpg')
        assert not os.path.exists(p), f'{p} already there: a made-up cover must never replace a real one'
        Image.new('RGB', (w, h), colour).save(p, quality=95)
