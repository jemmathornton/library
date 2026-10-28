# Reading data check (StoryGraph export of 18 Oct 2026, against her shelves)

Read-only check. Nothing in `HomeLibrary` was changed. Full lists are in `reading.json` next to this file (`series_map` there shows every series position: owned copies and reading status).

Numbers: 345 StoryGraph entries (241 read, 95 to-read, 4 stopped, 3 reading, 2 paused). 642 owned books (books.json + added.json minus removed.json); 211 have a reading record and 431 don't.

## 1. Unlinked StoryGraph books that she might own

149 entries have no shelf link (83 to-read, 59 read, 7 stopped/reading/paused). I checked each one against every owned book by fuzzy title, by surname and by ISBN, and also against everything else by the same author.

**Result: no missed matches.** The importer's links hold up. Every unlinked read book is one she doesn't own: Narnia, Twilight, Christie, Holly Jackson, Kawaguchi, ebooks and audiobooks.

- **Harry Potter Series Box Set** (read, 5★): high confidence it's the same reads as her HP 1–7, which are already linked through their own entries. It's a duplicate, not a missing link.
- Near misses that **aren't** matches (other book, same author): *Mortal Engines* (she owns books 2–3 and *Fever Crumb*; book 1 is on her to-buy list as a hardback), *Raven's Gate* (she owns Alex Rider, a different series), *The Will of the Many* (she owns Licanius, not Hierarchy), *Tales Told in Oz* (she owns all four Wicked Years).
- Surnames that collide (different authors): Lewis (C.S. and Shady), Green (Hank and John), Miller (Arthur and Madeline), Taylor (Brandon and Dennis E.), Lee (Harper, Fonda and Miye).

## 2. To-read books she doesn't own (83)

Ones with a link to her shelves or her reading:

