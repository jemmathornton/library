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
// her call, 21 Nov: figures count each book once however many copies she owns ("authors" = writers); the count over a
// shelf's books says the owned books once each, and the not-owned ones apart
const once = list => new Set(list.map(bookKey)).size;
const countSays = books => { const own = books.filter(b => !b.notOwned), away = books.length - own.length;
  return (!own.length && away ? `${away} not owned` : plural(once(own), "book") + (away ? ` · ${away} not owned` : "")).toLowerCase(); };
const writers = () => AUTHORS.filter(a => a.books.some(x => !x.role)).length;

test("an author’s page counts each of their books once, however many copies (J. K. Rowling: 14, not 28)", async () => {   // her call, 21 Nov
  const wrong = [];
  for (const a of AUTHORS) {
    await show("#a-" + a.id);
    const want = once(a.books.map(x => x.book)), said = figures().books ?? figures().book;
    if (said !== want) wrong.push(`${a.name}: says ${said}, has ${want}`);
  }
  eq(wrong.slice(0, 10), []);
  const jkr = AUTHORS.find(a => a.name === "J. K. Rowling");
  if (jkr) ok(once(jkr.books.map(x => x.book)) < jkr.books.length, "her copies of Rowling's books are more than her Rowling books");
});

test("sidebar counts match the pages they open", async () => {
  await go("#home");
  const wrong = [];
  $$("#nav a[href^='#shelf-'], #nav a[href^='#old-']").forEach(a => {
    const n = +(a.querySelector(".n")?.textContent ?? NaN), h = a.getAttribute("href");
    const real = h.startsWith("#shelf-") ? once(shelfIndex[h.slice(7)].books) : h === "#old-to-find" ? WISH.filter(w => w.old).length : oldBooks(h.slice(5)).length;
    if (n !== real) wrong.push(`${h} says ${n}, has ${real}`);
  });
  eq(navCount("#shelves"), once(BOOKS), "All shelves:");
  eq(navCount("#to-buy"), WISH.length, "To buy:");
  eq(navCount("#authors"), AUTHORS.length, "Authors:");
  eq(wrong, []);
});

