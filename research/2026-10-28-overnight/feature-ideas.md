# Feature ideas for the library (28 Oct 2026)

I read the app (`site/js/app.js`, `site.css`), `data/`, `TODO.md` and the 23 Oct research but changed nothing. The ideas are ranked, most useful first.

- **Effort:** small = a few hours, medium = about a day, large = several days.
- **Her data:** things only she can enter.

Each would go in as a trial behind the switch bottom right first. That switch only holds New covers now, so it would become a short list of trials, one line each.

## Top five

### 1. Next in the series
- **What:** a "Next in your series" row on the To read page. For every series she's part-way through, it shows the first book she hasn't read, split into "On your shelves" and "Not on your shelves". On the page of the last book she read in a series, a "Next: Knife Edge" line (small cover, links to it) goes under the "Book 1 of Noughts & Crosses" line that's already there.
- **Why:** the 23 Oct reading check found 12 series where the next book is already on her shelves, for example Noughts & Crosses 2, Shades of Magic 2, Winternight 3, Tyrant Philosophers 2, Neapolitan 2 and Mortal Engines 2. It found 7 where she doesn't own it, such as Bobiverse 5, Hierarchy 2 and Before Your Memory Fades. Right now she has to work all this out shelf by shelf.
- **Effort:** small. Everything is in the data already: the order in `series.json` plus her reading.
- **Her data:** none.
- **Rules:** she chose no Series page (18 Oct), so this stays on To read and on book pages, with no page of its own. `series.json` only holds orders that are sure, so the orders in TODO she hasn't confirmed (Quest 11–13, Hedge Witch and others) wait for her answers.

### 2. Her reading year, on Stats
- **What:** year chips on Stats (2024 · 2025 · 2026). Picking a year shows:
  - books finished, pages and average stars
  - her 5★ books that year
  - first and last finish, longest and shortest book
  - the split between print, audiobook and ebook
  - shelves, re-reads, and authors new to her that year
  - her own books against ones she doesn't own
  - month by month
  - a timeline strip of each book from start to finish, which shows when she had three on the go
- **Why:** 2025 was her 100-book year. Stats now only shows this year's months and a count per year. All 100 of 2025's reads have both start and finish days, so the timeline works.
- **Effort:** medium.
- **Her data:** none.
- **Rules:** this is the Stats page, so percentages are allowed. Plain labels only ("Longest book", "First finish"), with no written summary of her year. 2026 is still going, so it's labelled "so far".

### 3. A hunting list to print
- **What:** a print-ready version of To buy, grouped by series and author. Each book has:
  - the wanted edition's cover, so she can spot a boxed-title Corgi Discworld or an old Dragon Trebizon on a charity-shop shelf
  - the ISBN where known
  - the publisher and year of the edition she wants
  - "You have a newer copy" where she owns the book in another edition (Malory Towers First and Last Term, the old Blytons)

  It comes in two sizes: A4, and an A5 to fold and carry. A "Print" link on To buy opens it.
- **Why:** much of her list is hunting for particular editions in second-hand shops (original paperbacks, old Blytons, Old Kingdom hardbacks), where the exact look matters. Phone layout is parked, but paper works now.
- **Effort:** small to medium: a print stylesheet and one page. Most of the covers are already there.
- **Her data:** none. It works much better once the 64 to-buy additions waiting in TODO are in: the Blyton notes split into one entry per book, the series gaps, and their 43 covers. Today "Famous Five old except …" is one note, not eight books.
- **Rules:** the covers are the publishers' own, which is fine. Her reviews and reading stay off it, so a copy can also go to family as a gift list.

### 4. Smarter "What should I read next?"
- **What:**
  - With "Anything unread on my shelves", it skips a book when an earlier book in the same series is unread too, and offers the earlier one instead.
  - The first menu gets more choices:
    - "Next in a series I've started"
    - "Short (under 250 pages)"
    - "A favourite to read again" (her 4½★ and 5★ books, read before this year)
    - "By an author I rate highly"
- **Why:** 185 of her unread books are later books in a series whose earlier book is also unread (Famous Five, Darren Shan, Pendragon…). So today the picker can offer Famous Five 14.
- **Effort:** small.
- **Her data:** none.
- **Rules:** it only picks. Nothing marks a book as read or to read (no reading buttons).

### 5. Notes on her own copy (old books and special editions)
- **What:** a "This copy" panel on a book page, in her own words:
  - an inscription or prize label, and previous owners
  - a bookplate, or whether it's signed
  - first edition or impression, and whether the dust jacket is there
  - condition
  - where and when she got it, and what she paid

  Her own photos (the inscription, the spine, the book) show as she took them. The Old Book Collection shelf gets a small "Has notes" filter.
- **Why:** the Old Book Collection (66 books: Meade and Angela Brazil school stories, 1940s Blytons, an 1869 Bleak House) is about the copies, not the titles. None of that is recorded anywhere now: the notes and price columns in her catalogue export are empty. It would also supply the values for idea 7.
- **Effort:** medium: a data file, the panel and the photos. If she'd rather type than tell Claude, add a little form through the local server, like Add a book.
- **Her data:** yes, all of it, one book at a time, and only where she has something to say.
- **Rules:**
  - Her words only, never tidied. Photos aren't cropped.
  - If the site goes online, inscriptions can name real people, so hide them in any public copy.

## The rest