| Title | Author | Why it's interesting |
|---|---|---|
| Not Till We Are Lost | Dennis E. Taylor | Bobiverse 5. She owns and has read 1–4 (4.7★ average) |
| The Strength of the Few | James Islington | Hierarchy 2. Book 1, *The Will of the Many*, got 5★. She owns 3 Islingtons (4.75★ average) |
| Scion | James Islington | Same author as above |
| Truly Devious | Maureen Johnson | **Already on to-buy** ("Truly Devious series"). She owns 4 by Johnson |
| Tales Told in Oz | Gregory Maguire | Wicked Years companion. She owns all four (only *Wicked* read so far) |
| Compulsory | Martha Wells | Murderbot short story. She owns Murderbot 1–4 (*All Systems Red* is on her to-read) |
| Home: Habitat, Range, Niche, Territory | Martha Wells | Murderbot novella, as above |
| Half His Age | Jennette McCurdy | She owns *I'm Glad My Mom Died* and gave it 5★ |
| The Mirror of Her Dreams | Stephen R. Donaldson | She owns Thomas Covenant (not read yet) |
| 10 Minutes 38 Seconds in This Strange World | Elif Shafak | She owns *The Island of Missing Trees* (also to-read) |
| Kindred | Octavia E. Butler | She gave *Dawn* 4.5★ |
| The Adventures of Amina Al-Sirafi | Shannon Chakraborty | She gave *The City of Brass* 4★ |
| Pride (Miners' Strike) | Tim Tate | **Already on to-buy** |
| The Night Circus | Erin Morgenstern | **Already on to-buy** |
| Stone Hunger / The Fifth Season | N.K. Jemisin | Two Jemisins on her to-read |
| Blood Over Bright Haven / The Sword of Kaigen | M.L. Wang | Two by one author |
| Earthlings / Convenience Store Woman | Sayaka Murata | Two by one author |
| Capitalists Must Starve / A Magical Girl Retires | Park Seolyeon | Two by one author |
| Kaikeyi / We Dance Upon Demons | Vaishnavi Patel | Two by one author |

The other ~60 have no link to anything she owns or has read. Six are old 2013 entries: *The Book Thief*, *Les Misérables*, *Numbers*, *Anna Karenina*, *Death of a Salesman* and *The Princess Bride*. The full list is in `reading.json` → `2_to_read_not_owned`.

To-buy items **not** on her StoryGraph to-read: *A Man Called Ove*, *Small Things Like These*, *Threadneedle*, *Reboot*, *You and Me on Vacation*, and the Pratchett, Blyton and Nix edition upgrades.

Owned but still marked to-read (12): *The Paris Apartment*, *Happy Place*, *All Systems Red*, *A Visit From the Goon Squad*, *The Island of Missing Trees*, *Girl, Woman, Other*, *The Last Little Blue Envelope*, *If I Stay*, *Notes from a Small Island*, *Son of a Witch*, *The Bee Sting* and *The Help*.

## 3. Owned with no reading record, worth checking

No series has a gap *before* a book she has read. Every gap comes after the last book read.

**Series she's partway through, owning the rest unread:**
- **Heartstopper** 3–5 (1–2 read, 4★)
- **Sisterhood of the Traveling Pants** 2–4 (1 read)
- **Noughts & Crosses** 2–5 (1 read, 5★)
- **Shades of Magic** 2–3 (1 read, 4.5★)
- **Neapolitan Novels** 2–4 (1 read)
- **Wicked Years** 3–4 (2 is to-read)
- **Mortal Engines** 2–3 (1 read elsewhere)
- **Winternight** 3 (1–2 read)
- **Legacy of the Stones** 4–5 (1–3 read)
- **Tyrant Philosophers** 2–3 (1 read)
- **Simon Snow** 2 (1 read)
- **We Were Liars** 2 (*Family of Liars*)
- **Harry Potter** 8 (*Cursed Child*)
- **13 Little Blue Envelopes** 2 (to-read)
- **Jacqueline Wilson**: she has read 6 (*Girls* 1–4 among them). Her copies of *Lola Rose*, *Love Lessons* and *Worry Website* have no record

**Childhood series with nothing logged, probably read years ago:**
- **Enid Blyton**: 79 owned with no record (45 Children's, 34 Old Book Collection). The Famous Five (12), Secret Seven (8), Adventure Series (8) and Wishing Chair (2) have nothing logged at all. Malory Towers and St Clare's are logged
- **Darren Shan**: Saga (12), Demonata (10) and Larten Crepsley (1)
- **Cathy Hopkins**: Mates, Dates (12) and Truth, Dare… (8)
- **Pendragon**: 10 + 3 Before the War
- **Trebizon**: 12
- Also nothing logged: Artemis Fowl (6), Alex Rider (5), Uglies (4), Brambly Hedge (4), Inheritance (3), Wind on Fire (3), Doomspell (3), Edge Chronicles, Theodore Boone (7), Discworld (33 owned)
- Single classics: *Alice's Adventures Under Ground*, *Black Beauty*, *Heidi*, *Just William*, *Tom's Midnight Garden*, *My Naughty Little Sister*, *Ballet Shoes*

## 4. Reading-data oddities

- **Finish date before start: none. Dates in the future: none. Stars on books not marked read: none.**
- **Read with no dates: 68.** Almost all came over in the 2013 bulk add or the 2020, 2023, 2024 and Jan 2025 back-fills: HP, Narnia, Twilight, Hunger Games, Bobiverse, John Green and so on.
- **41 read books have no stars.** Mostly Blyton and Pamela Cox.
- **Duplicate entries (13 pairs):**
  - HP 2, 3, 4, 5, 6 and 7 each appear twice (2013 and 2023 adds). Usually only one copy has stars.
  - Bobiverse 1–3 and *Heaven's River* each appear twice (2020 and 2025, probably re-reads).
  - *Worm* twice (both 5★).
  - *Paper Towns* twice (paperback and hardcover).
  - *Murder at the Vicarage*: hardcover with no dates, and audio 27 Apr–5 May 2025 with 4★. Probably one read.
  - Box sets on top of single books: *His Dark Materials Boxed Set* plus *The Golden Compass* both link to her *Northern Lights*. *Harry Potter Series Box Set* overlaps HP 1–7.
- **Read count doesn't match the dates (15):**
  - The Quest books (13), *Girls in Love* and *All the Lonely People* say "read 2 times" but only one read has dates. The earlier read is undated.
- **Dates the import misreads:**
  - Six books are dated just "2024", which the import keeps as a start date "2024-2024": *Turtles All the Way Down*, *Fangirl*, *Hyunam-dong Bookshop*, *Tomorrow ×3*, *Callista Alignment* and *Tiny Moons*.
  - Single-date reads (*Casual Vacancy* 2014, *Life of Pi* 2013, *Fault in Our Stars* 2013) are kept as starts with no finish.
  - Neither breaks anything, but they show as unfinished reads in the data.
- **Libib vs StoryGraph:** Libib only ever recorded one status: *A Story for Every Day of Winter* "In progress". StoryGraph has it as **read**. No book is read in Libib but not in StoryGraph.
- Statuses: 3 reading (*A Place in the World*, *I Bet You'd Look Good in a Coffin*, *A Degree of Love*), 4 stopped (*Wolfsong*, *Assistant to the Villain*, *Sapiens*, *Hooked*; *Hooked* was paused, she changed it) and 2 paused (*Ward*, *The Secret History*).

## 5. Reading profile (her own data only)

- **Pace of reading:** 92 dated reads in 2025, 70 so far in 2026, 68 undated older reads.
- **Stars:** 200 rated, average **3.9★**. Most common is 4★ (66). 29 got 5★. The low ones are rare and pointed: the Twilight saga and *Pride and Prejudice* got 1★.
- **Shelves read (and average stars):**

  | Shelf | Read | Average |
  |---|---|---|
  | Adult Fiction | 81 | 3.8★ |
  | Fantasy | 64 | 4.0★ |
  | Children's | 29 (mostly unrated re-reads) | |
  | Young Adult | 26 | 3.7★ |
  | Science Fiction | 19 | **4.3★** (her highest-rated shelf) |
  | Non-Fiction | 13 | 4.0★ |
  | Dystopia | 6 | 4.0★ |

- **Moods** (91 books tagged):
  - Most common: emotional (55), mysterious (35), then dark, lighthearted and reflective (24 each)
  - **Rated highest:** adventurous 4.4★, inspiring 4.4★, tense 4.3★, sad 4.2★
  - **Rated lowest:** lighthearted 3.75★ and funny 3.7★
- **Pace of books:** mostly medium (61). Fast books score best (4.3★, only 9), slow ones lowest (3.75★).
- **Characters:** she rates books higher when the characters are lovable (4.2★ against 2.9★ when they're not), when they develop strongly (4.2★ against 3.3★) and when they're diverse (4.1★ against 3.7★).
- **Length:** owned books she has read average 303 pages (median 304).
- **Formats by year:**

  | Year | Paperback | Hardcover | Audio | Digital |
  |---|---|---|---|---|
  | 2025 | 60 | 20 | 8 | 4 |
  | 2026 | 37 | 10 | 17 | 6 |

  Audiobooks have doubled this year (Holly Jackson, Katy Brent, Kawaguchi, non-fiction).
- **Top authors** (2+ rated):
  - Wildbow 5★
  - Mike Gayle, James Islington, TJ Klune and Andy Weir 4.75★
  - J.K. Rowling 4.7★ (9 rated)
  - Dennis E. Taylor 4.7★
  - Matt Haig and V.E. Schwab 4.5★
  - John Green 4.2★
  - Lisa Wright DeGroodt 4.2★ (13 rated)
  - Taylor Jenkins Reid 4.2★
- **Most read:** Blyton/Cox (21), Rowling (16), DeGroodt (13), then C.S. Lewis, John Green and Dennis E. Taylor (8 each).
- **Pointers for "what next", from this data alone:**
  - Her best-rated vein is warm, emotional, hopeful speculative fiction: Klune, Haig, Gayle, the Kawaguchi/Aoyama/Hwang "healing" books.
  - Next is big plot-driven sci-fi and fantasy: Islington, Bobiverse, Weir, Worm.
  - Unfinished series she owns are the quickest wins: Heartstopper 3–5, Shades of Magic 2–3, Noughts & Crosses 2–5, Tyrant Philosophers 2–3.
  - Next books to buy: Bobiverse 5, Hierarchy 2.
