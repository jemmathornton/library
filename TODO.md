# To do

## For Jemma to decide

0. **Overnight research (23–24 Oct), waiting for her yes: `research/2026-10-overnight/README.txt`.** In order: the 8 tested code fixes (the next added book would overwrite add0015 until fix 0001 is in); 100 blurbs and 50 detail fixes; 9 replacement covers and 39 period jackets for the Old Book Collection (show behind an on/off switch first); 17 shelf moves and the name fixes (Pamela Cox, Riddell, J. D. Salinger); 64 to-buy entries (Blyton notes split, series gaps). Also for her: reading orders listed below, Raven’s Gate, Paper Towns and the Fantastic Beasts screenplay ISBNs (ebook numbers), scan Katabasis, add The Dance Tree in StoryGraph.

1. **Raven’s Gate** (Anthony Horowitz): she isn’t sure she has read or owns it (18 Oct). On Young Adult, tagged Not owned, until she checks.
1. **Katabasis**: just bought; tagged Not owned until she scans it in (Add a book, or Libib). Then it needs a line in `data/storygraph-links.json` or a re-import so her reading follows it.
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

10. **Series: done** (18 Oct). Trebizon, the Quest books, Legacy of the Stones and Pure Dead looked up online and added.

## Open (prototype limits)

- **Reading comes from StoryGraph** (`tools/import_storygraph.py`, export from 18 Oct). Export again and import to bring in new reading. 178 of 345 StoryGraph books are on her shelves; the rest (library books, ebooks, audiobooks) sit on the genre shelves tagged Not owned (her choice, 18 Oct; shelves in `data/elsewhere-shelves.json`, my guesses for her to check). Books she only means to read stay off the shelves.
- **Covers:** 602 of 637 shelf books have one. Old Book Collection (before 1964, no ISBN): only covers that look like old editions are kept; 29 that were later reprints are title cards instead (her call, 18 Oct; data/no-cover.json). Still nothing found: The Model Railway Hobby, Practical Railway Working, Harvard Classics Reading Guide, Witness (Adam E. Holton), Invasion Day Series, Dear Mr. Potter.
- Covers are copied into `site/covers/` (`tools/copy_covers.py`, after `find_covers.py`), so they show at once and work offline.
- **Taskbar icon: fixed (18 Oct).** The shortcuts open the site from a small local server (http://localhost:8020, tools/serve.py, started at login) as an app window in its own Chrome profile; they carry the window’s app id, so Windows shows their icon (app-v2.ico, every size inside) on the taskbar, sharp. Reading marks or to-buy ticks made in the old window opened from the folder don’t carry over (“Save a backup” there, “Load a backup” here).
- Phone layout not done yet (laptop first).
1. **Covers still not right** (18 Oct): Kill Joy, As Good As Dead and Murder at the Vicarage show audiobook squares (no matching print cover found); Scion is a 3D book photo. Trebizon, Artemis Fowl, Discworld and Harry Potter have mixed designs because her copies have different ISBNs (editions); left as they are unless she says they all match.
1. **Series covers still mixed** (18 Oct; no complete matching set found yet): Trebizon (2 and 3 differ; 13 and 14 only exist in the later style), St Clare's (Kitty: no cover in the brush-lettering style found), Hogwarts Library, Cerulean Chronicles (her Somewhere Beyond the Sea is the US hardback), Notes from a Small Island. Darren Shan book 1 is the Vampire Blood omnibus, so it looks different on purpose.
1. **Reading orders I couldn't confirm online** (18 Oct, please check): The Quest Series 11–13 (Rebellion, Dimension, Guardian; from the books' own covers), The Hedge Witch Series (Bringing Down the Flowers, then The Parsley Bed), The Quest for Qieta (then Memories of the Kurai), The Shetland Witch (then Stories from…), Solitaire (publication order: Solitaire, Nick and Charlie, This Winter).