test("every shelf’s banner figures count what they say", async () => {
  const wrong = [];
  for (const s of SHELVES.filter(s => s.books.length)) {
    await go("#shelf-" + s.id);
    const f = figures(), want = {books: once(s.books), authors: new Set(s.books.flatMap(b => (b.authors || []).filter(a => !a.role).map(a => slug(a.name)))).size,   // people, not "A & B" strings (review, 21 Nov)
      read: booksRead(s.books),
      ...(s.books.some(b => b.pages) ? {pages: [...s.books.reduce((m, b) => m.set(bookKey(b), Math.max(m.get(bookKey(b)) || 0, b.pages || 0)), new Map()).values()].reduce((a, n) => a + n, 0)} : {}), ...((s.notOwned || []).some(isRead) ? {"read but not owned": s.notOwned.filter(isRead).length} : {})};
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
      if (countText().toLowerCase() !== countSays(shown.map(bookAt))) wrong.push(`${s.id} ${label}: says “${countText()}”, lists ${countSays(shown.map(bookAt))}`);
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
  eq([f.books, f.read, f.authors], [once(BOOKS), booksRead(BOOKS), writers()], "banner books, read, authors:");
  eq(f.shelves, SHELVES.filter(s => s.books.length && s.libib).length, "banner shelves:");
  const wrong = [];
  let total = 0;
  $$("#shelfBooks section.shelf-part").forEach(sec => {
    const n = shownBooks(sec).length, said = $(".section-head .more", sec).textContent.trim().toLowerCase(), want = countSays(shownBooks(sec).map(bookAt));
    if (said !== want) wrong.push(`${$(".section-head h2", sec).textContent}: says ${said}, lists ${want}`);
    total += n;
  });
  eq(wrong, []);
  eq(total, BOOKS.length + NOT_OWNED.length, "all the parts together:");
  eq(countText().toLowerCase(), countSays(shownBooks().map(bookAt)), "toolbar:");
});

test("Home figures agree with the reading and the shelves", async () => {
  await go("#home");
  const f = figures(), y = String(new Date().getFullYear());
  eq(f["read in " + y], finishedIn(y).length, "read this year:");
  eq(f["books on the shelves"], once(BOOKS), "books on the shelves:");
  eq(f["not read yet on your shelves"], booksUnread(BOOKS), "not read yet:");
  eq(f.authors, writers(), "authors:");
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
  eq(meter("books on the shelves"), once(BOOKS), "books on the shelves:");
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

// round 5 (22 Nov): at 1300-1920 wide the title page's words ran into the plate of covers and its rules over the covers
test("round 5: the header (title page): its words stop short of the plate, and nothing runs off the right, 901 to 1920 wide", async () => {
  const problems = [];
  const f = document.createElement("iframe"); f.src = "index.html";
  f.style.cssText = "position:fixed;left:-5000px;top:0;width:1600px;height:900px;border:0";
  await new Promise(done => { f.onload = done; document.body.append(f); });
  try {
    const win = f.contentWindow, d = f.contentDocument;
    await until(() => d.getElementById("view") && d.getElementById("view").innerText.trim().length > 20, "the framed page", 15000);
    for (const h of ["home", "shelf-fantasy", "a-enid-blyton", "stats"]) {
      win.route(h); await wait(30);
      for (const w of [901, 1000, 1300, 1536, 1600, 1920]) {   // one frame made wider and narrower (a fresh one each time was too slow)
        f.style.width = w + "px"; await new Promise(r => win.requestAnimationFrame(() => win.requestAnimationFrame(r)));
        const cw = d.documentElement.clientWidth, hero = d.querySelector("#view .hero"), plate = hero && hero.querySelector(".hero-shelf");
        d.querySelectorAll("#view .hero, #view .hero *, #view .section-head, #view .section-head *").forEach(el => {
          const b = el.getBoundingClientRect(); if (b.width && b.right > cw + 0.5) problems.push(`${h} @${w}: ${el.tagName}.${el.className} past the right edge`); });
        if (plate && w > 900) {   // beside the words in the header (round 5: her header)
          const p = plate.getBoundingClientRect();
          hero.querySelectorAll(":scope > :not(.hero-shelf)").forEach(el => { const b = el.getBoundingClientRect();
            if (b.width && b.right > p.left && b.bottom > p.top && b.top < p.bottom) problems.push(`${h} @${w}: ${el.tagName}.${el.className} into the plate`); });
        }
      }
    }
  } finally { f.remove(); }
  eq([...new Set(problems)].slice(0, 12), [], "overlaps:");
});

// her rules for the header's spines (22 Nov): one book from each shelf in turn on the whole-library pages, never two by one author or
// from one series; a shelf page only its own books; title and author on every spine
test("22 Nov: the header's spines: each shelf in turn on Home and All shelves, no author or series twice, title and author on every spine", async () => {
  const shelves = new Set(BOOKS.filter(b => b.cover).map(b => b.shelf)).size;
  for (const list of [[...BOOKS], [...BOOKS].sort(SORTS.added[1])]) {   // All shelves, Authors, Stats; Home
    const picked = variedPick(list, 30);
    eq(new Set(picked.slice(0, shelves).map(b => b.shelf)).size, Math.min(shelves, picked.length), "every shelf before any shelf twice:");
    const authors = picked.map(b => slug(b.by || "")).filter(Boolean);
    eq(authors.length, new Set(authors).size, "no author twice:");
    const series = picked.map(b => ((seriesOf[b.id] || [])[0] || {series: {}}).series.name).filter(Boolean);
    eq(series.length, new Set(series).size, "no series twice:");
  }
  const fantasy = shelfIndex["fantasy"];
  if (fantasy) ok(variedPick(fantasy.books, 30).every(b => b.shelf === "fantasy"), "a shelf page: only its own books");
  await show("#home"); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); fitSpines();
  const spines = $$("#view .hero-shelf .sp:not([hidden])");
  ok(spines.every(sp => !/rowling|harry potter/i.test(sp.textContent)), "no Harry Potter book on Home's spines");
  ok(spines.length >= 6, `spines on Home: ${spines.length}`);
  for (const sp of spines) { const i = sp.querySelector(".t i"); ok(i && i.textContent.trim() && getComputedStyle(i).display !== "none", "an author on every spine: " + sp.textContent); }
});

// her ask (22 Nov): a variety of colours in the header's spines, never two alike side by side (OKLab distance SPINE_GAP or more)
test("22 Nov: the header's spines: no two neighbours of a similar colour", async () => {
  const mk = (id, spine, shelf) => ({id, t: id, by: id, authors: [{name: id}], shelf, cover: "x", spine});
  const sh = SHELVES[0].id, row = spineOrder(["#7a1010", "#7b1212", "#7c1414", "#203070", "#e0d0a0", "#215030"].map((c, i) => mk("c" + i, c, sh)), () => 0);
  for (let i = 1; i < row.length; i++) ok(labGap(spineLab(row[i - 1]), spineLab(row[i])) >= SPINE_GAP, "made-up row: neighbours differ: " + row.map(b => b.spine));
  const colourOf = sp => { const m = sp.style.getPropertyValue("--c").trim(); return hexLab(m); };
  for (const h of ["#home", "#shelves"]) {
    await show(h); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); fitSpines();
    const spines = $$("#view .hero-shelf .sp:not([hidden])");
    if (BOOKS.length < 100) continue;   // the made-up library is too small to always manage it
    for (let i = 1; i < spines.length; i++) {
      const g = labGap(colourOf(spines[i - 1]), colourOf(spines[i]));
      ok(g >= SPINE_GAP, `${h}: spines ${i} and ${i + 1} too alike (${g.toFixed(3)}): ${spines[i - 1].style.getPropertyValue("--c")} ${spines[i].style.getPropertyValue("--c")}`);
    }
  }
});

// her decision (22 Nov): no J.K. Rowling / Harry Potter book in any header's spines (SPINE_EXCLUDE in app.js); a shelf page still
// tops up from its other books. The made-up library has no such books, so a few are added here, on a shelf and on a shelf of their own.
test("22 Nov: no Harry Potter books in the header's spines", async () => {
  const shelf = BOOKS.find(b => b.cover).shelf, cover = BOOKS.find(b => b.cover).cover;
  const hp = [
    {id: "hp-1", t: "Harry Potter and the Goblet of Fire", by: "J. K. Rowling", authors: [{name: "J. K. Rowling"}]},
    {id: "hp-2", t: "The Casual Vacancy", by: "J.K. Rowling", authors: [{name: "J.K. Rowling"}]},
    {id: "hp-3", t: "Quidditch Through the Ages", by: "Kennilworthy Whisp", authors: [{name: "Kennilworthy Whisp"}]},
    {id: "hp-4", t: "The Tales of Beedle the Bard", by: "Someone Else", authors: [{name: "Someone Else"}]},
    {id: "hp-5", t: "Fantastic Beasts: The Crimes of Grindelwald", by: "Someone Else", authors: [{name: "Someone Else"}]},
    {id: "hp-6", t: "Harry Potter and the Cursed Child", by: "Jack Thorne & John Tiffany", authors: [{name: "Jack Thorne"}, {name: "John Tiffany"}]},
  ].map(b => ({...b, shelf, cover}));
  const isHP = b => b.id.startsWith("hp-");
  ok(hp.every(spineExcluded), "every one is on the exclusion list");
  const hpLike = b => /rowling/i.test((b.authors || []).map(a => a.name).join(" ") + " " + b.by)
    || /harry potter|hogwarts|fantastic beasts|quidditch|beedle the bard|cursed child/i.test(b.t + " " + (b.title || ""));
  eq(BOOKS.filter(spineExcluded).filter(b => !hpLike(b)).map(b => b.t), [], "no other book is left out:");
  for (const s of SHELVES) ok(!variedPick(s.books, 30).some(spineExcluded), "none on the page of the shelf " + s.id);
  for (const list of [[...hp, ...BOOKS], [...BOOKS, ...hp]]) ok(!variedPick(list, 30).some(isHP), "none picked for the whole library");
  const own = BOOKS.filter(b => b.shelf === shelf);
  const picked = variedPick([...hp, ...own], 30);
  ok(!picked.some(isHP), "none picked on their shelf's page");
  eq(picked.length, Math.min(30, own.filter(b => b.cover).length), "the shelf page still topped up from its other books:");
  for (const h of ["#home", "#shelves", "#shelf-" + shelf]) {
    await show(h);
    ok(!$$("#view .hero-shelf .sp").some(sp => /rowling|harry potter/i.test(sp.textContent)), "no Harry Potter spine on " + h);
  }
});
