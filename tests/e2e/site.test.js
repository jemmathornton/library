// Page tests: loaded into the real site (a throwaway copy) in headless Chrome by tests/e2e/test_site.py.
// Each test drives the page the way she would (clicks, typing, routes) and checks what's on screen. Results go into
// <pre id="test-results"> as JSON for Python to read. Calls to the server are answered by a fake where a test says so.
(() => {
  const tests = [], wait = ms => new Promise(r => setTimeout(r, ms));
  const test = (name, fn) => tests.push([name, fn]);
  const eq = (a, b, msg) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg || ""} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
  const ok = (v, msg) => { if (!v) throw new Error(msg || "not true"); };
  const view = () => document.getElementById("view");
  // the address changes without a hashchange event (a thousand queued ones would fire during later tests);
  // route() is what the event would call
  const go = async h => {
    history.replaceState(null, "", h);
    if (location.hash !== (h === "#home" && !location.hash ? "" : h)) throw new Error(`the browser didn’t change the address to ${h} (too many changes too fast?)`);
    route(); await wait(0);
  };
  // for the sweeps over every page: the page is drawn without touching the address
  const show = async h => { route(h.slice(1)); await wait(0); };
  // a link she clicks: the browser's own navigation, then whatever the hashchange does
  const follow = async el => { click(el); await wait(30); };
  const type = (el, v) => { el.value = v; el.dispatchEvent(new Event("input", {bubbles: true})); };
  const click = el => el.dispatchEvent(new MouseEvent("click", {bubbles: true}));
  // a fake server for the Add page: answers by path, records what was sent
  const realFetch = window.fetch.bind(window);
  let fake = null; const sent = [];
  window.fetch = (url, opts = {}) => {
    const path = String(url).replace(location.origin + "/", "").split("?")[0];
    if (fake && fake[path]) { sent.push([path, String(url), opts.body || null]); return Promise.resolve(fake[path](String(url), opts)).then(v => new Response(JSON.stringify(v))); }
    return realFetch(url, opts);
  };
  const freshAdd = () => { addForm = {isbn: "", title: "", authors: "", publisher: "", published: "", pages: "", cover: "", shelf: "", note: "", busy: false}; };
  const until = async (cond, ms = 3000) => { for (let t = 0; t < ms && !cond(); t += 20) await wait(20); ok(cond(), "timed out waiting"); };

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
    const missing = [];
    await Promise.all([...srcs].map(src => new Promise(done => { const i = new Image(); i.onload = done; i.onerror = () => { missing.push(src); done(); }; i.src = src; })));
    eq(missing, [], `${srcs.size} pictures:`);
  });

  test("sidebar counts match the pages they open", async () => {
    await go("#home");
    const wrong = [];
    document.querySelectorAll("#nav a[href^='#shelf-'], #nav a[href^='#old-']").forEach(a => {
      const n = +(a.querySelector(".n")?.textContent ?? NaN), h = a.getAttribute("href");
      const real = h.startsWith("#shelf-") ? shelfIndex[h.slice(7)].books.length : h === "#old-to-find" ? WISH.filter(w => w.old).length : oldBooks(h.slice(5)).length;
      if (n !== real) wrong.push(`${h} says ${n}, has ${real}`);
    });
    eq(wrong, []);
  });

  test("a book page lights up its shelf; an old book lights up its kind", async () => {
    const b = BOOKS.find(x => x.shelf !== COLLECTION), old = BOOKS.find(x => x.shelf === COLLECTION);
    await go("#b-" + b.id); eq(document.querySelector("#nav a.on")?.getAttribute("href"), "#shelf-" + b.shelf);
    await go("#b-" + old.id); ok(/^#old-/.test(document.querySelector("#nav a.on")?.getAttribute("href") || ""), "no old-books kind lit");
  });

  // ---------- search ----------
  const searchFor = async v => { type(q, v); await wait(0); return view().innerText; };
  test("search finds a book by the title the site shows, not only Libib’s", async () => {
    const b = BOOKS.find(x => x.t && x.t !== x.title && !x.title.toLowerCase().includes(x.t.toLowerCase()) && x.t.length > 6);
    ok(b, "no book shows a different title");
    ok((await searchFor(b.t)).includes(b.t), `“${b.t}” not found`);
    q.value = "";
  });

  test("search copes with a curly apostrophe", async () => {
    const b = BOOKS.find(x => x.title.includes("'") && x.title.length > 8);
    const word = b.title.replace(/'/g, "’");
    ok(!/No books match/.test(await searchFor(word)), word);
    q.value = "";
  });

  test("search by ISBN", async () => {
    const b = BOOKS.find(x => x.isbn13);
    ok((await searchFor(b.isbn13)).includes(b.t));
    q.value = "";
  });

  test("clicking the page you’re on clears the search", async () => {
    await go("#reading");
    await searchFor("the");
    ok(/Results for/.test(view().innerText));
    click(document.querySelector('#nav a[href="#reading"]')); await wait(0);
    eq(q.value, ""); ok(!/Results for/.test(view().innerText), "results still showing");
  });

  // ---------- old books ----------
  test("old books: series in author-surname order, numbers on the spines, gaps for missing books", async () => {
    for (const [k] of OLD_KINDS) {
      await go("#old-" + k);
      const heads = [...view().querySelectorAll(".shelf-head, h3, .bookshelf")].length;
      ok(heads, `#old-${k} has no shelves`);
    }
    await go("#old-childrens");
    const names = [...view().querySelectorAll(".shelf-name")].map(n => n.textContent.trim()).filter(n => n.includes(" – "));
    ok(names.length > 3, "too few series shelves");
    const surname = n => n.split(" – ")[1].split(/ & |, /)[0].trim().split(" ").pop();
    const sorted = [...names].sort((a, b) => surname(a).localeCompare(surname(b)));
    eq(names.map(surname), sorted.map(surname), "series not in author-surname order:");
    ok(view().querySelector(".spine .no"), "no series numbers");
    ok(view().querySelector(".spine.gap"), "no gaps for missing books");
  });

  test("pointing at a spine shows its card, which goes on scroll", async () => {
    await go("#old-childrens");
    const s = view().querySelector("[data-spine]");
    s.dispatchEvent(new MouseEvent("mouseover", {bubbles: true}));
    const card = document.getElementById("spineCard");
    ok(card && card.textContent.includes(bookIndex[s.dataset.spine].t), "no card");
    dispatchEvent(new Event("scroll")); await wait(0);
    ok(!document.getElementById("spineCard"), "card stayed");
  });

  test("condition and inscription only on old books, inscription shown as typed", async () => {
    const old = BOOKS.find(x => x.shelf === COLLECTION), other = BOOKS.find(x => x.shelf !== COLLECTION);
    await go("#b-" + other.id); ok(!view().querySelector("[data-cond-id], [data-inscr-id]"), "picker on a modern book");
    old.inscription = "To Mary, ‘with love’ & \"best\"";
    await go("#b-" + old.id);
    eq(view().querySelector("[data-inscr-id]").value, old.inscription);
    ok(view().querySelector("[data-cond-id]"));
    delete old.inscription;
  });

  test("the trial-covers switch shows on the old books’ pages only", async () => {
    const sw = document.querySelector(".trial-switch");
    await go("#old-childrens"); dispatchEvent(new HashChangeEvent("hashchange")); ok(!sw.hidden, "hidden on old books");
    await go("#home"); dispatchEvent(new HashChangeEvent("hashchange")); ok(sw.hidden, "shown on home");
  });

  // ---------- Add a book (fake server) ----------
  test("Look it up fills the form", async () => {
    fake = {"api/lookup": () => ({found: true, title: "Fake Book", authors: ["Ann A", "Bo B"], publisher: "P", published: "2024", pages: 300, cover: "", categories: ["Fantasy"]})};
    freshAdd(); await go("#add");
    document.getElementById("add-isbn").value = "9780306406157";
    click(document.getElementById("addLookup"));
    await until(() => !addForm.looking);
    eq([document.getElementById("add-title").value, document.getElementById("add-authors").value], ["Fake Book", "Ann A, Bo B"]);
    fake = null;
  });

  test("Look it up runs once, and a late answer for an old number is dropped", async () => {
    let release; const slow = new Promise(r => release = r); let calls = 0;
    fake = {"api/lookup": () => (calls++, slow.then(() => ({found: true, title: "Old Number's Book", authors: [], publisher: "", published: "", pages: null, cover: "", categories: []})))};
    freshAdd(); await go("#add");
    document.getElementById("add-isbn").value = "9780306406157";
    click(document.getElementById("addLookup")); click(document.getElementById("addLookup"));
    eq(calls, 1, "looked up twice:");
    document.getElementById("add-isbn").value = "9781234567897";   // she changes the number meanwhile
    release(); await until(() => !addForm.looking);
    eq(document.getElementById("add-title").value, "", "old number's details landed:");
    eq(document.getElementById("add-isbn").value, "9781234567897");
    fake = null;
  });

  test("a failed lookup keeps a Got-it book’s title and author", async () => {
    fake = {"api/lookup": () => ({found: false})};
    await go("#to-buy");
    const w = WISH.find(x => x.by !== "Unknown author");
    await follow(document.querySelector(`[data-add-from="${w.id}"]`));
    eq(location.hash, "#add");
    const t = document.getElementById("add-title").value, a = document.getElementById("add-authors").value;
    document.getElementById("add-isbn").value = "9781234567897";
    click(document.getElementById("addLookup")); await until(() => !addForm.looking);
    eq([document.getElementById("add-title").value, document.getElementById("add-authors").value], [t, a]);
    fake = null;
  });

  test("Escape in the search box keeps a Got-it form", async () => {
    await go("#to-buy");
    const w = WISH[0];
    await follow(document.querySelector(`[data-add-from="${w.id}"]`));
    eq(addForm.fromWish, w.id, "Got it didn’t fill the form:");
    type(q, "zz"); q.dispatchEvent(new KeyboardEvent("keydown", {key: "Escape"})); await wait(0);
    eq(addForm.fromWish, w.id);
  });

  test("what she types keeps its quotes through a redraw", async () => {
    freshAdd(); await go("#add");
    document.getElementById("add-title").value = "Rock 'n' Roll and 'Salem's Lot";
    readAdd(); redrawAdd();
    eq(document.getElementById("add-title").value, "Rock 'n' Roll and 'Salem's Lot");
  });

  test("Add to the shelf sends the form to the server", async () => {
    fake = {"api/books": () => ({ok: false, error: "fake: not saved"})};
    freshAdd(); await go("#add"); sent.length = 0;
    document.getElementById("add-title").value = "Sent Book";
    document.getElementById("add-authors").value = "Ann A, Bo B";
    const sel = document.getElementById("add-shelf"); sel.value = sel.options[1].value;
    click(document.getElementById("addSave")); await until(() => sent.length);
    const body = JSON.parse(sent[0][2]);
    eq([body.title, body.authors, body.shelf], ["Sent Book", ["Ann A", "Bo B"], sel.options[1].value]);
    fake = null;
  });

  test("Add to the shelf needs a title and a shelf", async () => {
    fake = {"api/books": () => ({ok: true})}; sent.length = 0;
    freshAdd(); await go("#add");
    click(document.getElementById("addSave")); await wait(50);
    eq(sent.length, 0); ok(/needs a title/.test(view().innerText));
    fake = null;
  });

  // ---------- 15 Nov review fixes ----------
  test("“not read yet” counts each book once and leaves out books she didn’t finish or paused", async () => {
    await go("#home");
    const fig = [...view().querySelectorAll(".figures div, .figure, .fig")].map(x => x.innerText).find(t => /not read yet/i.test(t)) || view().innerText;
    const shown = +((/([\d,]+)\s*\n?\s*not read yet/i.exec(fig) || [])[1] || "").replace(/,/g, "");
    eq(shown, booksUnread(BOOKS), "home figure:");
    ok(!BOOKS.some(b => ["stopped", "paused"].includes(reading(b).status) && isUnread(b)), "a DNF or paused book counts as unread");
  });

  test("double quotes and ’90s are curled in shown text", async () => {
    eq(curly('He said "hello" in the \'90s'), "He said “hello” in the ’90s");
    eq(esc('a "b" c'), "a “b” c");
    eq(escRaw('a "b"'), "a &quot;b&quot;", "form values stay straight:");
  });

  test("an old book’s own note shows under Details as Edition, not as a blurb", async () => {
    const b = BOOKS.find(x => x.shelf === COLLECTION && x.description && x.description.length < 90);
    await go("#b-" + b.id);
    ok(!view().querySelector("p.desc"), "note shown as a blurb");
    ok([...view().querySelectorAll(".facts dt")].some(dt => dt.textContent.trim() === "Edition"), "no Edition line");
  });

  test("a special edition says so on its own page", async () => {
    const b = BOOKS.find(x => x.special && !(("edition" in x ? x.edition : x.sub) || "").includes(x.special));
    if (!b) return;
    await go("#b-" + b.id);
    ok(view().querySelector(".special-line")?.textContent.includes(curly(b.special)));
  });

  test("blurbs that ran together get their paragraphs back, words unchanged", async () => {
    const html = blurb("She left town.Set in a small place, it rains.Mr Smith stays.");
    eq((html.match(/<p /g) || []).length, 3);
    ok(!/Mr\n/.test(html));
  });

  test("ratings are read as words, once", async () => {
    await go("#shelf-" + BOOKS.find(b => reading(b).rating).shelf);
    const r = view().querySelector(".rated");
    ok(r && /stars$/.test(r.getAttribute("aria-label") || ""), "no label");
    ok(r.querySelector('.sg-stars[aria-hidden="true"]'), "stars not hidden from screen readers");
  });

  test("every page has its own tab title", async () => {
    for (const [h, t] of [["#reading", "Reading"], ["#stats", "Stats"], ["#to-buy", "To buy"], ["#add", "Add a book"], ["#authors", "Authors"], ["#history", "History"]]) {
      await go(h); ok(document.title.startsWith(t), `${h}: ${document.title}`);
    }
  });

  test("deleting the search back to one letter shows the page again", async () => {
    await go("#reading");
    type(q, "ab"); await wait(0); ok(/Results for/.test(view().innerText));
    type(q, "a"); await wait(0); ok(!/Results for/.test(view().innerText), "old results still showing");
    q.value = "";
  });

  // ---------- run ----------
  addEventListener("load", async () => {
    await wait(300);
    const out = [];
    for (const [name, fn] of tests) {
      try { await fn(); out.push({name, ok: true}); }
      catch (e) { out.push({name, ok: false, error: `${String(e && e.stack || e).slice(0, 500)}
  (page then: ${location.hash} · ${document.title})`}); }
    }
    const report = new URLSearchParams(location.search).get("report");   // back to the test, which waits for it
    if (report) await realFetch(`http://127.0.0.1:${report}/`, {method: "POST", mode: "no-cors", headers: {"Content-Type": "text/plain"}, body: JSON.stringify(out)});
  });
})();
