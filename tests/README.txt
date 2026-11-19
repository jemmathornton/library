The library's tests (9 Nov 2026; more thorough and steadier, 19 Nov)

Run them all:     python -X utf8 tests/run_tests.py            (about 1½ minutes)
Only one half:    python -X utf8 tests/run_tests.py unit      (or e2e)
Only some:        python -X utf8 tests/run_tests.py e2e -k search     (any words from a test's name)

Every test works on a throwaway copy of the library, never the real data, pictures, Downloads, backups or git settings.
Nothing goes out to the internet: lookups are faked (support.FakeWeb, or a fake lookup).

Two libraries
  her own (a copy)   for tests about her data: the site is up to date, every page and link works, the importers
                     still read her exports, the data check passes, each page's figures agree with what it lists
  a made-up one      tests/fixture_library.py: 25 invented books on three shelves, reading, series, old books,
                     to-buy, covers. Tests about how the site and scripts behave use it, so the answers are known
                     exactly and don't change when she adds or reads a book. Sandbox(data=False, covers=False) plus
                     fixture_library.make(box) gives one.

unit/   Python
  test_add_book          adding a book on the Add page: what's saved, its number, its cover, what else changes
  test_marks, test_server  signed / condition / inscription; the server's safety (who may ask, what it serves)
  test_scan              the phone-scan door (port 8021): the key, the book-number check, the list, "already have it"
  test_reading_watch     the reading watcher: new export imported once, a failed import not retried, a failed
                         rebuild retried, a cut-short export refused, problems logged
  test_build             the build of her data (up to date with data/, every mark lands) and awkward data
  test_build_covers      which cover each book gets: copies sharing an ISBN, second copies added on the site,
                         links, old books (cloth colour, no modern covers), books read elsewhere
  test_cover_tools       find_covers, fill_details and copy_covers run whole with the internet faked
  test_backup_restore    a backup of a small library unzipped and its history bundle cloned give it all back
  test_safety            the 15 Nov review fixes; test_imports: Libib and StoryGraph importers;
  test_straighten, test_isbn_and_titles, test_check_data

e2e/    the site in headless Chrome or Edge (test_site.py runs it; harness.js is the page's toolkit)
  site.test.js           on her library: every page and link, pictures, and every page's figures checked against
                         what it lists (shelves under each filter, All shelves, Home, Reading, History, Stats,
                         old books, To buy). Copies against books is her open question (TODO 9), so each number is
                         checked against what its label says, not made to agree with the others.
  fixture.test.js        on the made-up library: the page code's pieces with fixed inputs (tidyTitle, titleKeys and
                         series, bookKey and copies, sgMerged, dateRange, niceDate, curly / esc / escRaw, capitalise,
                         read and unread counts), exact figures on every kind of page, old books' shelves (surname
                         order, numbers, gaps, first-edition stars, cloth), book pages, search, the Add page with a
                         fake server, phone scans on the Add page
  Each page test is its own result in Python, named after the test. After each one the page is put back (fake server
  off, search and Add form empty, shelf view reset), so they don't lean on each other; LIBRARY_TEST_ORDER=reverse
  (or shuffle-<number>) runs them in another order to check. No fixed waits: until() waits for what's needed.

Known bugs: a test that shows a real bug not fixed yet is marked (Python @unittest.expectedFailure, page tests
knownBug("name", "the bug", ...)). It shows as "expected failure"; once the bug is fixed it shows as an unexpected
success and the run fails, so the mark is taken off.
