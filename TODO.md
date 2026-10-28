# To do

## For Jemma to decide

0. **Overnight research (23–24 Oct): `research/2026-10-overnight/README.txt`.** The 8 code fixes are in (28 Oct, her yes). 78 short blurbs and 50 page-count and date fixes are in (28 Oct; `data/description-fixes.json`, `data/detail-fixes.json`). Praise, review quotes, bestseller and award lines cut from 151 blurbs (28 Oct, her wish; cuts only, no rewording);  A few sentences mixing praise and story are left whole (e.g. Theodore Boone, Sapiens). Longer blurbs are fine (her call, 28 Oct): the held ones were checked and added (praise cut; Northern Lights given the UK blurb, not the US Golden Compass one). The 5 that were only praise have UK publisher blurbs (Amazon UK) or Open Library ones. Still waiting for her yes, in order: 9 replacement covers and 39 period jackets for the Old Book Collection (show behind an on/off switch first); 17 shelf moves and the name fixes (Pamela Cox, Riddell, J. D. Salinger); 64 to-buy entries (Blyton notes split, series gaps). The rest of the code review (`code-review/review.md`, items not in the 8 fixes) is unread by her.

1. **Things only she can check:**
   - **Raven’s Gate** (Anthony Horowitz): has she read it, does she own it? (18 Oct.) On Young Adult, tagged Not owned, until she checks.
   - **Katabasis**: just bought; tagged Not owned until she scans it in (Add a book, or Libib). Then it needs a line in `data/storygraph-links.json` or a re-import so her reading follows it.
   - **The Dance Tree**: add it in StoryGraph so it shows as read.
   - **Paper Towns** and the **Fantastic Beasts screenplay** have ebook ISBNs; the print ISBN of her copies is needed for the right cover.
   - **Reading orders I couldn’t confirm online** (18 Oct): The Quest Series 11–13 (Rebellion, Dimension, Guardian; from the books’ own covers), The Hedge Witch Series (Bringing Down the Flowers, then The Parsley Bed), The Quest for Qieta (then Memories of the Kurai), The Shetland Witch (then Stories from…), Solitaire (publication order: Solitaire, Nick and Charlie, This Winter).
2. **Same title twice, different editions.** Kept as separate books, shown under “Other copies you own”. Say if any shouldn’t be:
   - Harry Potter: several sets (1997 Bloomsbury, the 2014 set, illustrated editions, Hufflepuff edition)
   - Malory Towers and St Clare’s: newer copies on Children’s, old copies on Old Book Collection
   - Solitaire, Kitty at St Clare’s, The Tennis Term at Trebizon
3. **Titles are tidied automatically.** Anything in brackets, and a long subtitle after a colon, moves to a smaller line (e.g. “Harry Potter and the Goblet of Fire: 4/7 (Harry Potter 4)”). The Libib title is still shown on the book page. Any book can get its own title (`displayTitle` in `data/books.json`).
4. **Look:** yellows and browns since 18 Oct (walnut sidebar, cream pages, mustard gold); banners are made of each page’s own covers (her choice, 18 Oct). The shelf colours (now only the dots) are first picks.
5. **Going online** (parked): her reviews would be public unless hidden; Add a book and the reading import only work on her PC (they use the local server).

## Open

- **Reading comes from StoryGraph** (`tools/import_storygraph.py`; newest export 18 Oct). The server imports a new export from Downloads by itself. Books read but not owned sit on the genre shelves tagged Not owned (`data/elsewhere-shelves.json`). Books she only means to read stay off the shelves.
- **Covers:** 609 of 642 books have one. Old Book Collection (before 1964, no ISBN): only covers that look like old editions are kept; the rest are title cards (her call, 18 Oct; `data/no-cover.json`). Still nothing found: The Model Railway Hobby, Practical Railway Working, Harvard Classics Reading Guide, Witness (Adam E. Holton), Invasion Day Series, Dear Mr. Potter.
- **Covers still not right:** Kill Joy, As Good As Dead and Murder at the Vicarage show audiobook squares (no matching print cover found); Scion is a 3D book photo. Some fixes are in the overnight research.
- **Series covers still mixed** (no complete matching set found): Trebizon, St Clare’s (Kitty), Hogwarts Library, Cerulean Chronicles (her Somewhere Beyond the Sea is the US hardback), Notes from a Small Island. Darren Shan book 1 is the Vampire Blood omnibus, so it looks different on purpose.
- **Phone layout** not done yet (laptop first).

## Done (kept for the record)

- Duplicates, Happy Place, author names (`data/name-fixes.json`), StoryGraph links, no reading buttons, series lookups, the 12 books with no genre: all 18 Oct.
- Series covers chosen by her (Oct): Discworld boxed titles, Harry Potter by ISBN, Malory Towers, Narnia, Alex Rider, Alice Oseman, Sisterhood, Truth Dare Kiss or Promise and the rest; special editions get a Special sash.
- Taskbar icon (18 Oct): the shortcuts open http://localhost:8020 (`tools/serve.py`, started at login) as an app window with its own icon.
- 8 code fixes (28 Oct): added-book ids, reading import grouping, partial dates, safer rebuilds, server only answers this PC, backups, read counts per book, keyboard focus.
