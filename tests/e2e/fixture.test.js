// Page tests on a small MADE-UP library (tests/fixture_library.py, built by the real build; toolkit in harness.js).
// Every book here is invented, so each answer is known exactly and nothing depends on her own books. The first part
// tests the page code's pieces directly (fixed inputs, fixed answers); the rest drives the pages.
const Y = String(new Date().getFullYear()), LAST = String(new Date().getFullYear() - 1);
const B = id => { const b = bookIndex[id]; ok(b, `no made-up book ${id}`); return b; };
const away = title => { const e = SG.books.find(x => x.title === title); ok(e, `no made-up reading of ${title}`); return e; };

// ---------- titles (tidyTitle) ----------
test("tidyTitle: bits in brackets move under the title", async () => {
  eq(tidyTitle("Harry Potter and the Goblet of Fire: 4/7 (Harry Potter 4)"), {t: "Harry Potter and the Goblet of Fire", sub: "Book 4 · Harry Potter 4"});
  eq(tidyTitle("The Bear and The Nightingale: (Winternight Series)"), {t: "The Bear and The Nightingale", sub: "Winternight Series"});
  eq(tidyTitle("A Quiet Book (5)"), {t: "A Quiet Book", sub: "Book 5"});
  eq(tidyTitle("Mort (Discworld: Bk. 4)"), {t: "Mort", sub: "Discworld"});
});

test("tidyTitle: two bits in brackets stay in the order the title has them", async () => {   // fixed 19 Nov
  eq(tidyTitle("Mort (Discworld 4) (Corgi Classics)").sub, "Discworld 4 · Corgi Classics");
  eq(tidyTitle("We Are Legion (We Are Bob): Volume 1 (Bobiverse)").sub, "We Are Bob · Volume 1 · Bobiverse");
});

test("tidyTitle: a numbered series title is split, but a title ending in a number before the colon stays whole", async () => {
  eq(tidyTitle("Famous Five: 1: Five On A Treasure Island"), {t: "Five On A Treasure Island", sub: "Famous Five 1"});
  eq(tidyTitle("Famous Five 9: Five Fall Into Adventure"), {t: "Famous Five 9: Five Fall Into Adventure", sub: ""});
  eq(tidyTitle("Waywalkers: Number 1 in series"), {t: "Waywalkers", sub: "Book 1"});
  eq(tidyTitle("Foundation: 1/3"), {t: "Foundation", sub: "Book 1"});
});

test("tidyTitle: prize blurbs, formats and imprints are dropped, not shown", async () => {
  eq(tidyTitle("Autumn: Longlisted for the Man Booker Prize 2017"), {t: "Autumn", sub: ""});
  eq(tidyTitle("Some Book: Shortlisted for the Costa Award (Hardback)"), {t: "Some Book", sub: ""});
  eq(tidyTitle("Circe (Paperback)"), {t: "Circe", sub: ""});
  eq(tidyTitle("Dune (Gollancz S.F.)"), {t: "Dune", sub: ""});
  eq(tidyTitle("The Long Way Paperback"), {t: "The Long Way", sub: ""});
});

test("tidyTitle: a long subtitle after a colon moves under; a one-word title keeps its subtitle", async () => {
  eq(tidyTitle("Northern Lights: His Dark Materials"), {t: "Northern Lights", sub: "His Dark Materials"});
  eq(tidyTitle("Sapiens: A Brief History of Humankind"), {t: "Sapiens: A Brief History of Humankind", sub: ""});
});

test("tidyTitle: Amazon’s “by X ( Author )” tail, run-together “TheTitle” and double spaces are put right", async () => {
  eq(tidyTitle("The Testing Kind by Ann Writer ( Author ) ON 3 May 2010").t, "The Testing Kind");
  eq(tidyTitle("TheHobbit").t, "The Hobbit");
  eq(tidyTitle("  Moon   Harbour ").t, "Moon Harbour");
});

// ---------- series (titleKeys, matchSeries) ----------
test("titleKeys: the whole title counts most, then without its number, then after the colon, then before it", async () => {
  const k = titleKeys("Artemis Fowl: The Eternity Code");
  eq([k.get(tkey("Artemis Fowl: The Eternity Code")), k.get(tkey("The Eternity Code")), k.get(tkey("Artemis Fowl"))], [4, 2, 1]);
  eq(titleKeys("Mort: Book 4").get(tkey("Mort")), 3);
  eq(titleKeys("3. The Thing").get(tkey("The Thing")), 3);
  eq(titleKeys("Five on a Treasure Island (Famous Five 1)").get(tkey("Five on a Treasure Island")), 4);
});

test("titleKeys: “&”, doubled letters and capitals don’t stop a match", async () => {
  eq(tkey("Harry & Sally"), tkey("harry and sally"));
  eq(tkey("Malory Towers"), tkey("Mallory Towers"));
});

test("series: a book goes to the entry its whole title fits, not the part before a colon", async () => {
  const h = seriesOf["fx-marlowe2"];
  eq(h && h.map(x => [x.series.name, x.entry.n]), [["Kit Marlowe", 2]]);
  eq(seriesOf["fx-owl2"].map(x => [x.series.name, x.entry.n]), [["Owl Trilogy", 2]]);
  eq([seriesOf["fx-owl1"][0].entry.n, seriesOf["fx-owl1b"][0].entry.n], [1, 1]);
});

test("series: only the series’ own authors count, and to-buy books fill their places", async () => {
  ok(!seriesOf["ch-puddle"], "Puddle Jumpers (same author as a series, no title match) put in a series");
  ok(!seriesOf["fx-moon"], "a book in no series put in one");
  const tw = SERIES.find(s => s.name === "Testwood");
  eq(tw.entries.map(e => e.owned.map(b => b.id).sort()), [["ch-testwood", "old-t1"], [], ["old-t3"], [], []], "owned:");
  eq(tw.entries.map(e => e.wish.map(w => w.id)), [[], [], [], ["buy-last-testwood"], ["buy-testwood-again"]], "to buy:");
  eq(SERIES.find(s => s.name === "Owl Trilogy").entries[2].wish.map(w => w.id), ["buy-paper-owl"]);
});

test("series: a book shows the series’ own title, with the series, its number and any edition under it", async () => {
  eq([B("fx-owl2").t, B("fx-owl2").sub], ["The Iron Owl", "Owl Trilogy, book 2"]);
  eq([B("fx-owl1b").t, B("fx-owl1b").sub, B("fx-owl1b").edition], ["The Glass Owl", "Owl Trilogy, book 1 · Illumicrate Edition", "Illumicrate Edition"]);
  eq([B("fx-owl1").t, B("fx-owl1").sub], ["The Glass Owl", "Owl Trilogy, book 1"]);
  eq(B("fx-display").t, "Crown of Winter", "her own displayTitle:");
});

// ---------- one book, several copies (bookKey, joinCopies) ----------
test("bookKey: copies of one book share a key; the same title by someone else doesn’t", async () => {
  eq(bookKey(B("fx-owl1")), bookKey(B("fx-owl1b")), "a special edition in a series:");
  eq(new Set(["fx-moon", "fx-moon2", "add0001", "add0002"].map(i => bookKey(B(i)))).size, 1, "four Moon Harbours:");
  eq(bookKey(B("ch-testwood")), bookKey(B("old-t1")), "a modern and an old copy:");
  ok(bookKey(B("fx-lonely2")) !== bookKey(B("fx-other-lonely")), "Lonely Hill by two authors made one book");
  ok(bookKey(B("fx-owl1")) !== bookKey(B("fx-owl2")), "books 1 and 2 made one book");
});

test("bookKey: an edition note under the title doesn’t make another book", async () => {
  eq(B("fx-lonely").sub, "Collector's Edition");
  eq(bookKey(B("fx-lonely")), bookKey(B("fx-lonely2")));
});

test("all copies of a book share one reading record", async () => {
  ok(["fx-moon", "fx-moon2", "add0001", "add0002"].every(i => isRead(B(i))), "a copy of Moon Harbour isn’t read");
  eq([reading(B("add0002")).readCount, reading(B("add0002")).rating], [3, 4.5]);
  ok(isRead(B("fx-lonely")), "the Collector’s Edition didn’t get its reading");
  ok(!isRead(B("fx-other-lonely")), "the other author’s Lonely Hill got it");
});

test("a book read elsewhere that StoryGraph lists twice shows once, with both readings", async () => {
  eq(ELSEWHERE.map(e => e.title), ["Borrowed Tale", "Someday Story", "Library Loan", "Second Wind"]);
  eq(finishes(away("Library Loan")), [`${LAST}-08-08`, `${Y}-01-15`]);
});

test("a book being read again keeps its earlier finish in this year’s count and History", async () => {   // fixed 19 Nov
  ok(finishedIn(Y).includes(`${Y}-01-20`), "Second Wind’s January finish isn’t counted in " + Y);
  await go("#history");
  ok($$("details.year", view()).some(d => $("summary h2", d).textContent.startsWith(Y) && d.textContent.includes("Second Wind")), "not in " + Y + " on History");
});

// ---------- reading (sgMerged, counts) ----------
test("sgMerged: the furthest-on status wins, and dates, stars and reviews are joined", async () => {
  const a = {id: "r-a", status: "read", finished: "2023-01-05", dates: [["2023-01-01", "2023-01-05"]], rating: 4, review: "Good", format: "paperback", moods: "dark", readCount: 1};
  const b = {id: "r-b", status: "reading", finished: "", started: "2024-02-01", dates: [["2024-02-01", null]], format: "audio"};
  const m = sgMerged([a, b]);
  eq([m.status, m.started, m.finished, m.rating, m.readCount, m.moods, m.key], ["reading", "2024-02-01", "2023-01-05", 4, 1, "dark", "r-a"]);
  eq(m.dates, [["2023-01-01", "2023-01-05"], ["2024-02-01", null]]);
  eq(m.reviews, ["Good"]);
});

test("sgMerged: a re-read counts each finish; stars and format come from the latest reading", async () => {
  const c = {id: "r-c", status: "read", finished: "2020-06-01", dates: [["2020-05-01", "2020-06-01"]], rating: 3, format: "paperback"};
  const d = {id: "r-d", status: "read", finished: "2024-03-01", dates: [["2024-02-01", "2024-03-01"]], rating: 5, format: "digital", readCount: 1};
  const m = sgMerged([d, c]);
  eq([m.status, m.finished, m.rating, m.readCount, m.format], ["read", "2024-03-01", 5, 2, "digital"]);
  eq(m.dates.map(x => x[1]), ["2020-06-01", "2024-03-01"], "dates in order:");
  eq(sgMerged([{id: "r-e", status: "read", readCount: 3, dates: [["2021-01-01", "2021-01-09"]]}]).readCount, 3, "StoryGraph’s own read count:");
});

test("isUnread: only books not started, or only meant to be read, are waiting", async () => {
  eq(["fx-sunless", "fx-quiet", "fx-lantern", "fx-moon", "fx-unread", "fx-toread"].map(i => isUnread(B(i))), [false, false, false, false, true, true]);
});

test("booksRead and booksUnread count each book once, however many copies", async () => {
  eq(booksRead(["fx-moon", "fx-moon2", "add0001", "add0002", "fx-lonely", "fx-lonely2"].map(B)), 2);
  eq(booksUnread(["fx-owl1", "fx-owl1b", "fx-owl2"].map(B)), 2);
  eq(booksUnread(["ch-testwood", "old-t1"].map(B)), 1, "a modern and an old copy:");
  eq([booksRead(BOOKS), booksUnread(BOOKS)], [2, 14], "the whole made-up library:");
});

