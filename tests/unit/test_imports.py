"""The two importers: Libib (her shelves) and StoryGraph (her reading). Small made-up exports check each rule;
her real latest exports check nothing has drifted."""
import csv, glob, json, os, subprocess, sys, unittest
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from support import PYTHON, REAL, TOOLS, Sandbox, load

LIBIB_COLS = ('id,item_type,title,creators,first_name,last_name,collection,ean_isbn13,upc_isbn10,description,publisher,publish_date,'
              'group,tags,notes,price,length,number_of_discs,number_of_players,age_group,ensemble,aspect_ratio,esrb,rating,review,'
              'review_date,status,began,completed,added,copies').split(',')


def run(script, *args):
    return subprocess.run([PYTHON, '-X', 'utf8', os.path.join(TOOLS, script), *args], capture_output=True, text=True, env=os.environ.copy())


class Libib(unittest.TestCase):
    def setUp(self):
        self.box = Sandbox().__enter__()
        self.shelves = [s for s in self.box.read('shelves.json') if s.get('libib')]
        self.folder = self.box.path('imports', 'libib-test'); os.makedirs(self.folder)

    def tearDown(self):
        self.box.__exit__(None, None, None)

    def export(self, rows):
        with open(os.path.join(self.folder, 'library_1.csv'), 'w', encoding='utf-8', newline='') as fh:
            w = csv.DictWriter(fh, LIBIB_COLS); w.writeheader()
            for r in rows:
                w.writerow({c: '' for c in LIBIB_COLS} | {'item_type': 'book', 'copies': '1', 'added': '2026-01-01'} | r)

    def test_rules(self):
        genre = self.shelves[0]
        self.export([
            {'id': 'b1', 'title': 'Shelf Book', 'creators': 'Ann Writer, Bo Drawer (Illustrator)', 'last_name': 'Writer',
             'collection': genre['libib'], 'ean_isbn13': '9780306406157', 'length': '300'},
            {'id': 'b2', 'title': 'Shelf Book', 'creators': 'Ann Writer', 'last_name': 'Writer', 'collection': "Jemma's Library",
             'status': 'Completed', 'rating': '4'},   # the old catch-all copy of the same book
            {'id': 'b3', 'title': 'Lonely Book', 'creators': 'Cy Other', 'last_name': 'Other', 'collection': "Jemma's Library"},
            {'id': 'w1', 'title': 'Shelf Book', 'creators': 'Ann Writer', 'last_name': 'Writer', 'collection': 'Books to Buy'},
            {'id': 'w2', 'title': 'Wanted Book', 'creators': 'Di New', 'last_name': 'New', 'collection': 'Books to Buy'},
        ])
        r = run('import_libib.py', self.folder, '--apply', '--force')   # --force: 5 made-up books are far fewer than her library (19 Nov guard)
        self.assertEqual(r.returncode, 0, r.stderr)
        books = {b['id']: b for b in self.box.read('books.json')}
        self.assertEqual(set(books), {'b1', 'b3'})   # the catch-all copy of b1 is the same book
        b1 = books['b1']
        self.assertEqual((b1['shelf'], b1['pages'], b1['status'], b1['rating']), (genre['id'], 300, 'read', '4'))
        self.assertEqual(b1['authors'], [{'name': 'Ann Writer'}, {'name': 'Bo Drawer', 'role': 'Illustrator'}])
        self.assertEqual(books['b3']['shelf'], 'unsorted')
        wish = {w['id']: w for w in self.box.read('to-buy.json')}
        self.assertEqual(wish['w1'].get('maybeOwned'), ['b1'])
        self.assertNotIn('maybeOwned', wish['w2'])

    def test_unknown_collection_stops_it(self):
        self.export([{'id': 'x', 'title': 'T', 'collection': 'A Shelf Nobody Made'}])
        before = open(self.box.path('data', 'books.json'), 'rb').read()
        r = run('import_libib.py', self.folder, '--apply')
        self.assertNotEqual(r.returncode, 0)
        self.assertEqual(open(self.box.path('data', 'books.json'), 'rb').read(), before)

    def test_report_only_changes_nothing(self):
        self.export([{'id': 'b1', 'title': 'Shelf Book', 'collection': self.shelves[0]['libib']}])
        before = open(self.box.path('data', 'books.json'), 'rb').read()
        self.assertEqual(run('import_libib.py', self.folder).returncode, 0)
        self.assertEqual(open(self.box.path('data', 'books.json'), 'rb').read(), before)

    def test_a_missing_books_to_buy_csv_doesnt_empty_the_list(self):   # review, 21 Nov
        import shutil
        latest = sorted(glob.glob(os.path.join(REAL, 'imports', 'libib-*')))[-1]
        for f in glob.glob(os.path.join(latest, '*.csv')):   # every collection but Books to Buy (found by what's in it)
            with open(f, encoding='utf-8-sig', newline='') as fh:
                first = next(csv.DictReader(fh), {})
            if first.get('collection') != 'Books to Buy':
                shutil.copy(f, self.folder)
        self.assertTrue(self.box.read('to-buy.json'), 'the test needs a to-buy list to lose')
        before = open(self.box.path('data', 'to-buy.json'), 'rb').read()
        r = run('import_libib.py', self.folder, '--apply')
        self.assertNotEqual(r.returncode, 0)
        self.assertIn('Books to Buy', r.stderr + r.stdout)
        self.assertEqual(open(self.box.path('data', 'to-buy.json'), 'rb').read(), before)

    def test_her_latest_real_export_still_reads(self):
        latest = sorted(glob.glob(os.path.join(REAL, 'imports', 'libib-*')))[-1]
        r = run('import_libib.py', latest)
        self.assertEqual(r.returncode, 0, r.stderr[-800:])
        self.assertIn('rows read', r.stdout)


