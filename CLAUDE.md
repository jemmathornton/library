# Jemma’s Library

A private website of the books in Jemma’s home library: every book she owns, shelf by shelf, what she’s reading and has read, and a to-buy list. Started 18 Oct 2026 as a prototype in the style of her Sims site (`C:\Users\Jemma\Documents\SimTracker`): a static site on her PC, built so it can go online later. Open things are in `TODO.md`.

## Working rules (as for her Sims site)

- **Never edit Jemma’s own files without asking** (Downloads, Documents, Pictures…). Copy them into the project and work on the copy.
- **British English** in everything shown; **curly apostrophes** in displayed text (ids, links and data keys stay straight).
- **Short, plain answers.** She reviews by looking at the site.
- **Obvious bugs** can be fixed straight away; **anything needing her judgement** (shelves, titles, names, layout) goes on `TODO.md`.
- **No AI-generated art.** Covers are the publishers’ own (Open Library / Google Books); a book with no cover gets a plain title card. Icons are Lucide (ISC).
- **Her colours: yellows and browns.** No green (she hates the green, 18 Oct). Banners are made of the page’s own covers fading into walnut (her choice, 18 Oct); shelf colours appear only as dots.
- **No buttons for reading:** read or not read comes only from StoryGraph and is shown, never set on the site (her choice, 18 Oct). **The site never mentions StoryGraph** (her choice, 18 Oct): it is just her reading.
- Laptop (1280px) first; phone layout when she asks.

## Where things are

- `site/`: the app (`index.html`, `site.css`, `js/app.js`, `js/icons.js`, `js/data.js` **generated, never edit**). The only folder to upload if it goes online.
- `data/`: the source of truth. `shelves.json` (order, names, colours, which Libib collection), `books.json` (one entry per book; `id` is the Libib id; `displayTitle` overrides the shown title), `to-buy.json` (`maybeOwned` = book ids that look like it), `covers.json` (ISBN, or `id-<id>` for a book found by title, → cover link). `added.json`: books she added on the site (Add a book page; kept apart because a Libib re-import overwrites `books.json`). `bought.json`: to-buy books she has added to a shelf (“Got it”) or already owns; the build leaves them off the to-buy list. `removed.json`: Old Book Collection books that stay title cards rather than show a modern reprint’s cover (her rule, 18 Oct: old books never get modern covers). : Libib duplicates she says aren’t real copies; the build leaves them out. `name-fixes.json`: Libib author names tidied (applied by the build). `series.json`: series in reading order (only ones whose order is sure; titles can have other spellings after `|`). Shown in place: on the shelves an author’s series sits together in reading order, and a book page says “Book n of …”; no series page (her choice, 18 Oct).
- `imports/libib-<date>/`: her Libib CSV exports as copied in (one per collection). `imports/storygraph-<date>/`: her StoryGraph export.
- `data/storygraph.json`: her reading, from StoryGraph (where she tracks it): status, dates, stars, moods, reviews. `books` = the shelf books (every copy) it matches; entries without `books` aren’t on her shelves and **never go on a shelf** (library books, ebooks; her rule, 18 Oct): they show only in the Reading log and search.
- `tools/import_storygraph.py <export.csv>` (report; `--matches` lists every match; `--apply` copies the export into imports/ and writes `data/storygraph.json`).
- `tools/import_libib.py <folder>` (report; `--apply` writes `data/books.json` and `data/to-buy.json`: genre collections are the library, the old “Jemma’s Library” catch-all only adds books that aren’t on a shelf, “Books to Buy” is the wishlist). Re-importing overwrites `books.json`, so hand edits there would be lost.
- `tools/find_covers.py` (looks up covers not tried before; `--retry` tries the misses again), `tools/copy_covers.py` (copies them into `site/covers/<isbn>.jpg`, at most 600px tall; the build uses a copy over a link), then `tools/build.py` (writes `site/js/data.js` and stamps fingerprints into index.html).
- App icon: `tools/make_icons.py` (Lucide’s library in yellow on brown; Windows icon `site/app-v2.ico` with every size inside; a new picture needs a new file name, as Windows keeps old icons by name). `tools/serve.py` also answers the Add a book page (`/api/lookup` from Open Library, `/api/books` saves to `added.json` and rebuilds; both need the header `X-Library: 1`; restart it after changing it). Shortcuts: `tools/make_shortcuts.ps1` (Desktop, Start menu, project folder) open http://localhost:8020 as an app window in its own Chrome profile, like the Sims site; `tools/serve.py` serves `site/` there (this computer only), started at login from her Startup folder. `site/manifest.json` and `site/sw.js` let Chrome install it as an app (the only way to a sharp taskbar icon); she prefers the shortcut (18 Oct).

## How to work here

- Python 3.13: `C:/Users/Jemma/AppData/Local/Programs/Python/Python313/python.exe`, run with `-X utf8`. Ask before installing anything.
- Check with the `library` preview (`.claude/launch.json`, port 8011) at 1280px; her app reads the same files through port 8020, so a rebuild shows there at once. Opening `site/index.html` straight from the folder still works too.
- Git repo: commit after each piece of work (`data.js` included).
- **Weekly backup:** the Windows task "Jemma’s Library - weekly backup" (Sundays 09:30, `tools/make_backup_task.ps1`) runs `tools/backup.py`: commits any changes, then zips the project to Documents\Library backups (keeps 8). Log in `logs/backup.log`.