// ---------- dates and text ----------
test("niceDate and year read whole dates only, partial ones give the year", async () => {
  eq([niceDate("2024-03-05"), niceDate("2024-03"), niceDate(""), niceDate(undefined)], ["5 March 2024", "", "", ""]);
  eq([year("2024-03"), year("2024"), year(""), year(null)], ["2024", "2024", "", ""]);
});

test("dateRange: one year, across years, partial dates, started only", async () => {
  eq(dateRange(["2024-01-02", "2024-01-20"]), "2 Jan – 20 Jan 2024");
  eq(dateRange(["2023-12-30", "2024-01-02"]), "30 Dec 2023 – 2 Jan 2024");
  eq(dateRange(["2024-09", "2024-10-01"]), "Sep – 1 Oct 2024");
  eq(dateRange(["2024", "2024-10-01"]), "2024 – 1 Oct 2024");
  eq(dateRange(["2024-05-01", null]), "Started 1 May 2024");
  eq(dateRange([null, "2024-05-03"]), "3 May 2024");
  eq(dateRange(["2024-05-03", "2024-05-03"]), "3 May 2024");
  eq(dateRange([null, null]), "");
});

test("curly: apostrophes, quotes and the ’90s are curled", async () => {
  eq(curly("It's the '90s"), "It’s the ’90s");
  eq(curly("'Hello,' she said"), "‘Hello,’ she said");
  eq(curly('He said "hello" ("twice")'), "He said “hello” (“twice”)");
  eq([curly(null), curly(undefined), curly(5)], ["", "", "5"]);
});

test("esc curls and makes text safe; escRaw keeps what she typed", async () => {
  eq(esc(`"Tom" & Jerry's <3`), "“Tom” &amp; Jerry’s &lt;3");
  eq(escRaw(`"Tom" & Jerry's <3`), "&quot;Tom&quot; &amp; Jerry's &lt;3");
  eq([esc(null), escRaw(undefined)], ["", ""]);
});

test("capitalise: each word gets a capital, small words stay small unless first or last", async () => {
  view().innerHTML = `<h2>new on the shelves</h2><h2>what it is made of</h2><h2>read-alikes for you</h2><h2>jemma’s books</h2><a class="btn">pick a book from this shelf</a>`;
  capitalise(document);
  eq($$("h2, .btn", view()).map(x => x.textContent), ["New on the Shelves", "What It Is Made Of", "Read-Alikes for You", "Jemma’s Books", "Pick a Book from This Shelf"]);
});

test("capitalise: names and search terms, counts and book titles are left as they are", async () => {
  view().innerHTML = `<h2>results for <em class="keep">‘harry and the potters’</em></h2><h3>a tale of two cities</h3>`;
  capitalise(document);
  eq([$("h2", view()).textContent, $("h3", view()).textContent], ["Results for ‘harry and the potters’", "a tale of two cities"]);
  await go("#home");
  ok($$("#nav .n").every(n => /^[\d,]+$/.test(n.textContent)), "a sidebar count changed");
});

test("book numbers: a real ISBN-13 passes the check digit, a wrong one or a price sticker doesn’t", async () => {
  eq(["9780306406157", "9780306406158", "978030640615", "2000001234567"].map(isBookNumber), [true, false, false, false]);
  ok(!isShopCode("9780306406157"));
});

// ---------- the pages' figures (exact, on the made-up library) ----------
test("sidebar counts on the made-up library", async () => {
  await go("#home");
  eq(["#shelves", "#shelf-fantasy", "#shelf-childrens", "#old-childrens", "#old-fiction", "#old-non-fiction", "#old-to-find", "#to-buy", "#authors", "#reading"].map(navCount),
    [19, 13, 2, 3, 1, 1, 1, 3, 12, 2]);   // each book once however many copies (her call, 21 Nov): 25 copies are 19 books
  ok(!$('#nav a[href="#shelf-empty-shelf"]'), "an empty shelf is listed");
  ok(!$('#nav a[href="#shelf-old-book-collection"]'), "the old books are listed as a shelf too");
});

test("Home: read this year counts every finish, not read yet counts each book once", async () => {
  await go("#home");
  eq(figures(), {[`read in ${Y}`]: 6, "books on the shelves": 19, "not read yet on your shelves": 14, authors: 12});
  eq($$(".now-row h3", view()).map(h => h.textContent), ["Lantern Days", "Second Wind"], "reading now:");
  ok(/On a break/i.test(view().innerText) && view().innerText.includes("Quiet Fields"), "paused book not on a break");
});

test("Reading: its figures, and how many of the books read are on the shelves", async () => {
  await go("#reading");
  eq(figures(), {"reading now": 2, read: 4, [`finished in ${Y}`]: 6, "not read yet on your shelves": 14});
  ok(/2 of the books you’ve read are on your shelves; 2 aren’t/i.test(view().innerText), "shelves / not owned line");
});

test("a shelf’s banner: books, authors and books read once each, and read-but-not-owned", async () => {
  await go("#shelf-fantasy");
  eq(figures(), {books: 13, authors: 8, read: 2, "read but not owned": 1, pages: 1380});   // 18 copies are 13 books; each book's pages once (its longest copy)
  eq(countText(), "13 books · 1 not owned", "the count over the books (each book once, the not-owned one apart):");
  eq(shownBooks().length, 19);
});

test("a shelf’s filters each show only their books, and count them", async () => {
  await go("#shelf-fantasy");
  const counts = {};
  for (const k of Object.keys(FILTERS)) { click($(`[data-filter="${k}"]`)); counts[k] = [shownBooks().length, countText()]; }
  eq(counts, {all: [19, "13 books · 1 not owned"], owned: [18, "13 books"], notowned: [1, "1 not owned"], special: [2, "2 books"], signed: [1, "1 book"],
    toyou: [1, "1 book"], unread: [9, "8 books"], reading: [1, "1 book"], read: [7, "2 books · 1 not owned"]});   // covers shown per copy, counted per book
});

test("a shelf’s list view and sort keep the same books", async () => {
  await go("#shelf-fantasy");
  const before = shownBooks().sort();
  click($('[data-view="list"]'));
  eq(shownBooks().sort(), before, "list view:");
  const sort = $("#sort"); sort.value = "title"; sort.dispatchEvent(new Event("change", {bubbles: true}));
  eq(shownBooks().sort(), before, "sorted by title:");
});

test("All shelves: each shelf’s part counts its own books, in sidebar order", async () => {
  await go("#shelves");
  eq(figures(), {books: 19, shelves: 3, authors: 12, read: 2});
  eq($$("#shelfBooks section.shelf-part").map(s => [$(".section-head h2", s).textContent.trim(), shownBooks(s).length, $(".section-head .more", s).textContent.trim().toLowerCase()]),
    [["Fantasy", 19, "13 books · 1 not owned"], ["Children’s", 2, "2 books"], ["Old Book Collection", 5, "5 books"]]);
  eq(countText(), "19 books · 1 not owned");
});

test("History: a year lists each book finished in it, a re-read in both years", async () => {
  await go("#history");
  eq(figures(), {read: 5, [`finished in ${Y}`]: 6, years: 2});   // Second Wind, being read again, finished in January
  const years = Object.fromEntries($$("details.year", view()).map(d => [$("summary h2", d).textContent.replace(/\s+/g, " ").trim(), $$("a.bk h3", d).map(h => h.textContent).sort()]));
  eq(years, {[`${Y} · 5 Books`]: ["Borrowed Tale", "Library Loan", "Lonely Hill", "Moon Harbour", "Second Wind"], [`${LAST} · 2 Books`]: ["Library Loan", "Moon Harbour"], "Didn’t Finish · 1 Book": ["A Sunless Sea"]});
});

test("Stats: books, reading and stars on the made-up library", async () => {
  await go("#stats");
  const meter = label => { const m = $$(".meter", view()).find(x => x.querySelector("span").textContent.startsWith(label)); return m && m.querySelector("b").textContent; };
  eq([meter("books on the shelves"), meter("books read"), meter("finished in " + Y), meter("stars on average"), meter("read")], ["19", "4", "6", "3.83", "11%"]);
  ok(/3 books rated/.test(view().innerText) && /read \(2 books\)/.test(view().innerText), "rated / read lines");
});

// ---------- old books ----------
test("old books: series shelves in author-surname order, numbers on the spines, gaps where a book is missing", async () => {
  await go("#old-childrens");
  eq($$(".shelf-name", view()).map(n => n.textContent), ["Testwood – Gwen Ashby", "Brook Mysteries – Hal Brook"]);
  const shelf = i => $$(".bookshelf", view())[i].querySelectorAll(".spine");
  eq([...shelf(0)].map(s => [s.querySelector(".no")?.textContent, s.classList.contains("gap")]), [["1", false], ["2", true], ["3", false], ["4", true]]);
  eq([...shelf(1)].map(s => [s.querySelector(".no")?.textContent, s.classList.contains("gap")]), [["1", true], ["2", false]]);
});

test("old books: a gap on her list to find says so; a later author’s book leaves no gap", async () => {
  await go("#old-childrens");
  const gaps = $$(".spine.gap", view()).map(g => g.getAttribute("title"));
  eq(gaps, ["Second Term at Testwood", "Last Term at Testwood · on your list to find", "The Cave Mystery"]);
  ok(!view().innerText.includes("Testwood Again"), "Pam Newer’s Testwood Again left a gap");
});

test("old books: a first-edition star only where her note says first edition, not a doubtful one", async () => {
  await go("#old-childrens");
  eq(["old-t1", "old-t3", "old-b2"].map(i => !!$(`[data-spine="${i}"] .ed`, view())), [true, false, false]);
});

test("old books: the banner counts books, series, oldest year, first editions and books to find", async () => {
  await go("#old-childrens");
  eq(figures(), {books: 3, series: 2, "oldest dated": 1938, "first editions": 1, "on your list to find": 1});
  await go("#old-fiction");
  eq(figures(), {books: 1, "oldest dated": 1955});
});

