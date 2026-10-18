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
6. **Libib name mistakes**, e.g. “Hans Christian Anders a”, “Anonymous” as an author of The Familiar, Korean names sorted by given name. Fix as you spot them, or should I go through them?
7. **Look:** the colours for each shelf and the dark green sidebar are first picks.

## Open (prototype limits)

- **Reading marks and to-buy ticks are saved in the browser only.** Use “Save a backup” on the Reading page. They need proper saving before the site goes online (or `data/reading.json` read in by the build).
- **Covers:** 459 of 638 books have one, from Open Library. Google Books refused today (too many requests): run `tools/find_covers.py` again another day for the 109 still untried. About 70 books have no ISBN, so no cover can be looked up for them.
- Covers are copied into `site/covers/` (`tools/copy_covers.py`, after `find_covers.py`), so they show at once and work offline.
- Phone layout not done yet (laptop first).
