# To do

## For Jemma to decide

1. **12 books that never moved to a genre.** They were only in Jemma’s Library on Libib, so they’re on “Not on a shelf yet”. Which shelf should each go on?
   - A Tale of Time City (Diana Wynne Jones)
   - Forward (Maeve Clark and others)
   - Pure Dead Brilliant and Deep Water (Debi Gliori)
   - Ptolemy’s Gate (Jonathan Stroud)
   - Poison Study, Magic Study and Fire Study (Maria V. Snyder)
   - The Most Beautiful Stories of Beatrix Potter
   - Christmas Activity Book (Catherine Bruzzone, Clare Beaton)
   - Fun to Make Paper Craft (Anna Curti)
   - Where In The Zoo Are You?
2. **Two books that look like duplicates.** In each case one copy has no ISBN. Is there one copy or two?
   - I’m Glad My Mom Died (Non-Fiction): one added Jan 2025 with no ISBN, one added Apr 2026
   - Sourcery (Fantasy): “original paperback” with no ISBN, and the 2004 Corgi edition
3. **Same title twice, different editions.** These are kept as separate books, shown under “Other copies you own”. Say if any shouldn’t be:
   - Harry Potter: several sets (1997 Bloomsbury, the 2014 set, illustrated editions, Hufflepuff edition)
   - Malory Towers and St Clare’s: newer copies on Children’s, old copies on Old Book Collection
   - The House in the Cerulean Sea, Solitaire, Kitty at St Clare’s, The Tennis Term at Trebizon
4. **Happy Place** is on To buy but is already on Adult Fiction. Take it off the list?
5. **Titles are tidied automatically.** Anything in brackets, and a long subtitle after a colon, moves to a smaller line (e.g. “Harry Potter and the Goblet of Fire: 4/7 (Harry Potter 4)”). The Libib title is still shown on the book page. Is this OK? Any book can get its own title (`displayTitle` in `data/books.json`).
6. **Author names tidied** (18 Oct, her yes; `data/name-fixes.json`): e.g. Hans Christian Andersen, Florentyna Leow and Nina Mingya Powles (Libib had “LEOW”, “POWLES”), Shirley Barber and Phoebe Gilman added where Libib had no author, Anonymous dropped from The Familiar, Hwang Bo-reum filed under Hwang. Check any you’re not sure of.
7. **Look:** yellows and browns since 18 Oct (walnut sidebar, cream pages, mustard gold); banners are made of each page’s own covers (her choice, 18 Oct). The shelf colours (now only the dots) are first picks.
8. **StoryGraph books that may be on your shelves under another title.** Should these count as read?
   - Wicked: linked to “Wicked: The Wicked Years Vintage Collection” (a boxed set). Right?
   - The Golden Compass and the His Dark Materials boxed set (read) vs Northern Lights, The Subtle Knife and The Amber Spyglass on Fantasy: not linked
   - Harry Potter Series Box Set (read): not linked to the Harry Potter books on Fantasy
   - Fantastic Beasts & Where to Find Them (read): two copies on the shelves (Comic Relief and Illustrated), so not linked
   - Fun and Games at Malory Towers (read): the Libib copy is spelt “Fund and Games”, so not linked
9. **Marking books here as well as on StoryGraph.** Books StoryGraph doesn’t know still have Not read / Reading / Read buttons, saved in this browser only. Keep them, or should everything go through StoryGraph?

10. **Series to add** (order not sure): Trebizon, the Quest books (Lisa Wright DeGroodt), Legacy of the Stones, Pure Dead. Tell me the order, or say leave them.

## Open (prototype limits)

- **Reading comes from StoryGraph** (`tools/import_storygraph.py`, export from 18 Oct). Export again and import to bring in new reading. 178 of 345 StoryGraph books are on her shelves; the rest (library books, ebooks, audiobooks) show only in the Reading log and search, never on the shelves (her rule, 18 Oct).
- **To-buy ticks and marks for books not on StoryGraph are saved in the browser only.** “Save a backup” is on the Reading page. They need proper saving before the site goes online.
- **Covers:** 604 of 638 shelf books have one (Open Library by ISBN and by title, then Amazon; Google Books refuses). The 34 left are mostly old books with no ISBN; a photo of the real cover would do for those.
- Covers are copied into `site/covers/` (`tools/copy_covers.py`, after `find_covers.py`), so they show at once and work offline.
- **Taskbar icon: fixed (18 Oct).** The shortcuts open the site from a small local server (http://localhost:8020, tools/serve.py, started at login) as an app window in its own Chrome profile; they carry the window’s app id, so Windows shows their icon (app-v2.ico, every size inside) on the taskbar, sharp. Reading marks or to-buy ticks made in the old window opened from the folder don’t carry over (“Save a backup” there, “Load a backup” here).
- Phone layout not done yet (laptop first).
