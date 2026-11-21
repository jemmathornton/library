// Page tests on a copy of HER library (tests/e2e/test_site.py; toolkit in harness.js). These are about her data as
// it is: every page opens, every link and picture works, and every page's figures agree with what the page lists.
// Tests about how the site behaves (titles, series, search, the Add page…) are in fixture.test.js, on made-up books.

// ---------- every page ----------
test("every page opens with no errors, blanks or leftovers, and every link goes somewhere", async () => {
  const problems = [], errs = [], seen = new Set();
  const onErr = e => errs.push(e.message || String(e.reason)); addEventListener("error", onErr);
  let fellBack = false; const home = window.pageHome; window.pageHome = (...a) => { fellBack = true; return home(...a); };
  const routes = ["#home", "#shelves", "#authors", "#reading", "#history", "#add", "#to-buy", "#stats", "#trial-covers", "#old-to-find",
    ...OLD_KINDS.map(k => "#old-" + k[0]), ...DATA.shelves.map(s => "#shelf-" + s.id), ...DATA.books.map(b => "#b-" + b.id),
    ...Object.keys(authorIndex).map(k => "#a-" + k), ...ELSEWHERE.map(e => "#r-" + SG.books.indexOf(e))];
  const links = new Set();
  try {
    for (const h of routes) {
      if (seen.has(h)) continue; seen.add(h);
      fellBack = false; const before = errs.length;
      await show(h);
      const text = view().innerText;
      if (fellBack && h !== "#home") problems.push(`${h}: doesn’t exist`);
      if (errs.length > before) problems.push(`${h}: ${errs.slice(before).join(" / ")}`);
      if (text.trim().length < 20) problems.push(`${h}: empty`);
      const bad = text.match(/\bundefined\b|\bNaN\b|\[object [A-Za-z]+\]/); if (bad) problems.push(`${h}: shows ${bad[0]}`);
      view().querySelectorAll('a[href^="#"]').forEach(a => links.add(a.getAttribute("href")));
    }
    for (const h of links) {
      if (seen.has(h) || h === "#") continue; seen.add(h);
      fellBack = false; await show(h);
      if (fellBack && h !== "#home") problems.push(`link to ${h}: doesn’t exist`);
    }
  } finally { window.pageHome = home; removeEventListener("error", onErr); }
  eq(problems.slice(0, 20), [], `${seen.size} pages:`);
});

test("pictures on the pages load", async () => {
  const srcs = new Set();
  for (const h of ["#home", ...DATA.shelves.map(s => "#shelf-" + s.id), "#to-buy", ...OLD_KINDS.map(k => "#old-" + k[0])]) {
    await show(h); view().querySelectorAll("img[src]").forEach(i => { const s = i.getAttribute("src"); if (!/^https?:/.test(s)) srcs.add(s); });
  }
  // loaded a few at a time, and a failure tried once more: 700 at once can drop one that is there (19 Nov)
  const load = src => new Promise(done => { const i = new Image(); i.onload = () => done(true); i.onerror = () => done(false); i.src = src; });
  const missing = [], list = [...srcs];
  for (let k = 0; k < list.length; k += 40) await Promise.all(list.slice(k, k + 40).map(async src => { if (!(await load(src)) && !(await load(src + (src.includes("?") ? "&" : "?") + "again"))) missing.push(src); }));
  eq(missing, [], `${srcs.size} pictures:`);
});

