The library's tests (9 Nov 2026)

Run them all:     python -X utf8 tests/run_tests.py
Only one half:    python -X utf8 tests/run_tests.py unit      (or e2e)
Only some:        python -X utf8 tests/run_tests.py unit -k add

Every test works on a throwaway copy of the library, never the real data, pictures or Downloads.

unit/   Python: adding a book, signed/condition/inscription, the server's safety and the reading watcher,
        the site build, the Libib and StoryGraph importers, cover straightening, the data check
e2e/    the site itself in headless Chrome: every page and link, pictures, sidebar counts, search,
        the old books' pages, and the Add page (with a fake server, so nothing is looked up or saved)
