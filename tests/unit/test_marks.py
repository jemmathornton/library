"""Her marks on a book's page: signed, condition and inscription are saved, changed and cleared properly."""
import os, sys, unittest
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from support import Sandbox, load


class Marks(unittest.TestCase):
    def setUp(self):
        self.box = Sandbox().__enter__()
        self.serve = load('serve')

    def tearDown(self):
        self.box.__exit__(None, None, None)

    def test_signed_set_change_and_clear(self):
        self.serve.set_signed('abc', 'signed')
        self.assertEqual(self.box.read('signed.json')['abc'], 'signed')
        self.serve.set_signed('abc', 'to-you')
        self.assertEqual(self.box.read('signed.json')['abc'], 'to-you')
        self.serve.set_signed('abc', '')
        self.assertNotIn('abc', self.box.read('signed.json'))

    def test_signed_rejects_other_values(self):
        self.serve.set_signed('abc', 'definitely')
        self.assertNotIn('abc', self.box.read('signed.json', {}))

    def test_condition_only_the_five_grades(self):
        for c in ('Fine', 'Very good', 'Good', 'Fair', 'Poor'):
            self.serve.set_condition('abc', c)
            self.assertEqual(self.box.read('condition.json')['abc'], c)
        self.serve.set_condition('abc', 'Mint')
        self.assertNotIn('abc', self.box.read('condition.json'))

    def test_inscription_kept_as_typed(self):
        text = "To Jemma, love Gran ‘Christmas 1952’ — don't lose it"
        self.serve.set_inscription('abc', '  ' + text + '  ')
        self.assertEqual(self.box.read('inscriptions.json')['abc'], text)

    def test_inscription_cleared_when_empty(self):
        self.serve.set_inscription('abc', 'Something')
        self.serve.set_inscription('abc', '   ')
        self.assertNotIn('abc', self.box.read('inscriptions.json'))

    def test_inscription_capped(self):
        self.serve.set_inscription('abc', 'x' * 5000)
        self.assertEqual(len(self.box.read('inscriptions.json')['abc']), 1000)

    def test_other_books_marks_untouched(self):
        before = self.box.read('condition.json', {})
        self.serve.set_condition('abc', 'Good')
        after = self.box.read('condition.json')
        self.assertEqual({k: v for k, v in after.items() if k != 'abc'}, before)

    def test_no_temporary_files_left(self):
        self.serve.set_signed('abc', 'signed')
        self.assertFalse([f for f in os.listdir(self.box.path('data')) if f.endswith('.tmp')])


if __name__ == '__main__':
    unittest.main()