// ---------- each page's figures (19 Nov): each number right for what it says it counts ----------
// Copies against books is her open question (TODO 9), so the banner and the toolbar aren't made to agree: the banner's
// "books" is the copies on the shelf, its "read" each book once, and the toolbar's count is what the list shows.
test("sidebar counts match the pages they open", async () => {
  await go("#home");
  const wrong = [];
  $$("#nav a[href^='#shelf-'], #nav a[href^='#old-']").forEach(a => {
    const n = +(a.querySelector(".n")?.textContent ?? NaN), h = a.getAttribute("href");
    const real = h.startsWith("#shelf-") ? shelfIndex[h.slice(7)].books.length : h === "#old-to-find" ? WISH.filter(w => w.old).length : oldBooks(h.slice(5)).length;
    if (n !== real) wrong.push(`${h} says ${n}, has ${real}`);
  });
  eq(navCount("#shelves"), BOOKS.length, "All shelves:");
  eq(navCount("#to-buy"), WISH.length, "To buy:");
  eq(navCount("#authors"), AUTHORS.length, "Authors:");
  eq(wrong, []);
});

test("every shelf’s banner figures count what they say", async () => {
  const wrong = [];
  for (const s of SHELVES.filter(s => s.books.length)) {
    await go("#shelf-" + s.id);
    const f = figures(), want = {books: s.books.length, authors: new Set(s.books.flatMap(b => (b.authors || []).filter(a => !a.role).map(a => a.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim()))).size,   // people, not "A & B" strings (review, 21 Nov)
      read: booksRead(s.books),
      pages: s.books.reduce((n, b) => n + (b.pages || 0), 0), ...((s.notOwned || []).some(isRead) ? {"read but not owned": s.notOwned.filter(isRead).length} : {})};
    for (const [k, v] of Object.entries(want)) if (f[k] !== v) wrong.push(`${s.id}: “${k}” says ${f[k]}, should be ${v}`);
    if (navCount("#shelf-" + s.id) !== null && navCount("#shelf-" + s.id) !== f.books) wrong.push(`${s.id}: sidebar ${navCount("#shelf-" + s.id)}, banner ${f.books}`);
  }
  eq(wrong, []);
});

test("every shelf’s toolbar count is the number of books it lists, under each filter", async () => {
  const wrong = [];
  for (const s of SHELVES.filter(s => s.books.length)) {
    await go("#shelf-" + s.id);
    for (const [k, [label, keep]] of Object.entries(FILTERS)) {
      click($(`[data-filter="${k}"]`));
      const shown = shownBooks(), want = s.books.concat(s.notOwned || []).filter(keep).length;
      if (countText().toLowerCase() !== plural(shown.length, "book").toLowerCase()) wrong.push(`${s.id} ${label}: says “${countText()}”, lists ${shown.length}`);
      if (shown.length !== want) wrong.push(`${s.id} ${label}: lists ${shown.length}, should be ${want}`);
      const stray = shown.map(bookAt).filter(b => !b || !keep(b));
      if (stray.length) wrong.push(`${s.id} ${label}: lists ${stray.length} that don’t fit the filter`);
    }
  }
  eq(wrong.slice(0, 15), []);
});

test("All shelves: each shelf’s part counts its own books, and the banner counts the library", async () => {
  await go("#shelves");
  const f = figures();
  eq([f.books, f.read, f.authors], [BOOKS.length, booksRead(BOOKS), AUTHORS.length], "banner books, read, authors:");
  eq(f.shelves, SHELVES.filter(s => s.books.length && s.libib).length, "banner shelves:");
  const wrong = [];
  let total = 0;
  $$("#shelfBooks section.shelf-part").forEach(sec => {
    const n = shownBooks(sec).length, said = +($(".section-head .more", sec).textContent.replace(/\D/g, ""));
    if (n !== said) wrong.push(`${$(".section-head h2", sec).textContent}: says ${said}, lists ${n}`);
    total += n;
  });
  eq(wrong, []);
  eq(total, BOOKS.length + NOT_OWNED.length, "all the parts together:");
  eq(countText().toLowerCase(), plural(total, "book").toLowerCase(), "toolbar:");
});

