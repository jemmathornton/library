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
  f.onload = async () => { try { await until(() => f.contentDocument.getElementById("modeBtn")?.textContent, "the reloaded page"); done(f); } catch (e) { fail(e); } };
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
  ok(footBtns().every(b => b.querySelector("svg") && b.tagName === "BUTTON"), "each is a button with its icon");
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
  localStorage.removeItem("jemmas-library-mode");
  const f = await reloaded();
  try { eq(mode(f.contentDocument), "light", "opened afresh:"); eq(f.contentDocument.getElementById("modeBtn").textContent.trim(), "Dark mode"); } finally { f.remove(); }
});

test("Dark mode switches the page to dark and back, and the button says what it will do", async () => {
  await show("#home");
  const light = getComputedStyle(document.body).backgroundColor;
  click($("#modeBtn"));
  eq(mode(), "dark");
  eq($("#modeBtn").textContent.trim(), "Light mode"); eq($("#modeBtn").getAttribute("aria-pressed"), "true");
  const dark = getComputedStyle(document.body).backgroundColor;
  ok(dark !== light && dark === "rgb(28, 22, 16)", `the page didn’t turn dark (${dark})`);
  click($("#modeBtn"));
  eq(mode(), "light"); eq($("#modeBtn").textContent.trim(), "Dark mode"); eq($("#modeBtn").getAttribute("aria-pressed"), "false");
  eq(getComputedStyle(document.body).backgroundColor, light, "back to light:");
});

test("dark mode is remembered when the site opens again, and so is going back to light", async () => {
  click($("#modeBtn")); eq(mode(), "dark");
  eq(localStorage.getItem("jemmas-library-mode"), "dark");
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
