Code fixes for Jemma's Library (from research\code-review\review.md), made in a clone (repo\), not in HomeLibrary.
Base: d2f51cf. Patches in patches\ (git am patches\*.patch). 0009 is only the rebuilt data.js/index.html (1.8 MB);
instead of applying it you can run tools/build.py after 0001-0008.

The fixes, one line each
0001 serve.py: a new added book's id is the highest add#### + 1 (next is add0016; before it would have been add0015, already in use).
0002 import_storygraph.py: copies grouped by the whole tidied title + surname (+ series number when the titles differ), not the part before
     the colon; that part, or the title alone, matches only when it is one book. Edition-only subtitles (": 4/7", ": Illustrated Edition") still group.
0003 Dates: year-only and partial dates ("2024-2024", "2024/04/29-2024/09") parsed; a single date is a finish, not a start (importer + app.js dateRange).
0004 serve.py: rebuild exit code checked (add answers "saved, but the site couldn't be rebuilt"; the watcher logs it and tries again next time);
     one lock around add and reading import; build.py writes data.js and index.html via .tmp + os.replace.
0005 serve.py: Host must be localhost:<port> or 127.0.0.1:<port> (all GET/HEAD/POST, else 403); cover URLs only https (others dropped).
0006 backup.py: git in its own try (zip still made); zip written as .zip.part, testzip(), then renamed; a failed .part is deleted.
0007 app.js: "read" on All shelves / shelf / author / Stats counts distinct books (bookKey); one helper finishedIn(year) for Home, Reading log
     and Stats; book hero shows "Book n of <series>" once, with only the edition (if any) under the title.
0008 site.css: --focus (walnut on cream, brass in dark mode) on chips, sort menu, covers/list buttons, .btn; prefers-reduced-motion rule.
0009 Rebuild.

Verified
- 0002: re-ran the import on imports/storygraph-2026-10-18 with old and new code: data/storygraph.json links identical (345 entries, 0 differ;
  by hand 18, ISBN 76, title and author 95, title only 7, not on shelves 149). Copy groups: 30 multi-copy groups before -> 24 (all 24 real:
  Harry Potter editions, Klune duplicates, St Clare's/Malory Towers spellings); split apart: Secret Seven (13), Adventure Zone (5), Artemis Fowl (3),
  Mother of Learning (2), Veronica Mars (2), Fantastic Beasts Illustrated vs Screenplay. Test rows: "The Adventure Zone: Petals to the Metal"
  now links to that one book only (before: all five); bare "Secret Seven" / "Veronica Mars" now link to nothing (ambiguous).
- 0003: 10 books' dates change in storygraph.json. Book pages now: Abroad in Japan "29 Apr – Sep 2024" (was "Started 29 Apr 2024"),
  Fangirl and five others "2024" (was an empty line), The Casual Vacancy "8 Jan 2014" (was "Started 8 Jan 2014").
- 0004/0005: serve.py run on port 8031 from a test script (no Downloads watcher): Host localhost/127.0.0.1 -> 200; evil.example:8031 or
  localhost:8020 -> 403 (GET, HEAD, POST); add with a file:/// cover -> saved as add0016, cover dropped; add with the build forced to fail
  -> ok:false with the message, logged. Test data reverted afterwards.
- 0006: with git made to fail: log "git failed", zip still written and renamed (zip test used a small folder: the clone's own path is too long
  for Python's zip on this machine).
- 0007 (in the browser, clone served on 8031): All shelves read 200 -> 172; Fantasy 65 -> 47; J. K. Rowling 25 -> 11; Enid Blyton 31 -> 21;
  T. J. Klune 8 -> 4; Stats "31% read (200 books)" -> "29% read (172 books)" (now out of 591 distinct books, not 642 copies).
  Read this year: Home 70, Reading log 70, Stats 70 (they already agreed on today's data; now one rule). Reading log "229 read" unchanged.
  Philosopher's Stone (Illustrated): "Illustrated Edition" under the title + "Book 1 of Harry Potter" (was "Harry Potter, book 1 · Illustrated Edition" too).
- 0008: Tab onto the covers button shows a solid walnut ring (#5E3D22); before, none. Reduced-motion rule present in the page.
- tools/build.py runs clean: 642 books, 28 to buy, 609 with covers. Nothing opened on 8020; HomeLibrary unchanged (still d2f51cf, clean).

Not done (outside the 8 asked): review items 5 (readCount de-dup), 7-9, 11-17, 21-24, 27-40 and sections F-H.
