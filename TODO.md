# To do

## For Jemma to decide

1. **12 books that never moved to a genre** (left for now, her call 18 Oct). They were only in Jemma’s Library on Libib, so they’re on “Not on a shelf yet”. Which shelf should each go on?
   - A Tale of Time City (Diana Wynne Jones)
   - Forward (Maeve Clark and others)
   - Pure Dead Brilliant and Deep Water (Debi Gliori)
   - Ptolemy’s Gate (Jonathan Stroud)
   - Poison Study, Magic Study and Fire Study (Maria V. Snyder)
   - The Most Beautiful Stories of Beatrix Potter
   - Christmas Activity Book (Catherine Bruzzone, Clare Beaton)
   - Fun to Make Paper Craft (Anna Curti)
   - Where In The Zoo Are You?
2. **Duplicates: done** (18 Oct). I’m Glad My Mom Died: one copy (the one without an ISBN is dropped, `data/removed.json`). Sourcery: two copies, both kept.
3. **Same title twice, different editions.** These are kept as separate books, shown under “Other copies you own”. Say if any shouldn’t be:
   - Harry Potter: several sets (1997 Bloomsbury, the 2014 set, illustrated editions, Hufflepuff edition)
   - Malory Towers and St Clare’s: newer copies on Children’s, old copies on Old Book Collection
   - The House in the Cerulean Sea, Solitaire, Kitty at St Clare’s, The Tennis Term at Trebizon
4. **Happy Place: done** (18 Oct), off the to-buy list (already on Adult Fiction).
5. **Titles are tidied automatically.** Anything in brackets, and a long subtitle after a colon, moves to a smaller line (e.g. “Harry Potter and the Goblet of Fire: 4/7 (Harry Potter 4)”). The Libib title is still shown on the book page. Is this OK? Any book can get its own title (`displayTitle` in `data/books.json`).
6. **Author names tidied** (18 Oct, her yes; `data/name-fixes.json`): e.g. Hans Christian Andersen, Florentyna Leow and Nina Mingya Powles (Libib had “LEOW”, “POWLES”), Shirley Barber and Phoebe Gilman added where Libib had no author, Anonymous dropped from The Familiar, Hwang Bo-reum filed under Hwang. Check any you’re not sure of.
7. **Look:** yellows and browns since 18 Oct (walnut sidebar, cream pages, mustard gold); banners are made of each page’s own covers (her choice, 18 Oct). The shelf colours (now only the dots) are first picks.
8. **StoryGraph links: done** (18 Oct). Northern Lights, The Subtle Knife and The Amber Spyglass count as read (The Golden Compass and the boxed set on StoryGraph, linked by hand in data/storygraph-links.json, British titles shown); both Fantastic Beasts copies read; Fun and Games at Malory Towers spelt right and read. Wicked stays linked to the Wicked Years boxed set.
9. **No buttons: done** (18 Oct). Read or not read comes only from StoryGraph; book pages show it, nothing to click.

10. **Series to add** (order not sure): Trebizon, the Quest books (Lisa Wright DeGroodt), Legacy of the Stones, Pure Dead. Tell me the order, or say leave them.

## Open (prototype limits)

- **Reading comes from StoryGraph** (`tools/import_storygraph.py`, export from 18 Oct). Export again and import to bring in new reading. 178 of 345 StoryGraph books are on her shelves; the rest (library books, ebooks, audiobooks) show only in the Reading log and search, never on the shelves (her rule, 18 Oct).
- **Covers:** 602 of 637 shelf books have one. Old Book Collection (before 1964, no ISBN): only covers that look like old editions are kept; 29 that were later reprints are title cards instead (her call, 18 Oct; data/no-cover.json). Still nothing found: The Model Railway Hobby, Practical Railway Working, Harvard Classics Reading Guide, Witness (Adam E. Holton), Invasion Day Series, Dear Mr. Potter.
- Covers are copied into `site/covers/` (`tools/copy_covers.py`, after `find_covers.py`), so they show at once and work offline.
- **Taskbar icon: fixed (18 Oct).** The shortcuts open the site from a small local server (http://localhost:8020, tools/serve.py, started at login) as an app window in its own Chrome profile; they carry the window’s app id, so Windows shows their icon (app-v2.ico, every size inside) on the taskbar, sharp. Reading marks or to-buy ticks made in the old window opened from the folder don’t carry over (“Save a backup” there, “Load a backup” here).
- Phone layout not done yet (laptop first).
