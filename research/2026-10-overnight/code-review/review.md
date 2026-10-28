# Jemma's Library: code review (23 Oct 2026)

Read-only review of `C:\Users\Jemma\Documents\HomeLibrary` (commit d2f51cf). Nothing in the project was changed or run apart from read-only Python checks of `data/*.json` (script: `an.py` next to this file). Line numbers are for that commit.

Ranks: **BUG** = wrong now or on the next normal action; **RISK** = latent, breaks under a likely future event; **IMPROVEMENT** = quality, speed, accessibility.

---

## A. Correctness bugs

| # | Rank | Where | Finding | Suggested fix |
|---|---|---|---|---|
| 1 | BUG | tools/serve.py:61 | New ids are `add{len(added)+1}`. `added.json` has 14 books, add0001–add0015 with **add0009 missing**, so the **next book added gets `add0015`, which already exists**: `bookIndex` overwrites one, `bought.json`/covers `id-add0015` collide. | Use `max(int(x['id'][3:]) for x in added) + 1` (or a random id like Libib's). |
| 2 | BUG | tools/import_storygraph.py:72 and site/js/app.js:334-339 | Dates that aren't full `YYYY/MM/DD` are mis-parsed. 6 books have `2024-2024` (year-only range) stored as a *start* date with no finish; *Abroad in Japan* has finish `2024-09`, which `dateRange` can't parse, so its page says "Started 29 Apr 2024" for a finished book and the six show an empty date line. | In `dates_read` split on `-` for `\d{4}(/\d\d){0,2}` too; in `dateRange`/`niceDate` accept `YYYY` and `YYYY-MM`. |
| 3 | BUG | site/js/app.js:262, 432, 536/552 | "Read this year" differs by page: Home and Stats count *finishes* (a re-read counts twice), the Reading log hero "finished in 2026" counts *distinct books*. Same label, different numbers. | Pick one meaning (she said re-reads count) and use `finishes()` on the Reading log too, or relabel one "times finished". |
| 4 | BUG | site/js/app.js:314, 321, 417, 573/581 | "read" figures on All shelves, a shelf, an author and Stats use `BOOKS.filter(isRead)`, i.e. **copies** (three Philosopher's Stones = 3 read); the Reading log and Stats "books read" use `readingLog()` (one per book). | Count `new Set(list.filter(isRead).map(bookKey)).size`. |
| 5 | BUG | site/js/app.js:98 | `readCount` counts finish dates across all joined entries without de-duplicating, so a book with two StoryGraph editions sharing a finish date shows "Read 2 times" (finishes() at :118 already de-dups, readCount doesn't). | `new Set(dates.filter(d => d[1]).map(d => d[1])).size`. |
| 6 | BUG | tools/serve.py:92-93, 178 | The rebuild's exit code is ignored. If `build.py` fails, the API still answers `ok: true`, the page jumps to `#b-<id>` which doesn't exist yet, and the router silently shows Home. The watcher likewise records the import as done. | Check `returncode`; return `{'ok': False, 'error': 'saved, but the rebuild failed'}` and log it. |
| 7 | BUG | site/js/app.js:489 | Add-page fields run values through `esc()` → `curly()` then turn `’` back into `'`, but a leading `‘` stays, and real `’` typed by her become straight. A title like *'Salem's Lot* is saved as `‘Salem's Lot`. | Use a plain HTML-attribute escape (no `curly`) for input values. |
| 8 | BUG | site/js/app.js:87 | `e.started` sorts dates by start and takes the last; a current re-read with no start date sorts first, so "Started …" on the Reading now card shows an *old* read's start. | Take the start of the entry with no finish (the open read), else the latest. |
| 9 | BUG (minor) | site/js/app.js:62, 383, 457 | A book whose shelf id isn't in `shelves.json` (e.g. a typo in `shelf-moves.json`) crashes its page (`s.color` of undefined) and the picker. | In build.py, reject unknown shelf ids; in app.js fall back to `shelfIndex.unsorted`. |

## B. Fragile code paths (risks)

| # | Rank | Where | Finding | Suggested fix |
|---|---|---|---|---|
| 10 | RISK (high) | tools/import_storygraph.py:30-35, 118-126, 163-165 | Copies are grouped by `short_title` = **text before the first colon** + surname. That lumps different books together: `secretseven|blyton` = 13 Secret Seven books, `adventurezone|mcelroy` = 5, `artemisfowl|colfer` = 3, Mother of Learning ARC 1+2, both Veronica Mars, Fantastic Beasts Illustrated + Screenplay. Not triggered by the 18 Oct export, but the first time she logs e.g. *The Adventure Zone: Petals to the Metal*, **all five get her reading** (and the site can't undo it: `sgFor` comes from `e.books`). | Group on the full tidied title (and series number); use the before-colon key only as a match *fallback* for a single book, never for `group`. |
| 11 | RISK | tools/import_storygraph.py:166 | Title-only fallback runs when the surname *didn't* match, so a same-titled book by another author (*Solitaire*, *Wicked*, *Persuasion*-type titles) gets her reading silently. | Only allow title-only when StoryGraph's author is empty, or print these matches for her to confirm. |
| 12 | RISK | tools/import_libib.py:117-120 | A Libib re-import rewrites `books.json` whole: any `displayTitle` (none yet, but CLAUDE.md invites them) is lost, and books she added on the site and later scans into Libib become duplicates (no check against `added.json`). Overlays (`editions`, `shelf-moves`, `removed`, `details`, `no-cover`, `storygraph-links`, `bought`) are keyed by Libib id; if she deletes and re-adds a book in Libib they silently stop applying. | Keep `displayTitle` in its own overlay file; in the report, list overlay ids no longer present and ISBNs already in `added.json`. |
| 13 | RISK | site/js/app.js:85, 618 | Not-owned pages are `#r-<row number>` of the StoryGraph export. Every new import can reorder rows, so links/bookmarks to not-owned books point at a different book. | Id from StoryGraph's ISBN/UID column (or slug of title+author). |
| 14 | RISK | data/elsewhere-shelves.json, reading-fixes.json, storygraph-links.json (read at app.js:181, build.py:61, import_storygraph.py:157) | All keyed by the StoryGraph **title** string. If she edits a title/edition on StoryGraph, the shelf, the DNF fix or the hand link silently drop (all three currently match). | Key by ISBN/UID; make the import report any key that no longer matches. |
| 15 | RISK | tools/serve.py:183 | The log summary looks for a line starting with the hard-coded `'345'` (the 18 Oct count). Harmless now (the `'StoryGraph books'` test also catches it) but it's a leftover. | Drop `'345'`. |
| 16 | RISK | tools/serve.py:139, 156 | The watcher only recognises a CSV whose first line *starts with* `Title,Authors,Contributors,ISBN/UID`. If StoryGraph reorders or renames a column, imports just stop with nothing in the log. | Recognise by a set of required column names; log "found a CSV that looks like StoryGraph but…" |
| 17 | RISK | tools/serve.py:172-190 | No sanity check: an export that comes back short (a failed StoryGraph export, a filtered one) replaces her whole reading record. | Refuse (and log) if the row count drops by more than ~10% vs `storygraph.json`. |
| 18 | RISK | tools/serve.py:92, 178; tools/build.py:85-88, 102 | Two builds can run at once (an add while the watcher imports; ThreadingHTTPServer can also run two adds), both truncating and writing `data.js`/`index.html`; `added.json`, `covers.json`, `bought.json` writes are not atomic either. A crash mid-write leaves broken JSON and an empty site. | One `threading.Lock` around add+build; write to `*.tmp` then `os.replace`. |
| 19 | RISK | tools/backup.py:159-162, 179-181 | `git` is run first inside the one `try`. Under Task Scheduler `git` may not be on PATH (FileNotFoundError) or the repo may be locked; then **the zip is skipped too** (exit 1). Also `git add -A` commits whatever a running build half-wrote. | Put git in its own `try` and always zip; use git's full path. |
| 20 | RISK | tools/backup.py:164-177 | The zip is written straight to its final name; a failure mid-way leaves a broken "backup" that counts toward the 8 kept. All 8 sit on the same disk as the project. | Write `…zip.tmp`, `testzip()`, then rename; add a copy to OneDrive or an external drive. |
| 21 | RISK | tools/serve.py:197-205 | The server is started once at login. If it crashes, the app window shows Chrome's error page until she logs out and in. | Run it from Task Scheduler with "restart on failure", or a tiny supervisor loop. |
| 22 | RISK | site/js/app.js:105 | Books StoryGraph doesn't know fall back to Libib's own `status` (one book has `reading`). CLAUDE.md says reading comes only from StoryGraph. Latent (that book is linked). | Drop the Libib `status` fallback (and stop importing it at import_libib.py:49-51). |
| 23 | RISK | site/js/app.js:126 / import_storygraph.py:27 | `tkey` collapses doubled characters, digits included (`11` → `1`, `2001` → `201`), so titles that differ only by a doubled number match the same series entry. | Collapse doubled letters only: `/([a-z])\1/g`. |
| 24 | RISK | site/js/app.js:109 | `bookKey` joins series id and number without a separator (`series-x` + `11` = `series-x1` + `1`). | Add a separator: `h.series.id + "#" + h.entry.n`. |

## C. Security of tools/serve.py

Good: listens on `127.0.0.1` only (:201); `SimpleHTTPRequestHandler` refuses `..` paths and serves only `site/`; the `X-Library: 1` header can't be sent cross-site without a CORS preflight, and the server doesn't answer OPTIONS, so ordinary pages on other sites can't call the API; ISBNs are cleaned before use; the shelf is checked against `shelves.json`; cover file names come from digits or the generated id, so no path traversal there.

| # | Rank | Where | Finding | Suggested fix |
|---|---|---|---|---|
| 25 | RISK | tools/serve.py:113-114 | No `Host` check, so **DNS rebinding** gets round the header rule: a site she visits can point its own name at 127.0.0.1, then it's "same origin" and can send `X-Library`, add books and read `/api/lookup`. | Reject unless `Host` is `localhost:8020` or `127.0.0.1:8020`; optionally also check `Origin`. |
| 26 | RISK | tools/serve.py:83-91 → copy_covers.py:206 | `cover` is any URL from the request body; the server fetches it (urllib also takes `file://` and LAN addresses) and saves anything Pillow can open into `site/covers/`. | Allow only `https://` on known cover hosts (covers.openlibrary.org, books.google, Amazon images). |
| 27 | IMPROVEMENT | tools/serve.py:133 | Body size unbounded; a bad `Content-Length` gives a 500 with the Python error text. | Cap at e.g. 64 KB; return a plain message. |
| 28 | IMPROVEMENT | tools/serve.py:100-111 | Directory listings are on (`/covers/` lists 797 files). | Override `list_directory` to 404. |

## D. Performance

Measured: `data.js` 884 KB, of which descriptions 390 KB and reviews 160 KB. `site/covers/` 797 files, 41 MB, avg 51 KB, max 593 KB, 600 px tall. **21 files (0.9 MB) aren't used** by data.js (not ~100). Home page shows about 75 covers (32 in the banner, 27 in shelf fans, 12 in rows, 3 reading now) ≈ 3.8 MB.

| # | Rank | Where | Finding | Suggested fix |
|---|---|---|---|---|
| 29 | IMPROVEMENT | tools/copy_covers.py:200-216, app.js:191, 209, 226 | Grids show covers at ~148×222 px, but every grid, banner and fan loads the 600 px original. | Also save a ~330 px-tall thumbnail (`covers/thumb/…`, ~15 KB); use it everywhere but the book page; add `width`/`height` and `decoding="async"`. Cuts the home page to ~1 MB. |
| 30 | IMPROVEMENT | tools/serve.py:104-106 | `Cache-Control: no-cache` on everything makes the app revalidate every cover on every visit (~80 round trips per page), even though covers and code carry `?v=` fingerprints. | `max-age=31536000, immutable` when the URL has `?v=`; `no-cache` only for index.html. |
| 31 | IMPROVEMENT | tools/build.py:79-88 | Descriptions and reviews are 62% of data.js and are only needed on book pages. | Write them to `js/details.js` (or one JSON per shelf) loaded on first book page; or at least gzip when online. |
| 32 | IMPROVEMENT | site/js/app.js:111-115, 237, 248 | `readingLog()` is rebuilt several times per page (twice in the sidebar alone) and search re-renders on every keystroke. Fine at 640 books; cheap to tidy. | Memoise `readingLog()`; debounce search ~150 ms. |
| 33 | IMPROVEMENT | tools/ (new) | 21 unused cover files. | A `--prune` option on copy_covers.py that lists files no book uses, for her OK before deleting. |
| 34 | IMPROVEMENT | site/index.html:19-21 | Fonts come from Google: none offline, and an outside request on every load. | Self-host the two WOFF2 files under `site/fonts/` (both are OFL). |

## E. Accessibility

Contrast measured (WCAG ratios): muted `#75664F` on paper 4.95 ✓, on surface 5.44 ✓, **on soft `#EFE5D1` 4.46 ✗** (notes, mood chips at 12 px); **`--reading #B8861A` on surface 3.17 ✗** (Reading now label 11 px, add-page messages 14 px); **brass focus ring `#E4B23C` on cream 1.74 ✗** (needs 3:1; fine on walnut at 7.3); dark mode **`.flag` `#8A4B17` on `#201911` 2.56 ✗**; sidebar muted on walnut 6.44 ✓; sashes 13.0 / 6.7 ✓. White title-card text on the Children's shelf colour `#CF9A2B` is about 2.4.

| # | Rank | Where | Finding | Suggested fix |
|---|---|---|---|---|
| 35 | BUG | site/site.css:141 (also 131, 186, 195, 226, 252 rely on own rules) | `.views button{all:unset}` (specificity 0,1,1) beats the global `:focus-visible` (0,1,0), so the covers/list buttons have **no focus ring at all**. | Add `.views button:focus-visible{outline:2px solid var(--deep-2)}`. |
| 36 | IMPROVEMENT | site/site.css:23, 134, 254, 354 | The focus colour on cream pages is brass (1.74:1); the add form drops the outline for a brass border. | Use walnut `--deep-2` (or a double ring brass + walnut) on light backgrounds. |
| 37 | IMPROVEMENT | site/site.css:5, 7, 223 | The contrast misses above. | Darken `--reading` to about `#8C6510`, muted-on-soft text to `--ink`-ish, `.flag` colour to `var(--done)` in dark mode. |
| 38 | IMPROVEMENT | site/site.css (whole file) | **No `prefers-reduced-motion`** rule: cover lifts, shelf-fan swings and the smooth scrolls still move (only `scrollIntoView` checks it, app.js:633). | `@media (prefers-reduced-motion: reduce){*{transition:none!important;animation:none!important}}`. |
| 39 | IMPROVEMENT | site/js/app.js:204, 341 | Stars: the first `★★★★★` is read out as five stars whatever the rating; `aria-label` on a plain span is ignored. | `role="img" aria-label="4.25 stars"` on the wrapper, both star spans `aria-hidden`. |
| 40 | IMPROVEMENT | site/js/app.js:238, 303, 305, 610-623 | Current page shown by colour only (`class="on"`), filter chips and view buttons have no pressed state, focus stays put on route change, no skip link, live search results aren't announced. | `aria-current="page"`, `aria-pressed`, move focus to the new `h1` (`tabindex="-1"`), a skip link, `aria-live="polite"` on the result count. |
| 41 | OK | app.js:209, 226, 343 | Cover `alt=""` is right (the title is in the card's h3/h1); banner is `aria-hidden`; spoilers are focusable and show on focus. | Nothing needed. |

## F. Phone layout (parked until she asks)

site.css has **no media queries at all**. At 375 px: `.side` is fixed 280 px wide (:29) and `main` has `margin-left:280px` (:55), leaving 95 px; the fixed grids also overflow: `.books.row` 6 columns (:106), `.book-top` 260 px + text (:164), `.book-body` 330 px aside (:174), `.ledger-grid` 4 columns (:233), `.bar-row` 200 px label (:238), `.now-row` 3 columns (:378), `.blist` 6 columns (:116), `.wish` min 330 px (:215), hero `h1` minimum 60 px (:70).

Suggested: under `@media (max-width:760px)` make `.side` a top bar (brand + search + a menu button opening the nav as a sheet), `main{margin-left:0}`, `.books.row` a horizontally scrolling strip, single-column `.book-top`/`.book-body`, `.ledger-grid` 2 columns, `.now-row` 1 column, `.blist` cover + title + status only, hero `h1` `clamp(40px,12vw,…)`.

## G. Before putting it online

1. **The API can't run on static hosting.** `serve.py`'s `/api/lookup`, `/api/books` and the Downloads watcher only work on her PC. `pageAdd` (app.js:488) only checks `location.protocol`, so online the Add page would show working buttons that fail. Detect the server (e.g. `GET /api/ping`) and hide "Add a book" and the "Got it" buttons when it isn't there; keep adding books on the PC and upload `site/` after.
2. **Privacy.** data.js carries all 151 StoryGraph reviews, every date she read something, moods, stars and her to-buy list. Either put the site behind a login (Cloudflare Access / Netlify password / basic auth) or add a `--public` build flag that leaves reviews and dates out. Also `<meta name="robots" content="noindex">` and no public git remote (`imports/` holds her raw StoryGraph and Libib CSVs and the weekly backup commits everything).
3. **Covers.** ~780 publisher cover scans copied into `site/covers/`; on a public site that's redistribution. Behind a login it's much safer.
4. **Google Fonts** (finding 34): an outside request that sends visitors' IPs to Google; self-host.
5. **Caching** (finding 30) depends on the host; fingerprints already make long caching safe.
6. **Phone layout** (section F) becomes necessary.
7. `sw.js` passes every request straight to the network; harmless, but online it adds nothing (and Chrome may show the offline dinosaur rather than a friendly page). Either cache the shell or remove it from the online copy.
8. Add a Content-Security-Policy (`default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:`); the code builds HTML with `innerHTML` throughout. All shown text goes through `esc()`, but shelf colours and ids go into `style`/`href` unescaped (app.js:209, 244, 300); fine while the data is hers.

## H. Smaller notes

- app.js:94 `RANK[status]` is undefined for any new StoryGraph status, making the sort NaN; give unknowns 0.
- app.js:449 `pickPool` de-duplicates on `norm(b.t)+surname`, a different rule from `bookKey`; use `bookKey`.
- app.js:523 authors split on every comma, so "Smith, John" becomes two authors.
- app.js:572/583/587 `Math.max(...[])` and `shelves[0].n` assume non-empty lists.
- site.css: about 60 lines of unused rules from removed features (`.seg`, `.stars`, `.dates`, `.tick`, `.backup`, `.badge`, `.series-*`, `.pips`).
- fill_details.py:93-94 writes with `json.dump(..., open(...))` and never closes the file; crashes mid-run can leave truncated JSON.
- build.py:63-64 `fix_names` replaces titles by exact Libib title, so a Libib typo fix breaks the mapping silently.