test("old books: a spine is the cover’s cloth colour, plain brown without a cover", async () => {
  await go("#old-childrens");
  const bg = id => $(`[data-spine="${id}"]`, view()).getAttribute("style");
  ok(/^#[0-9a-f]{6}$/.test(B("old-t1").cloth) && bg("old-t1").includes(B("old-t1").cloth), "the red cloth isn’t on the spine");
  const [r, g] = [1, 3].map(i => parseInt(B("old-t1").cloth.slice(i, i + 2), 16));
  ok(r > 150 && g < 60, `red cloth came out ${B("old-t1").cloth}`);
  ok(bg("old-t3").includes("#7A6650"), "a book with no cover isn’t plain brown");
});

test("old books: books in no series sit on a shelf of their own, unnumbered", async () => {
  await go("#old-fiction");
  eq($$("[data-spine]", view()).map(s => [s.dataset.spine, !!s.querySelector(".no")]), [["old-fic", false]]);
});

test("old books: the ledger groups by series with the missing books greyed", async () => {
  await go("#shelf-old-book-collection");
  eq($$("table.oldbooks tr.group", view()).map(r => r.textContent.trim()), ["Testwood", "Brook Mysteries", "Not in a series"]);
  eq($$("table.oldbooks tr.gone td.t", view()).map(td => td.textContent), ["Second Term at Testwood", "Last Term at Testwood", "The Cave Mystery"]);
  eq((view().innerText.match(/On your list to find/gi) || []).length, 1);
});

test("an old book with only a modern cover shows a title card", async () => {
  ok(!B("old-fic").cover, "the modern reprint’s cover was kept");
  await go("#b-old-fic");
  ok($(".book-hero .cover.blank", view()) && !$(".book-hero .cover img", view()), "not a title card");
});

test("an old book’s own note shows under Details as Edition; a blurb found online shows as a blurb", async () => {   // by where it came from, not its length (21 Nov)
  await go("#b-old-t1");
  ok(!$("p.desc", view()), "note shown as a blurb");
  const ed = $$(".facts dt", view()).find(dt => dt.textContent.trim() === "Edition");
  eq(ed && ed.nextElementSibling.textContent, "First edition, 1946");
  await go("#b-old-odd");
  ok($("p.desc", view()), "long description not shown");
  ok(!$$(".facts dt", view()).some(dt => dt.textContent.trim() === "Edition"), "long description shown as Edition");
});

test("pointing at a spine shows its card, which goes on scroll", async () => {
  await go("#old-childrens");
  const s = $('[data-spine="old-t1"]', view());
  s.dispatchEvent(new MouseEvent("mouseover", {bubbles: true}));
  const card = document.getElementById("spineCard");
  ok(card && card.textContent.includes("First Term at Testwood") && card.textContent.includes("1946"), "no card");
  dispatchEvent(new Event("scroll"));
  ok(!document.getElementById("spineCard"), "card stayed");
});

test("condition and inscription only on old books, the inscription shown as typed", async () => {
  await go("#b-fx-moon"); ok(!$("[data-cond-id], [data-inscr-id]", view()), "picker on a modern book");
  B("old-t1").inscription = "To Mary, ‘with love’ & \"best\"";
  try {
    await go("#b-old-t1");
    eq($("[data-inscr-id]", view()).value, B("old-t1").inscription);
    ok($("[data-cond-id]", view()), "no condition picker");
  } finally { delete B("old-t1").inscription; }
});

test("the trial-covers switch shows on the old books’ pages only", async () => {
  const sw = $(".trial-switch");
  await go("#old-childrens"); trialShown(); ok(!sw.hidden, "hidden on old books");
  await go("#home"); trialShown(); ok(sw.hidden, "shown on home");
});

// ---------- book pages ----------
test("a book page lights up its shelf; an old book lights up its kind", async () => {
  await go("#b-fx-moon"); eq($("#nav a.on")?.getAttribute("href"), "#shelf-fantasy");
  await go("#b-old-odd"); eq($("#nav a.on")?.getAttribute("href"), "#old-non-fiction");
});

test("a book page lists the other copies she owns, not again under More by", async () => {
  await go("#b-fx-moon");
  const part = title => { const h = $$(".section-head", view()).find(x => x.textContent.includes(title)); return h ? $$("a.bk", h.nextElementSibling).map(a => a.getAttribute("href")) : []; };
  eq(part("Other Copies").sort(), ["#b-add0001", "#b-add0002", "#b-fx-moon2"]);
  ok(!part("More by").some(h => /moon|add000/.test(h)), "a copy listed again under More by");
  await go("#b-ch-testwood");
  ok(part("Other Copies").includes("#b-old-t1"), "the old copy isn’t listed");
});

test("a special edition says so: under the title in a series, on its own line otherwise", async () => {
  await go("#b-fx-owl1b");
  eq($(".book-hero .sub", view())?.textContent, "Illumicrate Edition");
  await go("#b-fx-display");
  eq($(".special-line", view())?.textContent, "Fairyloot Edition");
});

test("a signed copy says who it’s signed to", async () => {
  await go("#b-fx-apos");
  eq($(".signed-line", view())?.textContent.trim(), "Signed to you");
});

test("blurbs that ran together get their paragraphs back, words unchanged", async () => {
  await go("#b-fx-apos");
  eq($$("p.desc", view()).map(p => p.textContent), ["A fox.", "Then winter came.", "Mr Hale says so."]);
});

test("a review’s spoiler stays hidden until clicked", async () => {
  await go("#b-fx-moon");
  const s = $(".spoiler", view());
  ok(s && s.textContent === "The harbour floods." && !s.classList.contains("shown"), "spoiler not hidden");
  click(s); ok(s.classList.contains("shown"), "click didn’t show it");
});

test("ratings are read as words, once", async () => {
  await go("#shelf-fantasy");
  const r = $(`a.bk[href="#b-fx-moon"] .rated`, view());
  eq(r && r.getAttribute("aria-label"), "4.5 stars");
  ok(r.querySelector('.sg-stars[aria-hidden="true"]'), "stars not hidden from screen readers");
});

test("a book read elsewhere has its own page on its shelf, marked Not owned", async () => {
  const here = "#r-" + SG.books.indexOf(away("Borrowed Tale"));
  await go(here);
  ok(/Fantasy/.test($(".kicker", view()).textContent) && /Not owned/.test($(".kicker", view()).textContent), "kicker");
  eq($("#nav a.on")?.getAttribute("href"), "#shelf-fantasy");
  await go("#shelf-fantasy");
  ok($(`a.bk[href="${here}"] .cover.unowned`, view()), "not faded as Not owned on the shelf");
});

test("a book she only means to read stays off the shelves", async () => {
  ok(!NOT_OWNED.includes(away("Someday Story")));
  await go("#shelf-fantasy");
  ok(!view().innerText.includes("Someday Story"));
});

test("every page has its own tab title", async () => {
  for (const [h, t] of [["#reading", "Reading"], ["#stats", "Stats"], ["#to-buy", "To buy"], ["#add", "Add a book"], ["#authors", "Authors"], ["#history", "History"],
    ["#shelf-fantasy", "Fantasy"], ["#b-fx-apos", "The Fox’s Winter"], ["#old-childrens", "Old books · Children’s"], ["#a-ada-quill", "Ada Quill"]]) {
    await go(h); ok(document.title.startsWith(t + " · "), `${h}: ${document.title}`);
  }
});

// ---------- search ----------
const searchFor = async v => { type(q, v); await wait(0); return view().innerText; };
test("search finds a book by the title the site shows, not only Libib’s", async () => {
  ok((await searchFor("Crown of Winter")).includes("Crown of Winter"));
  ok((await searchFor("Iron Owl")).includes("The Iron Owl"));
});

test("search copes with a curly apostrophe", async () => {
  ok((await searchFor("Fox’s Winter")).includes("The Fox’s Winter"));
});

test("search by ISBN, with or without hyphens", async () => {
  ok((await searchFor("9790000000073")).includes("The Fox’s Winter"));
  ok((await searchFor("979-0-000000-07-3")).includes("The Fox’s Winter"));
});

test("search lists authors, books read elsewhere and the to-buy list apart", async () => {
  const text = await searchFor("quill");
  ok($$(".chips a.btn", view()).some(a => a.getAttribute("href") === "#a-ada-quill"), "no author chip");
  ok(/To-Buy List/i.test(text) && text.includes("The Paper Owl"), "to-buy book not listed");
  ok(/Not on Your Shelves/i.test(await searchFor("borrowed")) && view().innerText.includes("Borrowed Tale"), "book read elsewhere not listed");
  ok(/No books match/.test(await searchFor("zzqqzz")), "nothing found isn’t said");
});

test("clicking the page you’re on clears the search", async () => {
  await go("#reading");
  await searchFor("the");
  ok(/Results for/.test(view().innerText));
  click($('#nav a[href="#reading"]')); await wait(0);
  eq(q.value, ""); ok(!/Results for/.test(view().innerText), "results still showing");
});

test("deleting the search back to one letter shows the page again", async () => {
  await go("#reading");
  type(q, "ab"); await wait(0); ok(/Results for/.test(view().innerText));
  type(q, "a"); await wait(0); ok(!/Results for/.test(view().innerText), "old results still showing");
});

// ---------- Add a book (fake server) ----------
test("Look it up fills the form", async () => {
  fake = {"api/lookup": () => ({found: true, title: "Fake Book", authors: ["Ann A", "Bo B"], publisher: "P", published: "2024", pages: 300, cover: "", categories: ["Fantasy"]})};
  await go("#add");
  $("#add-isbn").value = "9780306406157";
  click($("#addLookup"));
  await until(() => !addForm.looking, "the lookup");
  eq([$("#add-title").value, $("#add-authors").value], ["Fake Book", "Ann A, Bo B"]);
});

test("Look it up runs once, and a late answer for an old number is dropped", async () => {
  let release; const slow = new Promise(r => release = r); let calls = 0;
  fake = {"api/lookup": () => (calls++, slow.then(() => ({found: true, title: "Old Number's Book", authors: [], publisher: "", published: "", pages: null, cover: "", categories: []})))};
  await go("#add");
  $("#add-isbn").value = "9780306406157";
  click($("#addLookup")); click($("#addLookup"));
  eq(calls, 1, "looked up twice:");
  $("#add-isbn").value = "9781234567897";   // she changes the number meanwhile
  release(); await until(() => !addForm.looking, "the lookup");
  eq($("#add-title").value, "", "old number's details landed:");
  eq($("#add-isbn").value, "9781234567897");
});

test("Look it up says when she already has the book, however the ISBN is typed", async () => {
  fake = {"api/lookup": () => ({found: true, title: "The Fox's Winter", authors: ["Gus Hale"], publisher: "", published: "", pages: null, cover: "", categories: []})};
  for (const typed of ["9790000000073", "979-0-000000-07-3"]) {
    freshAdd(); await go("#add");
    $("#add-isbn").value = typed;
    click($("#addLookup")); await until(() => !addForm.looking, "the lookup");
    ok(/You already have this one: The Fox’s Winter/.test(view().innerText), `not said for ${typed}`);
  }
});

test("“you already have it” is added to the lookup’s own note, not put in its place", async () => {   // review, 21 Nov
  fake = {"api/lookup": () => ({error: true})};
  freshAdd(); await go("#add");
  $("#add-isbn").value = "9790000000073";
  click($("#addLookup")); await until(() => !addForm.looking, "the lookup");
  ok(/You already have this one/.test(view().innerText), "already have");
  ok(/The lookup didn’t work this time/.test(view().innerText), "the lookup's own note kept");
});

// ---------- the search over a page (review, 21 Nov) ----------
test("clearing the search puts the shelf back as it was: its filter, sort and place on the page", async () => {
  const s = DATA.shelves.find(x => shelfIndex[x.id]?.books.length > 2);
  await go("#shelf-" + s.id);
  click($('[data-filter="read"]')); const before = [countText(), shownBooks().join()];
  type(q, "x");
  eq([countText(), shownBooks().join()], before, "one letter typed changes nothing:");
  type(q, "zz"); ok(/Results for/.test(view().innerText), "results");
  type(q, "");
  eq([countText(), shownBooks().join()], before, "after clearing:");
  ok($('[data-filter="read"]').classList.contains("on"), "the Read filter is still on");
  type(q, "zz");
  q.dispatchEvent(new KeyboardEvent("keydown", {key: "Escape", bubbles: true}));
  eq(q.value, "", "Escape clears the box");
  eq([countText(), shownBooks().join()], before, "after Escape:");
});

test("a search result that leads to the page underneath opens it, not the results again", async () => {
  await go("#home");
  type(q, BOOKS[0].t.slice(0, 4));
  ok(/Results for/.test(view().innerText));
  const homeLink = document.createElement("a"); homeLink.href = "#home"; view().append(homeLink);   // e.g. the phone top bar's name
  click(homeLink);
  ok(!/Results for/.test(view().innerText), "the page is back");
  eq(q.value, "", "the search box is emptied");
});

test("a shelf’s authors figure counts people: a book by two people counts both, and each person once", async () => {   // review, 21 Nov
  for (const s of SHELVES.filter(x => x.books.length)) {
    await show("#shelf-" + s.id);
    const want = new Set(s.books.flatMap(b => (b.authors || []).filter(a => !a.role).map(a => slug(a.name)))).size   // one person spelt two ways counts once;
    eq(figures().authors, want, s.name);
  }
});

test("a failed lookup keeps a Got-it book’s title and author", async () => {
  fake = {"api/lookup": () => ({found: false})};
  await go("#to-buy");
  await follow($('[data-add-from="buy-last-testwood"]'));
  eq(location.hash, "#add");
  eq([$("#add-title").value, $("#add-authors").value], ["Last Term at Testwood", "Gwen Ashby"], "Got it filled:");
  $("#add-isbn").value = "9781234567897";
  click($("#addLookup")); await until(() => !addForm.looking, "the lookup");
  eq([$("#add-title").value, $("#add-authors").value], ["Last Term at Testwood", "Gwen Ashby"]);
});

test("Escape in the search box keeps a Got-it form", async () => {
  await go("#to-buy");
  await follow($('[data-add-from="buy-paper-owl"]'));
  eq(addForm.fromWish, "buy-paper-owl", "Got it didn’t fill the form:");
  type(q, "zz"); q.dispatchEvent(new KeyboardEvent("keydown", {key: "Escape"})); await wait(0);
  eq(addForm.fromWish, "buy-paper-owl");
});

test("the Add page opened any other way starts empty", async () => {
  await go("#to-buy");
  await follow($('[data-add-from="buy-paper-owl"]'));
  await go("#home"); await go("#add");
  eq([addForm.fromWish, $("#add-title").value], [undefined, ""]);
});

test("what she types keeps its quotes through a redraw", async () => {
  await go("#add");
  $("#add-title").value = "Rock 'n' Roll and \"Salem's Lot\"";
  readAdd(); redrawAdd();
  eq($("#add-title").value, "Rock 'n' Roll and \"Salem's Lot\"");
});

test("Add to the shelf sends the form to the server", async () => {
  fake = {"api/books": () => ({ok: false, error: "fake: not saved"})};
  await go("#add");
  $("#add-title").value = "Sent Book";
  $("#add-authors").value = "Ann A, Bo B";
  const sel = $("#add-shelf"); sel.value = sel.options[1].value;
  click($("#addSave")); await until(() => sent.length, "the form to be sent");
  const body = JSON.parse(sent[0][2]);
  eq([body.title, body.authors, body.shelf], ["Sent Book", ["Ann A", "Bo B"], sel.options[1].value]);
  await until(() => /fake: not saved/.test(view().innerText), "the server’s answer");
});

test("Add to the shelf needs a title and a shelf", async () => {
  fake = {"api/books": () => ({ok: true})};
  await go("#add");
  click($("#addSave"));
  await until(() => /needs a title/.test(view().innerText), "the note");
  $("#add-title").value = "No Shelf Book";
  click($("#addSave"));
  await until(() => /Pick a shelf/.test(view().innerText), "the note");
  eq(sent.length, 0, "sent without a title or shelf:");
});

test("a scan from her phone shows on the Add page and fills the form", async () => {
  let list = [];
  fake = {"api/scanned": () => list, "api/lookup": () => ({found: true, title: "Phone Book", authors: ["Pat Phone"], publisher: "", published: "", pages: null, cover: "", categories: []})};
  await go("#add");
  await pollScanned();
  list = [{isbn: "9790000000073", title: "The Fox's Winter", owned: "The Fox's Winter"}, {isbn: "9780306406157", title: "Phone Book", owned: ""}];
  await pollScanned();
  ok(/Phone Book/.test($("#scannedBox").innerText) && /you already have a copy/.test($("#scannedBox").innerText), "scans not listed");
  await until(() => !addForm.looking && $("#add-title")?.value === "Phone Book", "the form to fill from the newest scan");
  eq($("#add-isbn").value, "9780306406157");
});


// ---------- the foot of every page: Back to top and Dark mode (21 Nov, her ask for all her sites) ----------
const footBtns = () => [$("#toTop"), $("#modeBtn")];
const mode = (doc = document) => doc.documentElement.getAttribute("data-mode");
const reloaded = () => new Promise((done, fail) => {   // the site opened afresh (as after a reload), in a frame on the same address
  const f = document.createElement("iframe"); f.src = "index.html"; f.style.cssText = "position:fixed;left:-3000px;width:800px;height:600px";
  f.onload = async () => { try { await until(() => f.contentDocument.getElementById("modeBtn")?.textContent, "the reloaded page", 10000); done(f); } catch (e) { fail(e); } };
  document.body.append(f);
});

test("Back to top and Dark mode are at the bottom of every page, below the page’s own words", async () => {
  const routes = ["#home", "#shelves", "#authors", "#reading", "#history", "#add", "#to-buy", "#stats", "#old-to-find",
    ...OLD_KINDS.map(k => "#old-" + k[0]), ...DATA.shelves.map(s => "#shelf-" + s.id), ...DATA.books.map(b => "#b-" + b.id),
    ...Object.keys(authorIndex).map(k => "#a-" + k)];
  const wrong = [];
  for (const h of routes) {
    await show(h);
    const [top, md] = footBtns();
    if (!top || !md || !top.offsetParent || !md.offsetParent) { wrong.push(h + ": not shown"); continue; }
    if (top.textContent.trim() !== "Back to top" || md.textContent.trim() !== "Dark mode") wrong.push(`${h}: says “${top.textContent}” / “${md.textContent}”`);
    if (top.getBoundingClientRect().top < view().getBoundingClientRect().bottom - 1) wrong.push(h + ": not below the page");
    if (top.getBoundingClientRect().height < 44 || md.getBoundingClientRect().height < 44) wrong.push(h + ": under 44px tall");
  }
  eq(wrong, [], "pages where the foot is wrong:");
  ok(footBtns().every(b => b.querySelector("svg")), "each with its icon");
  eq(footBtns().map(b => b.tagName), ["A", "BUTTON"], "Back to top a link to the top, Dark mode a button (the family’s markup):");
  eq(Math.round($("#toTop").getBoundingClientRect().top - $("#modeBtn").getBoundingClientRect().top), 0, "side by side:");
});

test("Back to top goes to the top of the page and moves keyboard focus there", async () => {
  await show("#home");
  const pad = document.createElement("div"); pad.style.height = "3000px"; view().append(pad);   // a long page whatever the books
  try {
    scrollTo(0, document.documentElement.scrollHeight); await until(() => scrollY > 500, "the page to scroll down");
    $("#toTop").focus(); click($("#toTop"));
    await until(() => scrollY === 0, "the page to reach the top");
    eq(document.activeElement, view(), "keyboard focus:");
  } finally { pad.remove(); }
});

test("the site opens light, even when the device is set to dark", async () => {
  eq(mode(), "light");
  const autoDark = [];
  for (const sheet of document.styleSheets) { let rules; try { rules = sheet.cssRules; } catch { continue; }
    for (const r of rules) if (r instanceof CSSMediaRule && /prefers-color-scheme/.test(r.conditionText)) autoDark.push(r.conditionText); }
  eq(autoDark, [], "styles that follow the device’s light or dark setting:");
  eq(getComputedStyle(document.body).backgroundColor, "rgb(243, 234, 213)", "the cream page:");
  localStorage.removeItem("jj-mode");
  const f = await reloaded();
  try { eq(mode(f.contentDocument), "light", "opened afresh:"); eq(f.contentDocument.getElementById("modeBtn").textContent.trim(), "Dark mode"); } finally { f.remove(); }
});

test("Dark mode switches the page to dark and back, and the button says what it will do", async () => {
  await show("#home");
  const light = getComputedStyle(document.body).backgroundColor;
  click($("#modeBtn"));
  eq(mode(), "dark");
  eq($("#modeBtn").textContent.trim(), "Light mode"); eq($("#modeBtn").getAttribute("aria-pressed"), "true", "pressed while dark (the family rules):");
  const dark = getComputedStyle(document.body).backgroundColor;
  ok(dark !== light && dark === "rgb(28, 22, 16)", `the page didn’t turn dark (${dark})`);
  click($("#modeBtn"));
  eq(mode(), "light"); eq($("#modeBtn").textContent.trim(), "Dark mode"); eq($("#modeBtn").getAttribute("aria-pressed"), "false");
  eq(getComputedStyle(document.body).backgroundColor, light, "back to light:");
});

test("dark mode is remembered when the site opens again, and so is going back to light", async () => {
  click($("#modeBtn")); eq(mode(), "dark");
  eq(localStorage.getItem("jj-mode"), "dark");
  let f = await reloaded();
  try { eq(mode(f.contentDocument), "dark", "after a reload:"); eq(f.contentDocument.getElementById("modeBtn").textContent.trim(), "Light mode"); } finally { f.remove(); }
  click($("#modeBtn")); eq(mode(), "light");
  f = await reloaded();
  try { eq(mode(f.contentDocument), "light", "after going back to light and a reload:"); } finally { f.remove(); }
});

test("dark mode: the page’s words are easy to read (4.5:1 or more against the dark page)", async () => {
  click($("#modeBtn")); eq(mode(), "dark");
  const lum = c => { const v = c.match(/[\d.]+/g).slice(0, 3).map(Number).map(x => { x /= 255; return x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => p - q); return (y + .05) / (x + .05); };
  const swatch = document.createElement("i"); document.body.append(swatch);
  const rgb = v => { swatch.style.color = v; return getComputedStyle(swatch).color; };   // tokens as plain rgb()
  const css = getComputedStyle(document.documentElement), tok = n => rgb(css.getPropertyValue(n).trim());
  const low = [];
  for (const fg of ["--ink", "--text", "--muted", "--accent", "--gilt-ink", "--done"]) for (const bg of ["--paper", "--surface", "--soft", "--mount"]) {
    const r = ratio(tok(fg), tok(bg)); if (r < 4.5) low.push(`${fg} on ${bg}: ${r.toFixed(2)}`);
  }
  const foot = ratio(getComputedStyle($("#modeBtn")).color, getComputedStyle(document.body).backgroundColor);
  if (foot < 4.5) low.push(`the foot’s buttons: ${foot.toFixed(2)}`);
  swatch.remove();
  eq(low, [], "too faint in dark mode:");
});

test("light mode: grey label text (the muted colour) is 4.5:1 or more on the page, panels and cards it sits on", async () => {
  eq(mode(), "light");
  const lum = c => { const v = c.match(/[\d.]+/g).slice(0, 3).map(Number).map(x => { x /= 255; return x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => p - q); return (y + .05) / (x + .05); };
  const swatch = document.createElement("i"); document.body.append(swatch);
  const rgb = v => { swatch.style.color = v; return getComputedStyle(swatch).color; };
  const css = getComputedStyle(document.documentElement), tok = n => rgb(css.getPropertyValue(n).trim());
  const muted = tok("--muted"), low = [];
  for (const bg of ["--paper", "--surface", "--soft", "--mount"]) { const r = ratio(muted, tok(bg)); if (r < 4.5) low.push(`--muted on ${bg}: ${r.toFixed(2)}`); }
  swatch.remove();
  // every word shown in the muted colour, on every kind of page, against the nearest solid background behind it
  const solid = el => { for (; el; el = el.parentElement) { const c = getComputedStyle(el).backgroundColor, a = c.match(/[\d.]+/g); if (a && (a.length < 4 || +a[3] === 1)) return c; } return getComputedStyle(document.body).backgroundColor; };
  const routes = ["#home", "#shelves", "#authors", "#reading", "#history", "#add", "#to-buy", "#stats", "#old-to-find",
    ...OLD_KINDS.map(k => "#old-" + k[0]), ...DATA.shelves.map(s => "#shelf-" + s.id), ...DATA.books.slice(0, 8).map(b => "#b-" + b.id)];
  let seen = 0;
  for (const h of routes) {
    await show(h);
    for (const el of $$("main *")) {
      if (getComputedStyle(el).color !== muted || !el.offsetParent || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
      seen++;
      const r = ratio(muted, solid(el)); if (r < 4.5) low.push(`${h} ${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]} “${el.textContent.trim().slice(0, 30)}”: ${r.toFixed(2)}`);
    }
  }
  ok(seen > 20, `only ${seen} muted words found: is the sweep looking in the right place?`);
  eq([...new Set(low)], [], "too faint in light mode:");
});

test("a book with no blurb leaves no empty column: its panels and any other sections use the page", async () => {   // her yes, 21 Nov
  const b = BOOKS.find(x => !x.description && !sgFor[x.id]); if (!b) return;
  await go("#b-" + b.id);
  const left = $(".book-body", view()).firstElementChild;
  if (left.children.length === 0) eq(getComputedStyle(left).display, "none", "an empty column is still shown:");
  const h = $(".section-head", left); if (h) eq(getComputedStyle(h).marginTop, "0px", "the first heading starts at the top:");
});

// ---------- the weekly backup's note on Home (her yes, 21 Nov) ----------
test("Home says when the weekly backup failed, and says nothing while it works", async () => {
  const now = new Date().toISOString().slice(0, 16), old = new Date(Date.now() - 20 * 864e5).toISOString().slice(0, 16);
  try {
    fake = {"api/backup-status": () => ({lastTry: now, ok: false, lastOk: old, why: "sending to GitHub failed"})};
    await loadBackupStatus(); await go("#home");
    ok(/weekly backup to GitHub didn’t work/.test(view().innerText), "no note after a failed backup");
    fake = {"api/backup-status": () => ({lastTry: old, ok: true, lastOk: old, why: ""})};
    await loadBackupStatus(); await go("#home");
    ok(/hasn’t run since/.test(view().innerText), "no note when it hasn't run for weeks");
    fake = {"api/backup-status": () => ({lastTry: now, ok: true, lastOk: now, why: ""})};
    await loadBackupStatus(); await go("#home");
    ok(!$("#backupNote"), "a note while all is well");
  } finally { backupStatus = null; }
});

test("Home says when a reading export was refused as cut short, with a Take it anyway button", async () => {   // her yes, 21 Nov
  try {
    fake = {"api/reading-status": () => ({refused: {file: "x.csv", rows: 5, have: 300, when: "2026-11-21T10:00"}}),
            "api/reading/accept": () => ({ok: false, error: "That export isn’t in Downloads any more."})};
    await loadReadingStatus(); await go("#home");
    ok(/wasn’t taken in/.test(view().innerText) && /5 books/.test(view().innerText), "no note");
    click($("#readingAccept"));
    await until(() => /isn’t in Downloads/.test(view().innerText), "the reason it didn't work");
    fake = {"api/reading-status": () => ({})};
    await loadReadingStatus(); await go("#home");
    ok(!$("#readingNote"), "a note with nothing refused");
  } finally { readingRefused = null; }
});

// ---------- keyboard and screen readers (review fixes, her yes, 21 Nov) ----------
test("a spoiler stays hidden when tabbed past, and Enter or Space shows and hides it", async () => {
  const b = BOOKS.find(x => /\[spoiler\]/.test(reading(x).review || "")); if (!b) return;
  await go("#b-" + b.id);
  const sp = $(".spoiler", view());
  sp.focus();
  ok(getComputedStyle(sp).filter !== "none", "shown just by tabbing to it");
  sp.dispatchEvent(new KeyboardEvent("keydown", {key: "Enter", bubbles: true}));
  ok(sp.classList.contains("shown") && sp.getAttribute("aria-pressed") === "true", "Enter didn't show it");
  sp.dispatchEvent(new KeyboardEvent("keydown", {key: " ", bubbles: true}));
  ok(!sp.classList.contains("shown"), "Space didn't hide it");
});

test("a cover's corner dots can be moved with the arrow keys", async () => {
  freshAdd(); await go("#add");
  addForm.corners = {src: "", width: 600, height: 900, pts: [[10, 10], [590, 10], [590, 890], [10, 890]]};
  document.getElementById("view").innerHTML = pageAdd();
  const dot = $('.corner-dot[data-dot="0"]');
  ok(dot && dot.tabIndex === 0, "the dot can't be reached with Tab");
  dot.focus();
  dot.dispatchEvent(new KeyboardEvent("keydown", {key: "ArrowRight", bubbles: true}));
  dot.dispatchEvent(new KeyboardEvent("keydown", {key: "ArrowDown", shiftKey: true, bubbles: true}));
  ok(addForm.corners.pts[0][0] > 10 && addForm.corners.pts[0][1] > 10 + 5, "the arrow keys didn't move it");
  addForm.corners = null;
});


// ---------- the family rules (21 Nov, her decision for all her sites: Jemma's Journals research/family-rules.md) ----------
// the site opened afresh in a frame of a given width (the frame's own layout sees exactly that width)
const frameAt = (width, height = 800) => new Promise((done, fail) => {
  const f = document.createElement("iframe"); f.src = "index.html"; f.style.cssText = `position:fixed;left:-4000px;top:0;width:${width}px;height:${height}px;border:0`;
  f.onload = async () => { try { await until(() => f.contentDocument.getElementById("modeBtn")?.textContent && f.contentDocument.getElementById("view").innerText.trim().length > 20, "the framed page", 10000); done(f); } catch (e) { fail(e); } };
  document.body.append(f);
});

test("family rules: the foot of every page is the family’s, in order: the name, the two About lines, then Back to top and Dark mode", async () => {
  const foots = $$("footer"); eq(foots.length, 1, "one footer:");
  const foot = foots[0];
  eq($(".jj-name", foot).textContent, "Jemma’s Library");
  eq(getComputedStyle($(".jj-name", foot)).fontStyle, "normal", "the name plain, not italic:");
  const lines = $$("[data-jj-line1], [data-jj-credits]", foot).map(p => p.textContent.replace(/\s+/g, " ").trim());
  eq(lines[0], "No cookies, no tracking, no ads. Made with HTML, CSS, JavaScript and Python, kept on GitHub.", "line 1 (the same on every site):");
  eq($$("[data-jj-credits] .cr", foot).map(c => c.textContent), ["Book covers from their publishers", "Some book details from Open Library", "Fonts: Instrument Serif, Manrope and EB Garamond", "Icons by Lucide"], "line 2 (the Library’s own credits):");
  ok($$(".cr", foot).every(c => /^[A-Z]/.test(c.textContent)), "each credit starts with a capital");
  const order = [".jj-name", "[data-jj-line1]", "[data-jj-credits]", ".jj-foot-links"].map(sel => $(sel, foot).getBoundingClientRect().top);
  ok(order[0] < order[1] && order[1] < order[2] && order[2] < order[3], "name, then the two About lines, then the buttons");
  for (const sel of ["[data-jj-line1]", "[data-jj-credits]"]) eq(getComputedStyle($(sel, foot)).fontSize, "12.5px", "About text size:");
  for (const h of ["#home", "#b-" + DATA.books[0].id, "#stats"]) { await show(h); ok($(".jj-name").offsetParent && $("[data-jj-credits]").offsetParent, h + ": foot not shown"); }
});

test("family rules: the foot’s words and buttons are 4.5:1 or more in light and dark", async () => {
  const lum = c => { const v = c.match(/[\d.]+/g).slice(0, 3).map(Number).map(x => { x /= 255; return x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => p - q); return (y + .05) / (x + .05); };
  const low = [];
  for (const m of ["light", "dark"]) {
    if (mode() !== m) click($("#modeBtn"));
    const bg = getComputedStyle(document.body).backgroundColor;
    for (const el of [$("[data-jj-line1]"), $("[data-jj-credits]"), $("#toTop"), $("#modeBtn"), $(".jj-name")]) { const r = ratio(getComputedStyle(el).color, bg); if (r < 4.5) low.push(`${m} ${el.className || el.id}: ${r.toFixed(2)}`); }
  }
  eq(low, [], "too faint:");
});

test("family rules: dark mode uses the shared key jj-mode, moves the old key over once, and sets the bar colour", async () => {
  eq(mode(), "light");
  eq(document.querySelector('meta[name="theme-color"]').content, "#3B2616", "light bar colour:");
  click($("#modeBtn"));
  eq(localStorage.getItem("jj-mode"), "dark", "saved under jj-mode:");
  eq(document.querySelector('meta[name="theme-color"]').content, "#1C1610", "dark bar colour:");
  click($("#modeBtn")); eq(localStorage.getItem("jj-mode"), "light");
  // her choice from before the family key: read once, saved as jj-mode, the old key gone
  localStorage.removeItem("jj-mode"); localStorage.setItem("jemmas-library-mode", "dark");
  let f = await reloaded();
  try {
    eq(mode(f.contentDocument), "dark", "the old choice kept:");
    eq(f.contentDocument.querySelector('meta[name="theme-color"]').content, "#1C1610", "dark bar colour from the start:");
    eq(localStorage.getItem("jj-mode"), "dark"); eq(localStorage.getItem("jemmas-library-mode"), null, "old key moved over:");
  } finally { f.remove(); }
  // jj-mode set by another site in the family wins
  localStorage.setItem("jj-mode", "light"); localStorage.setItem("jemmas-library-mode", "dark");
  f = await reloaded();
  try { eq(mode(f.contentDocument), "light", "jj-mode first:"); } finally { f.remove(); }
});

test("family rules: the Menu bar shows at 899px wide and the sidebar at 901px", async () => {
  for (const [w, bar] of [[899, true], [901, false]]) {
    const f = await frameAt(w);
    try {
      const d = f.contentDocument, side = d.getElementById("side");
      eq(getComputedStyle(d.querySelector(".topbar")).display !== "none", bar, `${w}px top bar:`);
      if (bar) {
        ok(/^\s*Menu\s*$/.test(d.getElementById("menuBtn").textContent) && d.querySelector("#menuBtn svg"), "the Menu button with its icon");
        const name = d.querySelector(".topbar-name"); eq(name.tagName, "A"); eq(name.getAttribute("href"), "#home"); ok(name.querySelector("em")?.textContent === "Library", "Library in italics");
        eq(side.inert, true, "closed drawer inert:");
      } else {
        ok(side.getBoundingClientRect().left >= 0, "sidebar on the page"); eq(side.inert, false, "sidebar reachable:");
        eq(side.querySelector("a").textContent.trim(), "← Jemma’s Journals", "first in the sidebar:");
      }
      ok(d.documentElement.scrollWidth <= w, `${w}px: no sideways scroll`);
    } finally { f.remove(); }
  }
});

test("family rules: the drawer at 899px: aria, focus in and back, inert, Escape, scrim, a link, scroll lock, and reset across 900px", async () => {
  const f = await frameAt(899);
  try {
    const d = f.contentDocument, w = f.contentWindow, btn = d.getElementById("menuBtn"), side = d.getElementById("side");
    const isOpen = () => d.documentElement.classList.contains("jj-menu-open"), key = k => d.dispatchEvent(new w.KeyboardEvent("keydown", {key: k, bubbles: true}));
    eq(btn.getAttribute("aria-controls"), "side"); eq(btn.getAttribute("aria-expanded"), "false");
    // open: focus moves in, the page behind is inert and doesn't scroll
    btn.focus(); btn.click();
    ok(isOpen()); eq(btn.getAttribute("aria-expanded"), "true"); eq(side.inert, false);
    await until(() => side.contains(d.activeElement), "focus to move into the drawer");
    eq(d.querySelector("main").inert, true, "the page behind inert:");
    eq(w.getComputedStyle(d.body).overflow, "hidden", "no scrolling behind:");
    eq(w.getComputedStyle(d.getElementById("scrim")).display, "block", "the scrim:");
    eq([...side.querySelectorAll("a, input")].filter(e => e.offsetParent)[0].textContent.trim(), "← Jemma’s Journals", "first in the drawer:");
    // Escape closes, focus back on the button
    key("Escape"); ok(!isOpen()); eq(d.activeElement, btn, "focus back:"); eq(side.inert, true, "closed drawer inert:"); eq(d.querySelector("main").inert, false);
    // the scrim closes
    btn.click(); ok(isOpen()); d.getElementById("scrim").click(); ok(!isOpen(), "scrim"); eq(d.activeElement, btn);
    // a link closes
    btn.click(); d.querySelector('#nav a[href="#reading"]').click(); ok(!isOpen(), "a link"); eq(side.inert, true);
    // crossing 900px resets it: open, widen, the drawer is shut and the sidebar reachable
    btn.click(); ok(isOpen());
    f.style.width = "1000px"; await until(() => !isOpen(), "the drawer to reset on widening");
    eq(side.inert, false, "wide sidebar reachable:"); eq(d.querySelector("main").inert, false, "page reachable:"); eq(btn.getAttribute("aria-expanded"), "false");
    f.style.width = "899px"; await until(() => side.inert === true, "the drawer to be inert again when narrow");
  } finally { f.remove(); }
});

// ---------- the second review (21 Nov) and the tightened family rules (sections 3 and 4) ----------
const hashIn = async (f, h) => { f.contentWindow.location.hash = h; await until(() => f.contentWindow.location.hash === h && f.contentDocument.getElementById("view").innerText.trim().length > 20, "the framed page " + h); await wait(50); };
const meets = (a, b) => { const r = a.getBoundingClientRect(), s = b.getBoundingClientRect(); return r.width && s.width && r.left < s.right && s.left < r.right && r.top < s.bottom && s.top < r.bottom; };

test("family rules: the drawer opens on the page’s own link (Home when none), and everything outside it is inert while open", async () => {
  const f = await frameAt(899);
  try {
    const d = f.contentDocument, btn = d.getElementById("menuBtn"), side = d.getElementById("side");
    await hashIn(f, "#reading");
    btn.click(); await until(() => side.contains(d.activeElement), "focus into the drawer");
    eq(d.activeElement.getAttribute("href"), "#reading", "the page’s own link:");
    for (const sel of [".topbar", ".skip", "main"]) eq(d.querySelector(sel).inert, true, sel + " inert while open:");
    eq(d.getElementById("scrim").inert, false, "the scrim still closes it:");
    d.getElementById("scrim").click(); eq(d.activeElement, btn, "focus back to Menu:"); eq(d.querySelector(".topbar").inert, false, "top bar back:");
    await hashIn(f, "#home");
    btn.click(); await until(() => side.contains(d.activeElement), "focus into the drawer");
    eq(d.activeElement.getAttribute("href"), "#home", "Home when the page has no link of its own:");
    ok(!d.activeElement.classList.contains("home-link"), "not “← Jemma’s Journals”");
    d.getElementById("scrim").click();
  } finally { f.remove(); }
});

test("family rules: a page chosen in the drawer (by link, the same page again, or Enter in the search) takes keyboard focus", async () => {
  const f = await frameAt(899);
  try {
    const d = f.contentDocument, w = f.contentWindow, btn = d.getElementById("menuBtn"), side = d.getElementById("side"), view = d.getElementById("view");
    btn.click(); await until(() => side.contains(d.activeElement), "focus into the drawer");
    const a = d.querySelector('#nav a[href="#reading"]'); a.focus(); a.click();
    await until(() => w.location.hash === "#reading", "the page to change"); await wait(30);
    eq(d.activeElement, view, "focus on the new page:");
    btn.click(); await until(() => side.contains(d.activeElement), "focus into the drawer");
    d.querySelector('#nav a[href="#reading"]').click(); await wait(30);
    eq(d.activeElement, view, "focus on the page after choosing the same page:");
    btn.click(); await until(() => side.contains(d.activeElement), "focus into the drawer");
    const q = d.getElementById("q"); q.focus(); q.value = "the"; q.dispatchEvent(new w.Event("input", {bubbles: true}));
    q.dispatchEvent(new w.KeyboardEvent("keydown", {key: "Enter", bubbles: true}));
    eq(d.activeElement, view, "focus on the results:");
  } finally { f.remove(); }
});

test("family rules: sizes: Menu 44px or more, the bar’s name 26px, the scrim black at 45%, “← Jemma’s Journals” 24px or more tall", async () => {
  const f = await frameAt(899);
  try {
    const d = f.contentDocument, w = f.contentWindow;
    ok(d.getElementById("menuBtn").getBoundingClientRect().height >= 44, "Menu button too small");
    eq(w.getComputedStyle(d.querySelector(".topbar-name")).fontSize, "26px", "bar name:");
    d.getElementById("menuBtn").click();
    eq(w.getComputedStyle(d.getElementById("scrim")).backgroundColor, "rgba(0, 0, 0, 0.45)", "scrim:");
    ok(d.querySelector("#side .home-link").getBoundingClientRect().height >= 24, "back link too small in the drawer");
    d.getElementById("scrim").click();
  } finally { f.remove(); }
  ok($("#side .home-link").getBoundingClientRect().height >= 24, `back link on the wide sidebar is ${$("#side .home-link").getBoundingClientRect().height}px tall`);
});

test("family rules: robots meta, data-mode always set, fonts only from the site itself", async () => {
  eq(document.querySelector('meta[name="robots"]')?.content, "noindex, noai, noimageai", "robots:");
  ok(["light", "dark"].includes(document.documentElement.getAttribute("data-mode")), "data-mode set");
  const away = $$("link[href], script[src]").map(e => e.href || e.src).filter(u => !u.startsWith(location.origin) && !u.startsWith("file:"));
  eq(away, [], "files from other sites:");
  const faces = [...document.styleSheets].flatMap(s => { try { return [...s.cssRules]; } catch { return []; } }).filter(r => r instanceof CSSFontFaceRule);
  ok(["Instrument Serif", "Manrope", "EB Garamond"].every(n => faces.some(r => r.style.getPropertyValue("font-family").replace(/"/g, "") === n)), "each font has a local @font-face");
  ok(faces.every(r => !/https?:/.test(r.style.getPropertyValue("src"))), "a font comes from another site");
});

test("family rules: the credits’ dots never start or end a line (a no-break space before each, lines balanced)", async () => {
  const p = $("[data-jj-credits]");
  eq($$(".jj-dot", p).map(s => s.textContent), [" ·", " ·", " ·"], "each dot tied to the credit before it:");
  eq(getComputedStyle(p).textWrap || getComputedStyle(p).textWrapStyle, "balance", "balanced:");
  // narrow enough to wrap (but wider than a phone, where the dots are hidden): each dot stays on its credit’s line
  const f = await frameAt(700);
  try {
    const d = f.contentDocument, seps = [...d.querySelectorAll("[data-jj-credits] .jj-dot")], crs = [...d.querySelectorAll("[data-jj-credits] .cr")];
    seps.forEach((s, i) => { if (f.contentWindow.getComputedStyle(s).display === "none") return;   // a dot at a break is taken out (family.js)
      const r = s.getBoundingClientRect(), before = crs[i].getBoundingClientRect(); ok(Math.abs(r.bottom - before.bottom) < 2, `dot ${i + 1} left its credit’s line`); });
    ok(crs.some((c, i) => i && c.getBoundingClientRect().top > crs[0].getBoundingClientRect().top + 2), "the credits should wrap at 700px for this check");
    seps.forEach((s, i) => { const ends = crs[i + 1].getBoundingClientRect().top > s.getBoundingClientRect().top + 2; ok(!ends || f.contentWindow.getComputedStyle(s).visibility === "hidden" || f.contentWindow.getComputedStyle(s).display === "none", `dot ${i + 1} shows at the end of a line`); });
  } finally { f.remove(); }
});

test("second review: between 901 and 1100 wide, Stats fits, its figures don’t run together, and no button or note sits on a heading", async () => {
  for (const wd of [901, 1000, 1100]) {
    const f = await frameAt(wd);
    try {
      const d = f.contentDocument;
      for (const h of ["#home", "#reading", "#stats"]) {
        await hashIn(f, h);
        ok(d.documentElement.scrollWidth <= wd, `${wd}px ${h}: runs off the side (${d.documentElement.scrollWidth})`);
        for (const head of d.querySelectorAll(".section-head")) {
          const h2 = head.querySelector("h2"), extra = head.querySelector(".more, .pick-open");
          if (extra) ok(!meets(h2, extra), `${wd}px ${h}: “${extra.textContent.trim()}” on “${h2.textContent.trim()}”`);
        }
        if (h === "#stats") for (const m of d.querySelectorAll(".meter b")) ok(m.scrollWidth <= m.parentElement.clientWidth + 1, `${wd}px: “${m.textContent}” runs past its column`);
        else { const fig = [...d.querySelectorAll(".hero .figures div")]; if (fig.length > 2) ok(fig.every(x => x.getBoundingClientRect().left >= fig[0].getBoundingClientRect().left - 1), `${wd}px ${h}: a figure indented`); }
      }
    } finally { f.remove(); }
  }
});

test("second review: the drop capital only on a blurb starting with a letter (a leading number stays whole)", async () => {
  eq(dropCap("20 years after the war"), false, "a number:");
  eq(dropCap("It was a dark night"), true, "a letter:");
  eq(dropCap("“Hello,” she said"), true, "after an opening quote mark (kept, her question):");
  const b = BOOKS.find(x => x.description && x.shelf !== COLLECTION);
  if (b) { await show("#b-" + b.id); const p = $(".book-body .desc", view()); if (p) eq(p.classList.contains("drop"), dropCap(p.textContent.trim()), "the class follows the rule:"); }
});

test("second review: a pale shelf colour gets darker cloth so its gilt name reads; the old books’ shelves are dark in dark mode", async () => {
  eq(paleCloth("#CF9A2B"), true, "Children’s mustard:");
  eq(["#8E3B46", "#7A3F7A", "#4B4F8C", "#5A524C", "#B5577A", "#8C6A3F", "#A4542F", "#2E7A92", "#5E3D22", "#8A8178"].filter(paleCloth), [], "the darker colours keep their cloth:");
  await show("#home");
  $$(".shelf-card", view()).forEach(c => eq(c.classList.contains("pale"), paleCloth(c.style.getPropertyValue("--c").trim()), "card class:"));
  click($("#modeBtn")); ok(mode() === "dark");
  await show("#old-" + OLD_KINDS[0][0]);
  const shelf = $(".bookshelf", view());
  if (shelf) ok(!/239, 229, 209/.test(getComputedStyle(shelf).backgroundImage), "the board is still cream in dark mode");
  click($("#modeBtn"));
});

test("read-only: without its own server (opened as a file, or plain hosting online) the site just shows the books: no Add a book, no Got it, no controls, no note", async () => {
  ok(LIVE, "served by the real server code here, so it starts editable");
  const old = DATA.books.find(b => b.shelf === "old-book-collection");
  try {
    LIVE = false;
    await go("#home"); eq($$('#nav a[href="#add"]').length, 0, "Add a book in the menu:");
    eq($$(".note", view()).length, 0, "a note on Home:");
    await go("#to-buy"); ok($$(".wish-item", view()).length > 0, "the to-buy books still shown");
    eq($$(".got-it").length, 0, "Got it buttons:");
    ok(!/Got it/.test($(".hero", view()).textContent), "the banner still says to press Got it");
    await go("#add"); ok(!$("#addSave") && !$("#add-isbn"), "the Add page still opens"); eq(document.title, "Jemma’s Library");
    await go("#b-" + old.id); eq($$("#view select, #view textarea, #view input").length, 0, "controls on an old book’s page:");
  } finally { LIVE = true; }
  await go("#b-" + old.id);
  ok($$("#view select").length >= 2, "editable again with the server: condition and signed");
});

// ---------- the family's shared code (22 Nov, her decision: one copy in Jemma's Journals, site/family, loaded from /family/) ----------
test("family code: the page loads /family/mode.js, family.css and family.js, and window.JJFamily is there", async () => {
  const mode = $('script[src="/family/mode.js"]'), css = $('link[rel="stylesheet"][href="/family/family.css"]'), js = $('script[src="/family/family.js"]');
  ok(mode && css && js, "the three family files in the page");
  eq(mode.dataset.oldKey, "jemmas-library-mode", "the Library’s old dark-mode key, moved over once:");
  ok(js.defer, "family.js deferred");
  const site = $('link[rel="stylesheet"][href^="site.css"]');
  ok(css.compareDocumentPosition(site) & Node.DOCUMENT_POSITION_FOLLOWING, "family.css before the Library’s own stylesheet");
  ok(mode.compareDocumentPosition(site) & Node.DOCUMENT_POSITION_FOLLOWING, "mode.js before the stylesheet (no flash of the wrong mode)");
  ok([...document.styleSheets].some(s => s.href && s.href.endsWith("/family/family.css") && s.cssRules.length > 5), "family.css loaded");
  ok(window.JJFamily && typeof JJFamily.menu === "function" && typeof JJFamily.mode.set === "function", "JJFamily is there");
  for (const f of ["mode.js", "family.js", "family.css"]) {
    const r = await realFetch("/family/" + f); eq(r.status, 200, f + ":");
  }
  ok(menuCtl && typeof menuCtl.isOpen === "function", "the Menu drawer is the family’s (JJFamily.menu)");
  eq($('meta[name="theme-color"]').dataset.dark, "#1C1610", "the dark bar colour for family.js:");
  eq($("[data-jj-line1]").textContent, JJFamily.LINE1, "footer line 1 from the family:");
});

// ---------- round 3 review (22 Nov) ----------
test("round 3: read-only, the New covers switch and its page are gone (a working tool for her, not for visitors)", async () => {
  const sw = $(".trial-switch");
  await go("#old-childrens"); trialShown();   // go() changes the address without a hashchange, which is what calls trialShown
  eq(sw.hidden, false, "with her server, on an old books page:");
  try {
    LIVE = false; trialShown();
    eq(sw.hidden, true, "read-only, on an old books page:");
    await go("#trial-covers"); trialShown(); eq(sw.hidden, true, "read-only, the New covers address:");
    ok(!$(".trial-list", view()), "the New covers page opens read-only"); eq(document.title, "Jemma’s Library", "Home instead:");
  } finally { LIVE = true; }
  await go("#trial-covers"); trialShown(); eq(document.title, "New covers · Jemma’s Library", "with her server it still opens:");
  eq(sw.hidden, false, "and so does its switch:");
});

test("round 3: a word longer than its card breaks instead of being cut off, and a book page’s title card keeps its margins at 899", async () => {
  await show("#shelf-fantasy");
  const h3 = $(".bk h3", view()); ok(h3, "a book card"); eq(getComputedStyle(h3).overflowWrap, "anywhere", "card titles:");
  const blank = BOOKS.find(b => !b.cover && b.shelf !== COLLECTION) || BOOKS.find(b => !b.cover);
  ok(blank, "a book with no cover in the made-up library");
  const f = await frameAt(899);
  try {
    await hashIn(f, "#b-" + blank.id);
    const card = f.contentDocument.querySelector(".book-top .cover.blank"), t = card.querySelector(".t");
    eq(f.contentWindow.getComputedStyle(t).overflowWrap, "anywhere", "title card text:");
    const cw = card.getBoundingClientRect().width, tw = t.getBoundingClientRect().width;
    ok(tw > cw * 0.7, `the title card’s words get ${Math.round(tw)}px of a ${Math.round(cw)}px card`);
    ok(t.scrollWidth <= t.clientWidth + 1, "a word is cut off");
  } finally { f.remove(); }
});

test("round 3: old books: spine lettering is whichever of gilt or dark reads better on its cloth, and missing books are 4.5:1", async () => {
  const lum = c => { const v = c.match(/[\d.]+/g).slice(0, 3).map(Number).map(x => { x /= 255; return x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => p - q); return (y + .05) / (x + .05); };
  eq(contrast("#000000", "#FFFFFF").toFixed(0), "21", "contrast():");
  eq(+contrast("#3A2614", "#3A2614").toFixed(2), 1, "contrast() of one colour:");
  const gilt = "rgb(246, 222, 156)", dark = "rgb(58, 38, 20)";
  await go("#old-childrens");
  for (const s of $$("a.spine", view())) {
    const bg = getComputedStyle(s).backgroundColor, span = s.querySelector("span"), no = s.querySelector(".no");
    const r = ratio(getComputedStyle(span).color, bg), other = ratio(s.classList.contains("pale") ? gilt : dark, bg);
    ok(r >= other - 0.01, `${span.textContent}: ${r.toFixed(2)}:1, the other lettering would be ${other.toFixed(2)}:1`);
    if (no) eq(getComputedStyle(no).color, getComputedStyle(span).color, `${span.textContent}: its number in the same lettering:`);
  }
  await go("#shelf-old-book-collection");
  const page = getComputedStyle(document.body).backgroundColor, gone = $$("table.oldbooks tr.gone td", view()).filter(td => td.textContent.trim());
  ok(gone.length >= 3, "missing books listed");
  for (const td of gone) {
    eq(getComputedStyle(td).opacity, "1", "not faded:");
    const r = ratio(getComputedStyle(td).color, page); ok(r >= 4.5, `“${td.textContent.trim()}” ${r.toFixed(2)}:1`);
  }
});

test("round 3: capitals are put on headings added later, without going over the whole page each time", async () => {
  const h = document.createElement("h2"); h.textContent = "new on the shelves";
  view().append(h);
  await until(() => h.textContent === "New on the Shelves", "the added heading’s capitals");
  const seen = [];
  const was = capitaliseEls; capitaliseEls = els => { seen.push([...els]); return was(els); };
  try {
    const card = document.createElement("div"); card.className = "spine-card"; card.textContent = "a hover card"; document.body.append(card);
    await wait(30); card.remove();
    eq(seen.length, 0, "a hover card isn’t a heading, so nothing to go over:");
  } finally { capitaliseEls = was; h.remove(); }
});

// ---------- her decisions of 22 Nov ----------
test("22 Nov (her ask, round 5): her stars are on the cover again, in the strip at its foot; an arrow and not selectable; no shadow trailing under a book page’s cover", async () => {
  for (const h of ["#shelf-fantasy", "#b-fx-moon"]) {
    await show(h);   // drawn without touching the address (Chrome stops a page changing it too often)
    const r = h === "#b-fx-moon" ? $(".book-top .cover .rated", view()) : $(`a.bk[href="#b-fx-moon"] .cover .rated`, view());
    ok(r, `${h}: the stars are on the cover`);
    const cs = getComputedStyle(r);
    eq([cs.position, cs.cursor, cs.userSelect], ["absolute", "default", "none"], `${h}: in the strip, an arrow, not selectable:`);
    ok(/gradient/.test(cs.backgroundImage), `${h}: the strip fades up from the foot`);
    eq(r.getAttribute("aria-label"), "4.5 stars", `${h}: read as words:`);
    eq(r.title, "4.5 stars", `${h}: its title:`);
  }
  await show("#b-fx-moon");
  ok(!$(".plate") && !$(".book-top > .rated"), "nothing under the cover");
  const sh = getComputedStyle($(".book-top .cover", view())).boxShadow;
  ok(!/26px|40px/.test(sh) && (sh.match(/rgb/g) || []).length === 4, `the frame’s four rings, no shadow under it: ${sh}`);
  await show("#shelf-fantasy");
  const rows = new Map();
  $$("#shelfBooks a.bk", view()).forEach(a => { const y = Math.round(a.getBoundingClientRect().top); (rows.get(y) || rows.set(y, []).get(y)).push(Math.round(a.querySelector("h3").getBoundingClientRect().top)); });
  rows.forEach((t, y) => eq(new Set(t).size, 1, `titles in the row at ${y} line up:`));
});

test("round 5: small copies on every cover grid (shelves, authors, history…), the cover itself on a book’s page; a missing copy falls back to the cover", async () => {
  eq(coverSrc({cover: "covers/9780000000001.jpg?v=1"}, false), "covers/thumbs/9780000000001.webp?v=1", "a cover card:");
  eq(coverSrc({cover: "covers/9780000000001.jpg"}, false, true), "covers/thumbs/9780000000001-s.webp", "banner:");
  eq(coverSrc({cover: "covers/9780000000001.jpg"}, true), "covers/9780000000001.jpg", "a book’s own page keeps the cover:");
  for (const h of ["#home", "#shelf-fantasy", "#shelves", "#history"]) {
    await show(h);
    const imgs = $$("a.bk .cover img", view()).filter(i => /covers\//.test(i.getAttribute("src")) && !/9790000000011/.test(i.getAttribute("src")));
    ok(imgs.length, `${h}: cover cards with copied covers`);
    ok(imgs.every(i => /covers\/thumbs\//.test(i.getAttribute("src"))), `${h}: the cards use the small copies`);
  }
  await show("#b-fx-moon");
  ok(/^covers\/[^/]+\.jpg/.test($(".book-top .cover img", view()).getAttribute("src")), "the book page: the cover itself");
  await show("#shelf-fantasy");
  const owl = $$("a.bk .cover img", view()).find(i => /9790000000011/.test(i.getAttribute("src")));
  ok(owl, "the Glass Owl on its shelf (its small copies taken away by test_site.py)");
  await until(() => !owl.isConnected || (owl.complete && owl.naturalWidth > 0 && !/thumbs/.test(owl.getAttribute("src"))), "the Glass Owl’s cover in place of its missing small copy", 5000);
  ok(owl.isConnected && /^covers\/9790000000011\.jpg/.test(owl.getAttribute("src")), `its cover shows, not a title card: ${owl.getAttribute("src")}`);
});

test("round 5: the search heading keeps “for” small when the term has no letters (an ISBN)", async () => {
  const h2 = el => { const e = document.createElement("div"); e.innerHTML = el; view().append(e); capitaliseEls(e.querySelectorAll("h2")); const t = e.querySelector("h2").textContent; e.remove(); return t; };
  eq(h2(`<h2>Results for <em class="keep">‘9790000000035’</em></h2>`), "Results for ‘9790000000035’", "an ISBN:");
  eq(h2(`<h2>Results for <em class="keep">‘harbour’</em></h2>`), "Results for ‘harbour’", "a word:");
  eq(h2(`<h2>Most books by</h2>`), "Most Books By", "a heading’s own last word still has its capital:");
});

test("round 5: the page itself, focused by script after a key press, draws no ring round itself; links keep theirs", async () => {
  view().focus(); eq(getComputedStyle(view()).outlineStyle, "none", "the page:");
  const rules = [...document.styleSheets].flatMap(s => { try { return [...s.cssRules]; } catch { return []; } });
  ok(rules.some(r => r.selectorText === ":focus-visible" && /solid/.test(r.style.outline)), "links and buttons still get a ring with the keyboard");
  view().blur();
});

test("round 5: Back returns to where the page was scrolled; a new page opens at the top", async () => {
  eq(history.scrollRestoration, "manual", "the site keeps the place itself:");
  const was = history.state, key = location.hash.slice(1) || "home";
  try {
    const put = y => until(() => { try { history.replaceState({...(history.state || {}), y}, ""); } catch {} return (history.state || {}).y === y; }, "the place kept in history", 12000);
    await put(300); route(key); await wait(50);
    ok(Math.abs(scrollY - Math.min(300, document.documentElement.scrollHeight - innerHeight)) <= 2, `kept place: ${scrollY}`);
    await put(null); route(key); await wait(50);
    eq(scrollY, 0, "no place kept: the top:");
  } finally { history.replaceState(was, ""); scrollTo(0, 0); }
});

test("round 5: a sidebar link reached with Tab is scrolled clear of the fade", async () => {
  const nav = $("#nav"), was = nav.style.cssText;
  try {
    nav.style.flex = "none"; nav.style.height = "200px"; nav.scrollTop = 0; navFades();
    const links = $$("a", nav), last = links[links.length - 1];
    last.focus(); await wait(50);
    const n = nav.getBoundingClientRect(), a = last.getBoundingClientRect();
    ok(a.bottom <= n.bottom && (!nav.classList.contains("more-below") || a.bottom <= n.bottom - 48), `the last link clear of the fade (${a.bottom} in ${n.bottom})`);
  } finally { document.activeElement.blur(); nav.style.cssText = was; navFades(); }
});

test("round 5: the Add page says her Library server didn’t answer (not Open Library) when it’s down", async () => {
  ok(/Library server didn’t answer/.test(SERVER_DOWN), "the message");
  const realF = window.fetch;
  try {
    let err = null;
    window.fetch = () => Promise.resolve(new Response("The library server (port 8020) is not running", {status: 503, headers: {"Content-Type": "text/html"}}));
    try { await api("api/lookup?isbn=1"); } catch (e) { err = e; }
    ok(err && err.server, "a 503 from the family server: the library server didn’t answer");
    err = null; window.fetch = () => Promise.reject(new TypeError("Failed to fetch"));
    try { await api("api/lookup?isbn=1"); } catch (e) { err = e; }
    ok(err && err.server, "no answer at all: the same");
    window.fetch = () => Promise.resolve(new Response(JSON.stringify({ok: false, error: "A book needs a title and a shelf."}), {status: 400, headers: {"Content-Type": "application/json"}}));
    eq((await api("api/books")).error, "A book needs a title and a shelf.", "the server’s own refusal still comes through:");
  } finally { window.fetch = realF; }
});

test("round 5: online (not her PC) the site doesn’t ask for its server", async () => {
  eq(ON_HER_PC, true, "the tests run on 127.0.0.1: her PC:");
  ok(checkLive.toString().includes("if (!ON_HER_PC) return Promise.resolve(null)"), "checkLive asks nothing elsewhere");
});

test("round 5: the format in words on a book page (a phone can’t show the sash’s hover title); sashes and seals labelled", async () => {
  const b = BOOKS.find(x => sgFor[x.id] && FORMATS[reading(x).format]);
  ok(b, "a book with a format in the made-up library");
  await show("#b-" + b.id);
  eq($(".sg-format", view())?.textContent, FORMATS[reading(b).format], "the format in the Your reading panel:");
  await show("#shelf-fantasy");
  ok($$(".cover .sash", view()).every(s => s.getAttribute("aria-label")), "sashes labelled");
  ok($$(".cover .seal", view()).every(s => s.getAttribute("aria-label")), "seals labelled");
});

test("round 5: the TEMPORARY Try switch (Header, Shelf list) is there, and never over the drawer", async () => {
  const box = $(".try-switch"); ok(box, "the switch");
  eq($$(".try-row", box).length, 2, "two rows:");
  eq($$("button", box).length, 7, "seven choices:");
  const rules = [...document.styleSheets].flatMap(s => { try { return [...s.cssRules]; } catch { return []; } });
  ok(rules.some(r => r.selectorText === ".jj-menu-open .try-switch" && r.style.display === "none"), "hidden while the drawer is open");
});

test("22 Nov: the sidebar fades at the foot while more links are below, at the top once scrolled, not at all when it fits", async () => {
  const nav = $("#nav"), was = nav.style.cssText;
  try {
    nav.style.flex = "none"; nav.style.height = "120px"; nav.scrollTop = 0; navFades();
    ok(nav.classList.contains("more-below") && !nav.classList.contains("more-above"), "at the top: a fade at the foot only");
    ok(getComputedStyle(nav).maskImage.includes("gradient"), "the fade is a mask (the cloth shows through)");
    nav.scrollTop = 40; nav.dispatchEvent(new Event("scroll")); await wait(0);
    ok(nav.classList.contains("more-above"), "scrolled down: a fade at the top");
    nav.scrollTop = nav.scrollHeight; nav.dispatchEvent(new Event("scroll")); await wait(0);
    ok(!nav.classList.contains("more-below"), "at the end: no fade at the foot");
    nav.style.height = "5000px"; nav.scrollTop = 0; navFades();
    ok(!nav.classList.contains("more-below") && !nav.classList.contains("more-above"), "everything fits: no fade");
  } finally { nav.style.cssText = was; navFades(); }
});

test("22 Nov: ISBN labels in plain capitals, blurbs ragged right (drop capital kept), Stats in the Bound book look", async () => {
  await show("#b-fx-apos");
  const dt =$$(".facts dt", view()).find(d => d.textContent === "ISBN-13");
  ok(dt, "an ISBN-13 label"); eq(getComputedStyle(dt).fontVariantCaps, "normal", "ISBN-13:");
  eq(getComputedStyle($$(".facts dt", view()).find(d => d.textContent === "Shelf")).fontVariantCaps, "small-caps", "the other labels stay small capitals:");
  const p = $(".desc", view()); ok(p, "a blurb"); eq(getComputedStyle(p).textAlign, "left", "the blurb:");
  ok(p.classList.contains("drop"), "the drop capital stays");
  await show("#stats");
  const panels = $$(".ledger", view()); ok(panels.length === 2, "two figure panels");
  for (const l of panels) {
    const cs = getComputedStyle(l);
    eq([cs.borderTopLeftRadius, cs.backgroundImage, cs.backgroundColor], ["0px", "none", getComputedStyle(document.documentElement).getPropertyValue("--surface").trim() === "#FAF4E6" ? "rgb(250, 244, 230)" : cs.backgroundColor],
      "the figures panel: square, on the page’s paper (no walnut cloth):");
  }
  const bar = $(".bar-row .track i", view()), dec = $(".decades i", view());
  eq([getComputedStyle(bar).borderTopLeftRadius, getComputedStyle(dec).borderTopLeftRadius], ["0px", "0px"], "square bars:");
  ok(/EB Garamond/.test(getComputedStyle($(".bar-row b", view())).fontFamily), "chart names in the book face");
});

test("22 Nov: Content Security Policy: only the site’s own code, and no page breaks it", async () => {
  const meta = $('meta[http-equiv="Content-Security-Policy"]');
  ok(meta, "the policy is in the page");
  const pol = meta.content;
  for (const d of ["default-src 'self'", "script-src 'self';", "object-src 'none'", "base-uri 'self'"]) ok(pol.includes(d), `the policy has ${d}`);
  // the test copy lets the tests open the site in frames and send their results; the real page embeds no frames
  const real = new DOMParser().parseFromString(await (await realFetch("index.html", {cache: "no-store"})).text(), "text/html");
  const realPol = real.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content || "";
  for (const d of ["frame-src 'none'", "connect-src 'self';"]) ok(realPol.includes(d), `the real page’s policy has ${d}`);
  ok(!/script-src[^;]*('unsafe-inline'|'unsafe-eval'|https?:)/.test(pol), "no inline, eval or other sites’ scripts");
  ok(meta.compareDocumentPosition($("script")) & Node.DOCUMENT_POSITION_FOLLOWING, "the policy comes before every script");
  const routes = ["#home", "#shelves", "#authors", "#reading", "#history", "#add", "#to-buy", "#stats", "#trial-covers", "#old-to-find",
    ...OLD_KINDS.map(k => "#old-" + k[0]), ...DATA.shelves.map(s => "#shelf-" + s.id), ...DATA.books.map(b => "#b-" + b.id),
    ...Object.keys(authorIndex).map(k => "#a-" + k), ...ELSEWHERE.map(e => "#r-" + SG.books.indexOf(e))];
  const inline = [];
  for (const h of routes) {
    await show(h);
    for (const el of document.querySelectorAll("*")) for (const a of el.attributes) {
      if (/^on/i.test(a.name)) inline.push(`${h}: <${el.tagName.toLowerCase()} ${a.name}>`);
      if (/^\s*javascript:/i.test(a.value)) inline.push(`${h}: ${a.name}="${a.value}"`);
    }
  }
  type(q, "moon"); await wait(0); type(q, ""); await wait(0);
  eq(inline.slice(0, 10), [], "inline handlers or javascript: links:");
  await wait(300);   // reports come a moment after
  eq(cspSeen(), [], "Content Security Policy violations:");
  // and the watch works: an inline script is refused and seen
  const s = document.createElement("script"); s.textContent = "window.cspLeak = 1"; document.head.append(s);
  await until(() => cspSeen().length > 0, "the refused inline script to be reported", 3000);
  ok(!window.cspLeak, "the inline script didn’t run");
  s.remove(); CSP_SEEN.clear();
});

test("22 Nov: each dot in the footer’s credits has the same space on both sides", async () => {
  const dots = $$("[data-jj-credits] .jj-dot").filter(d => d.style.display !== "none" && d.getClientRects().length);
  ok(dots.length >= 2, "dots shown between the credits");
  for (const d of dots) {
    const r = document.createRange(), t = d.firstChild; r.setStart(t, t.length - 1); r.setEnd(t, t.length);
    const dot = r.getBoundingClientRect(), prev = d.previousElementSibling.getBoundingClientRect(), next = d.nextElementSibling.getBoundingClientRect();
    if (Math.abs(prev.top - next.top) > 2) continue;   // a dot at a line end is hidden anyway
    const before = dot.left - prev.right, after = next.left - dot.right;
    ok(Math.abs(before - after) <= 1 && before >= 3, `${d.previousElementSibling.textContent}: ${before.toFixed(1)}px before the dot, ${after.toFixed(1)}px after`);
  }
});
