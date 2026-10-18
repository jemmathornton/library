# Jemma’s Library

A private website of the books in Jemma’s home library: every book she owns, shelf by shelf, what she’s reading and has read, and a to-buy list. Started 18 Oct 2026 as a prototype in the style of her Sims site (`C:\Users\Jemma\Documents\SimTracker`): a static site on her PC, built so it can go online later. Open things are in `TODO.md`.

## Working rules (as for her Sims site)

- **Never edit Jemma’s own files without asking** (Downloads, Documents, Pictures…). Copy them into the project and work on the copy.
- **British English** in everything shown; **curly apostrophes** in displayed text (ids, links and data keys stay straight).
- **Short, plain answers.** She reviews by looking at the site.
- **Obvious bugs** can be fixed straight away; **anything needing her judgement** (shelves, titles, names, layout) goes on `TODO.md`.
- **No AI-generated art.** Covers are the publishers’ own (Open Library / Google Books); a book with no cover gets a plain title card. Icons are Lucide (ISC).
- Laptop (1280px) first; phone layout when she asks.

## Where things are

- `site/`: the app (`index.html`, `site.css`, `js/app.js`, `js/icons.js`, `js/data.js` **generated, never edit**). The only folder to upload if it goes online.
- `data/`: the source of truth. `shelves.json` (order, names, colours, which Libib collection), `books.json` (one entry per book; `id` is the Libib id; `displayTitle` overrides the shown title), `to-buy.json` (`maybeOwned` = book ids that look like it), `covers.json` (ISBN → cover link, `null` = none found).
- `imports/libib-<date>/`: her Libib CSV exports as copied in (one per collection).
- `tools/import_libib.py <folder>` (report; `--apply` writes `data/books.json` and `data/to-buy.json`: genre collections are the library, the old “Jemma’s Library” catch-all only adds books that aren’t on a shelf, “Books to Buy” is the wishlist). Re-importing overwrites `books.json`, so hand edits there would be lost.
- `tools/find_covers.py` (looks up covers not tried before; `--retry` tries the misses again), then `tools/build.py` (writes `site/js/data.js` and stamps fingerprints into index.html).

## How to work here

- Python 3.13: `C:/Users/Jemma/AppData/Local/Programs/Python/Python313/python.exe`, run with `-X utf8`. Ask before installing anything.
- Check with the `library` preview (`.claude/launch.json`, port 8011) at 1280px. Opening `site/index.html` straight from the folder works too.
- Git repo: commit after each piece of work (`data.js` included).