class StoryGraphPieces(unittest.TestCase):
    sg = load('import_storygraph')

    def test_dates_read(self):
        self.assertEqual(self.sg.dates_read('2024/01/02-2024/01/20, 2025/03/01-'), [['2024-01-02', '2024-01-20'], ['2025-03-01', '']])

    def test_titles_meet_across_spellings_and_numbers(self):
        st = self.sg.short_title
        self.assertEqual(st('Harry Potter and the Goblet of Fire: 4/7'), st('Harry Potter and the Goblet of Fire (Harry Potter 4)'))
        self.assertEqual(st("09: The Sixth Form at St Clare's"), st("The Sixth Form at St Clare's"))
        self.assertEqual(self.sg.tkey('The Traveller'), self.sg.tkey('The Traveler'))

    def test_secret_seven_books_stay_apart(self):
        ft = self.sg.full_title
        self.assertNotEqual(ft('Secret Seven: 10: Puzzle For The Secret Seven'), ft('Secret Seven: 1: The Secret Seven'))

    def test_series_number(self):
        self.assertEqual(self.sg.series_no('Harry Potter and the Goblet of Fire (Harry Potter 4)'), '4')
        self.assertEqual(self.sg.series_no('Plain Title'), '')

    def test_review_html_to_text(self):
        t = self.sg.review_text('<p>Loved it.</p><p>Really <b>did</b>.</p>')
        self.assertNotIn('<', t)
        self.assertIn('Loved it.', t)


class StoryGraph(unittest.TestCase):
    HEADER = ('Title,Authors,Contributors,ISBN/UID,Format,Read Status,Date Added,Last Date Read,Dates Read,Read Count,Moods,Pace,'
              'Character- or Plot-Driven?,Strong Character Development?,Loveable Characters?,Diverse Characters?,Flawed Characters?,'
              'Star Rating,Review,Content Warnings,Content Warning Description,Tags,Owned?').split(',')

    def setUp(self):
        self.box = Sandbox().__enter__()

    def tearDown(self):
        self.box.__exit__(None, None, None)

    def export(self, rows, name='export.csv'):
        p = os.path.join(self.box.downloads, name)
        with open(p, 'w', encoding='utf-8', newline='') as fh:
            w = csv.DictWriter(fh, self.HEADER); w.writeheader()
            for r in rows:
                w.writerow({c: '' for c in self.HEADER} | r)
        return p

    def test_matching(self):
        books = self.box.read('books.json')
        by_isbn = next(b for b in books if b.get('isbn13'))
        p = self.export([
            {'Title': 'Some Other Name', 'Authors': 'Nobody', 'ISBN/UID': by_isbn['isbn13'], 'Read Status': 'read', 'Star Rating': '4.5',
             'Dates Read': '2025/01/01-2025/01/09'},
            {'Title': 'A Library Book Not Owned', 'Authors': 'Some One', 'Read Status': 'to-read'},
        ])
        r = run('import_storygraph.py', p, '--apply')
        self.assertEqual(r.returncode, 0, r.stderr)
        out = {e['title']: e for e in self.box.read('storygraph.json')['books']}
        self.assertIn(by_isbn['id'], out['Some Other Name']['books'])
        self.assertEqual((out['Some Other Name']['rating'], out['Some Other Name']['dates']), (4.5, [['2025-01-01', '2025-01-09']]))
        self.assertNotIn('books', out['A Library Book Not Owned'])   # kept, not on her shelves
        self.assertTrue(os.listdir(self.box.path('imports')))   # a copy of the export kept

    def test_removed_copies_never_matched(self):
        gone = self.box.read('removed.json', [])
        books = {b['id']: b for b in self.box.read('books.json')}
        g = next((books[x['id']] for x in gone if x['id'] in books and books[x['id']].get('isbn13')), None)
        if not g:
            self.skipTest('no removed copy with an ISBN')
        p = self.export([{'Title': g['title'], 'Authors': 'x', 'ISBN/UID': g['isbn13'], 'Read Status': 'read'}])
        run('import_storygraph.py', p, '--apply')
        for e in self.box.read('storygraph.json')['books']:
            self.assertNotIn(g['id'], e.get('books', []))

    def test_her_latest_real_export_gives_her_reading(self):
        """Importing her latest kept export again gives the reading the site has now."""
        exports = sorted(glob.glob(os.path.join(REAL, 'imports', 'storygraph-*', '*.csv')), key=os.path.getmtime)
        if not exports:
            self.skipTest('no StoryGraph export kept')
        now = json.load(open(os.path.join(REAL, 'data', 'storygraph.json'), encoding='utf-8'))
        latest = next((e for e in exports if os.path.basename(e) == now.get('file')), None)
        if not latest:
            self.skipTest('the export the site uses isn’t kept in imports/')
        r = run('import_storygraph.py', latest, '--apply')
        self.assertEqual(r.returncode, 0, r.stderr[-800:])
        gone = {x['id'] for x in self.box.read('removed.json', [])}   # an older import may still name copies removed since; the build drops them
        for e in now['books']:
            if 'books' in e:
                e['books'] = [i for i in e['books'] if i not in gone]
        self.assertEqual(self.box.read('storygraph.json')['books'], now['books'])


if __name__ == '__main__':
    unittest.main()