test("Home figures agree with the reading and the shelves", async () => {
  await go("#home");
  const f = figures(), y = String(new Date().getFullYear());
  eq(f["read in " + y], finishedIn(y).length, "read this year:");
  eq(f["books on the shelves"], BOOKS.length, "books on the shelves:");
  eq(f["not read yet on your shelves"], booksUnread(BOOKS), "not read yet:");
  eq(f.authors, AUTHORS.length, "authors:");
  eq($$(".now-row .now-card", view()).length, readingLog().filter(isReading).length, "reading now cards:");
});

test("Reading page figures agree with its lists and with Home", async () => {
  await go("#reading");
  const f = figures(), y = String(new Date().getFullYear()), log = readingLog();
  eq(f["reading now"], log.filter(isReading).length, "reading now:");
  eq(f.read, log.filter(isRead).length, "read:");
  eq(f["finished in " + y], finishedIn(y).length, "finished this year:");
  eq(f["not read yet on your shelves"], booksUnread(BOOKS), "not read yet:");
  const m = /([\d,]+) of the books you’ve read are on your shelves; ([\d,]+) aren’t/i.exec(view().innerText);
  ok(m, "no shelves / not owned line");
  eq(+m[1].replace(/,/g, "") + +m[2].replace(/,/g, ""), f.read, "on the shelves + not:");
  if (log.some(isReading)) eq(navCount("#reading"), f["reading now"], "sidebar Reading:");
});

test("History: each year’s count is the books in it, and the banner’s read is Reading’s", async () => {
  await go("#history");
  const f = figures();
  eq(f.read, readingLog().filter(isRead).length);
  const wrong = [];
  $$("details.year", view()).forEach(d => {
    const said = /·\s*([\d,]+)/.exec($("summary h2", d).textContent), n = $$("a.bk", d).length;
    if (said && +said[1].replace(/,/g, "") !== n) wrong.push(`${$("summary h2", d).textContent}: lists ${n}`);
  });
  eq(wrong, []);
  eq(f.years, $$("details.year", view()).filter(d => /^\d{4}/.test($("summary h2", d).textContent.trim())).length, "years:");
});

test("Stats figures agree with the shelves and the reading", async () => {
  await go("#stats");
  const text = view().innerText, y = String(new Date().getFullYear());
  const meter = label => { const m = $$(".meter", view()).find(x => x.querySelector("span").textContent.startsWith(label)); return m && +m.querySelector("b").textContent.replace(/[^\d]/g, ""); };
  eq(meter("books on the shelves"), BOOKS.length, "books on the shelves:");
  eq(meter("books read"), readingLog().filter(isRead).length, "books read:");
  eq(meter("finished in " + y), finishedIn(y).length, "finished this year:");
  ok(new RegExp(`read \\(${plural(booksRead(BOOKS), "book")}\\)`, "i").test(text), "no “read (n books)” line");
});

test("old books: each kind’s page lists as many books as its banner and the sidebar say", async () => {
  const wrong = [];
  for (const [k] of OLD_KINDS) {
    await go("#old-" + k);
    const f = figures(), n = $$("[data-spine]", view()).length;
    if (f.books !== oldBooks(k).length || n !== f.books || navCount("#old-" + k) !== f.books) wrong.push(`${k}: banner ${f.books}, spines ${n}, sidebar ${navCount("#old-" + k)}, has ${oldBooks(k).length}`);
  }
  eq(wrong, []);
});

test("To buy: the banner counts the two lists it shows, which make the whole list", async () => {
  await go("#to-buy");
  const f = figures(), parts = $$(".wish", view()).map(w => w.querySelectorAll(".wish-item").length);
  eq([f["to buy"], f["old books to find"]], [WISH.filter(w => !w.old).length, WISH.filter(w => w.old).length]);
  eq(parts.reduce((a, b) => a + b, 0), WISH.length, "listed:");
  eq(parts[0], f["to buy"], "first list:");
});

test("“not read yet” leaves out books she didn’t finish or paused", async () => {
  ok(!BOOKS.some(b => ["stopped", "paused"].includes(reading(b).status) && isUnread(b)), "a DNF or paused book counts as unread");
});