### 6. Search that finds more
- **What:** the search box also finds:
  - series names
  - special editions ("Illumicrate")
  - publishers ("Corgi", "Dragon")
  - years
  - words in her reviews and in blurbs, listed after the title matches
- **Why:** search only looks at the catalogue's own title, the author and the ISBN. "Discworld" finds 26 of her 47 Pratchetts, "Famous Five" 22 of her 34 Five books, and "Illumicrate" none (that's kept in `editions.json`).
- **Effort:** small.
- **Her data:** none.
- **Rules:** none. Reviews are private if it ever goes online, but that's already true.

### 7. Printable list of everything (for insurance)
- **What:** a print-ready page of every book, shelf by shelf: title, author, edition, publisher, year, ISBN, and the special-edition and old-book marks. A CSV of the same goes into the weekly backup. Optionally, a "Paid" or "Worth" column for books she gives values to, with a total on Stats.
- **Why:** a dated list with ISBNs is what an insurer asks for after a fire or flood. It's also a copy that doesn't depend on any outside service.
- **Effort:** small for the list, medium with values.
- **Her data:** values only, and only where she wants them.
- **Rules:** no value guesses pulled from shop sites (that would need scraping). The total goes on Stats.

### 8. "Worth buying?" on To buy
- **What:** two plain rows under the list. One has the next books of series she's reading that aren't on her shelves or her list (Bobiverse 5, Hierarchy 2, Before Your Memory Fades…). The other has books she gave 4½★ or 5★ but doesn't own, about 11, for example The Will of the Many, Addie LaRue, three Narnias and A Good Girl's Guide to Murder. Nothing goes on the list unless she adds it.
- **Why:** her to-buy list is made by hand, and these are the obvious candidates from her own reading.
- **Effort:** small.
- **Her data:** none.
- **Rules:** plain labels only.

### 9. Lent to
- **What:** a "Lent to Sarah, 3 Sep" band on the cover and the book page, plus a short list on To read of what's out and since when.
- **Why:** it's easy to forget who has which book, especially the special editions.
- **Effort:** small.
- **Her data:** yes, a name and a date each time she lends one (she tells Claude, or a small form through the local server).
- **Rules:** only worth it if she lends books. Friends' names would be on the site, so they're left out of any online copy.

### 10. Where it goes on the shelf
- **What:** a line in the book page's Details: "Fantasy, between Mort and Sourcery", from the author-surname order the site already uses. It's handiest straight after Add a book or Got it.
- **Why:** she chose the surname order "like a real bookcase", so this tells her where a new book goes on her real shelves.
- **Effort:** small.
- **Her data:** none.
- **Rules:** only useful if her real shelves follow the same order. That's her call.

### 11. Where each book lives
- **What:** a "Where" line (room, bookcase, box), set for a whole shelf or series with exceptions. For example, "Old Book Collection: glass cabinet, living room".
- **Why:** worth it only if her books are in more than one room or in storage.
- **Effort:** small to medium.
- **Her data:** yes, but in bulk: about a dozen lines, not 640.
- **Rules:** the place names are her words.

### 12. More collection facts on Stats
- **What:**
  - oldest book, longest book, and most copies of one book
  - how many special editions
  - series she owns all of (47 of 82) and has read all of (21)
  - books added each month since the July 2025 scan-in
- **Effort:** small.
- **Her data:** none.
- **Rules:** Stats only.

### 13. A backup copy off this computer
- **What:** the weekly backup also copies its zip to her OneDrive folder (or to a USB stick when one is plugged in), keeping the newest 4 there.
- **Why:** all 8 backups are on the same disk as the library (finding 20 of the 23 Oct review). If that disk dies, both go.
- **Effort:** small.
- **Her data:** none, but she has to say yes to where it goes, because it writes into her own OneDrive folder.
- **Rules:** no notices on the site about backups. Problems go in the log as now.

### 14. "More than one copy" filter
- **What:** a way to list every book she owns more than once. There are dozens: 54 books in series alone (several Harry Potter sets, old and new Blytons, Beedle the Bard, Fantastic Beasts).
- **Why:** it would help her decide what to keep or let go, and she's already getting rid of some. The "Other copies you own" row only shows on each book's own page.
- **Effort:** small.
- **Her data:** none.
- **Rules:** the shelf toolbar already has 8 filter chips, so this might sit better as a list on Stats.

## Left out, and why

- **Reading streaks:** her reading export only has start and finish dates, not the days she read, so a day-by-day streak can't be worked out. A "months in a row" count is possible but adds little.
- **Price watch:** it needs scraping shop sites or accounts and keys (AbeBooks, eBay, Amazon), which goes against their terms and breaks often. If she wants something here, plain "look for it" search links on each to-buy book (AbeBooks, eBay, World of Books) are small and break nothing.
- **Backup reminders on the site:** the weekly backup already runs by itself, and she doesn't want system notices. Idea 13 covers the real gap.
- **Duplicate-edition finder:** already done, in the 23 Oct audit and the "Other copies you own" row. Idea 14 is the only part left.
- **Series completion page:** she chose no Series page (18 Oct). Ideas 1 and 3 do the same job in place.
- **Picking by mood:** moods only exist for books she has already read.
- **"Unread on your shelves longest":** 514 of the 642 books share the July 2025 scan-in date, so the order would mean nothing.
- **Marking childhood reads** (79 Blytons with no record): reading only comes from her tracker, so she'd add them there.
