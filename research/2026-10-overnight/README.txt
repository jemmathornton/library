Overnight research, 23-24 Oct 2026. Nothing here is applied to the site yet; each part waits for Jemma's yes.

code-fixes/patches/     8 tested code fixes (git format-patch, made against commit d2f51cf; apply with `git am`, then run tools/build.py).
                        0001 added-book ids (next book would overwrite add0015), 0002 reading import grouped different books
                        (Secret Seven etc.), 0003 year-only dates, 0004 build exit code + lock + atomic data.js, 0005 server Host
                        check + https-only covers, 0006 backup zip even if git fails, 0007 read counts per book not per copy,
                        0008 keyboard focus + reduced motion. 0009 is just the rebuilt data.js (skip it; rebuild instead).
                        code-fixes/README.txt says what each was tested with.
code-review/review.md   full review (41 findings, phone layout notes, going-online checklist).
ready/                  data changes ready to apply (README.txt there lists every one):
                        description-fixes.json (100 publisher blurbs, word for word, source in each),
                        detail-fixes.json (13 page counts, 42 dates), covers/ + covers-map.json (99 covers: 9 wrong/poor,
                        39 Old Book Collection period jackets, 51 to-buy), to-buy-additions.json (64: Blyton notes split + series gaps),
                        to-buy-updates.json, shelf-moves-proposed.json (17), name-fixes-proposed.json, covers-before-after.jpg.
                        Needs build.py to read description-fixes.json and detail-fixes.json; 21 old books must come off no-cover.json.
cover-audit/            every cover compared with its ISBN's cover (sheets/ to look at).
old-books/              period covers research for the Old Book Collection (sheet-*.jpg, old-books.json with sources).
series-gaps/            the matching edition (ISBN + cover) for each book missing from her series.
audit/                  ISBN, author name, shelf and duplicate checks (audit.md).
reading/                StoryGraph vs shelves, to-read worth knowing about, reading profile (reading.md).
blurbs*.json, pages.json, details.json   raw lookups behind ready/.
scripts*/               the scripts that made these.
