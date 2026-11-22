// Page tests at phone size (21 Nov, her ask): her own library (a throwaway copy) in a 390 × 844 window, as on her phone.
// The sidebar is a drawer opened from the top bar (like her Sim World app); every page fits the width; things to tap
// are big enough; typing boxes don't make a phone zoom in. Toolkit in harness.js.
// The family's drawer and footer rules (Menu, Escape, the scrim, focus, Back to top, credits one per line) are tested for every
// site in the parent's tests/family/family.test.js (22 Nov); this file keeps the Library's own phone layout.
const W = () => innerWidth;
const menuButton = () => $("#menuBtn");
const isOpen = () => document.documentElement.classList.contains("jj-menu-open");   // the family's JJFamily.menu (22 Nov)
const side = () => $("#side");
const onScreen = el => { const r = el.getBoundingClientRect(); return r.right > 0 && r.left < W(); };
// anything sticking out past the right edge that the page doesn't clip or scroll (the old books' list scrolls sideways on purpose)
function sticksOut(root){
  const out = [];
  for (const el of root.querySelectorAll("*")) {
    const r = el.getBoundingClientRect();
    if (!r.width || r.right <= W() + 1) continue;
    let held = false;
    for (let p = el.parentElement; p && p !== root.parentElement; p = p.parentElement) {
      const o = getComputedStyle(p).overflowX;
      if (o !== "visible" && p.getBoundingClientRect().right <= W() + 1) { held = true; break; }
    }
    if (!held) out.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]} reaches ${Math.round(r.right)}px`);
  }
  return [...new Set(out)];
}

test("the window really is phone-sized", async () => {
  ok(innerWidth <= 420, `the test window is ${innerWidth}px wide`);
});

test("choosing a link in the drawer opens that page and closes the drawer, even the page already showing", async () => {
  click(menuButton());
  await follow($('#nav a[href="#reading"]'));
  eq(location.hash, "#reading"); ok(!isOpen(), "closed after a new page");
  click(menuButton());
  await follow($('#nav a[href="#reading"]'));
  ok(!isOpen(), "closed after the same page");
  click(menuButton());
  await follow($('#nav a[href^="#shelf-"]'));
  ok(location.hash.startsWith("#shelf-") && !isOpen(), "closed after a shelf");
});

test("searching from the drawer: results show behind it, and Enter (a phone’s Go key) closes it to show them", async () => {
  click(menuButton());
  const term = BOOKS[0].t.split(" ").find(w => w.length > 3) || BOOKS[0].t;
  type(q, term);
  ok(/Results for/.test(view().innerText), "results drawn");
  q.dispatchEvent(new KeyboardEvent("keydown", {key: "Enter", bubbles: true}));
  ok(!isOpen(), "closed");
  ok(/Results for/.test(view().innerText), "results still showing");
});

test("every kind of page fits the phone’s width (nothing sticks out to the side)", async () => {
  const routes = ["#home", "#shelves", "#authors", "#reading", "#history", "#add", "#to-buy", "#stats", "#old-to-find",
    ...OLD_KINDS.map(k => "#old-" + k[0]), ...DATA.shelves.map(s => "#shelf-" + s.id),
    // the longest titles, special editions, signed and old books, and a spread of the rest
    ...[...BOOKS].sort((a, b) => (b.t + (b.sub || "")).length - (a.t + (a.sub || "")).length).slice(0, 15).map(b => "#b-" + b.id),
    ...BOOKS.filter(b => b.special || b.signed || b.shelf === COLLECTION).slice(0, 15).map(b => "#b-" + b.id),
    ...BOOKS.filter((b, i) => i % 40 === 0).map(b => "#b-" + b.id),
    ...[...AUTHORS].sort((a, b) => b.name.length - a.name.length).slice(0, 5).map(a => "#a-" + a.id),
    ...ELSEWHERE.slice(0, 5).map(e => "#r-" + SG.books.indexOf(e))];
  const problems = [];
  for (const h of new Set(routes)) {
    await show(h);
    const bad = sticksOut(view());
    if (bad.length) problems.push(`${h}: ${bad.slice(0, 3).join(", ")}`);
  }
  for (const [name, list] of [["list view", "list"]]) {   // a shelf as a list too
    store.set(VIEW_KEY, list);
    await show("#shelf-" + DATA.shelves[0].id);
    const bad = sticksOut(view()); if (bad.length) problems.push(`shelf ${name}: ${bad.slice(0, 3).join(", ")}`);
  }
  type(q, "the"); const bad = sticksOut(view()); if (bad.length) problems.push(`search: ${bad.slice(0, 3).join(", ")}`);
  eq(problems, [], "pages wider than the phone:");
});

test("the old books’ list shows each book as a few lines, with nothing hidden off to the side", async () => {   // her yes, 21 Nov
  store.set(VIEW_KEY, "list");
  await show("#shelf-" + COLLECTION);
  const t = $("table.oldbooks", view());
  if (!t) return;   // her old books shown another way: nothing to check
  ok(t.scrollWidth <= t.clientWidth + 1 && t.getBoundingClientRect().right <= W() + 1, "the list is wider than the page");
  const row = $$("tr", t).find(r => r.querySelector("td.t a")), year = row.children[3];
  ok(year.getBoundingClientRect().width > 0 && year.getBoundingClientRect().right <= W() + 1, "the year is out of sight");
  eq(getComputedStyle($("th", t).closest("tr")).display, "none", "the column headings are left out:");
});

test("the New covers switch sits at the end of the page, not over the list", async () => {   // her yes, 21 Nov
  await show("#shelf-" + COLLECTION);
  if (trialSwitch.hidden) return;
  eq(getComputedStyle(trialSwitch).position, "static");
});

test("the banner’s plate of covers sits under the words, not over the title", async () => {
  for (const h of ["#home", "#stats", "#shelf-" + DATA.shelves[0].id]) {
    await show(h);
    const plate = $(".hero-shelf", view()), title = $(".hero h1", view());
    if (!plate) continue;
    ok(plate.getBoundingClientRect().top >= title.getBoundingClientRect().bottom, `${h}: plate below the title`);
  }
});

test("a book’s page: the cover above the title, then the blurb, then the details, one column", async () => {
  const b = BOOKS.find(x => x.cover && x.description) || BOOKS[0];
  await show("#b-" + b.id);
  const cover = $(".book-top .cover", view()).getBoundingClientRect(), h1 = $(".book-top h1", view()).getBoundingClientRect();
  ok(cover.bottom <= h1.top + 1, "cover above the title");
  const cols = getComputedStyle($(".book-body", view())).gridTemplateColumns.split(" ").length;
  eq(cols, 1, "columns in the book's body:");
  ok($$(".panel", view()).every(p => p.getBoundingClientRect().width > W() * 0.8), "the panels use the width");
});

test("things to tap are at least 40px tall: the menu button, drawer links, filters, view switch, A–Z letters", async () => {
  const small = [];
  const check = (els, what, min = 40) => els.filter(e => e.offsetParent).forEach(e => { const h = e.getBoundingClientRect().height; if (h < min) small.push(`${what} “${e.textContent.trim().slice(0, 20)}” ${Math.round(h)}px`); });
  check([menuButton()], "menu button", 44);
  click(menuButton()); await until(() => side().getBoundingClientRect().left >= -1);
  check($$("#nav .nav-group:not(.minor) a"), "drawer link", 44);
  check($$("#nav .nav-group.minor a"), "drawer link");
  click($("#scrim"));
  await show("#shelf-" + DATA.shelves[0].id);
  check($$(".chips button, .views button, .toolbar select", view()), "shelf control");
  await show("#authors");
  check($$(".letters a", view()), "letter");
  const b = BOOKS.find(x => x.shelf !== COLLECTION) || BOOKS[0];
  await show("#b-" + b.id);
  check($$(".sign-pick, .cond-pick", view()), "picker");
  eq(small, [], "too small to tap:");
});

test("boxes to type in use 16px text or more, so a phone doesn’t zoom in on them", async () => {
  const small = [];
  const check = els => els.filter(e => e.offsetParent || e === q).forEach(e => { const px = parseFloat(getComputedStyle(e).fontSize); if (px < 16) small.push(`${e.id || e.className || e.tagName} ${px}px`); });
  check([q]);
  await show("#add"); check($$("input, select", view()));
  await show("#b-" + (BOOKS.find(x => x.shelf !== COLLECTION) || BOOKS[0]).id); check($$("select", view()));
  eq(small, [], "too small:");
});

test("the Stats figures panel fits: every number shows whole", async () => {
  await show("#stats");
  const cut = $$(".ledger .meter b", view()).filter(b => b.scrollWidth > b.clientWidth + 1 || b.getBoundingClientRect().right > W());
  eq(cut.map(b => b.textContent), [], "numbers cut off:");
});

// the Stats page's charts at a width: labels that overlap each other, or a label or number that runs into its bar
function statsClashes(doc){
  const bad = [], hit = (a, b) => a.left < b.right - .5 && b.left < a.right - .5 && a.top < b.bottom - .5 && b.top < a.bottom - .5;
  const box = el => { const r = doc.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect(); };
  for (const d of doc.querySelectorAll("#view .decades")) {
    const ls = [...d.querySelectorAll("b, span")].filter(x => x.textContent.trim() && x.offsetParent).map(x => [x.textContent, box(x)]);
    for (let i = 0; i < ls.length; i++) for (let j = i + 1; j < ls.length; j++) if (hit(ls[i][1], ls[j][1])) bad.push(`${ls[i][0]} overlaps ${ls[j][0]}`);
  }
  for (const r of doc.querySelectorAll("#view .bar-row")) {
    const t = r.querySelector(".track").getBoundingClientRect(), b = r.querySelector("b"), s = r.querySelector("span");
    if (box(b).right > t.left + .5) bad.push(`“${b.textContent}” runs into its bar`);
    if (box(s).left < t.right - .5) bad.push(`${s.textContent} runs into its bar`);
    if (b.title !== b.textContent) bad.push(`“${b.textContent}” has no full name to hover`);
  }
  return bad;
}

test("the Stats page at 390, 360 and 320 wide: no labels overlap and none runs into its bar", async () => {
  await show("#stats");
  ok($$(".decades span", view()).length > 12, "her library has more than twelve decades (the crowded case)");
  ok($$(".bar-row b", view()).some(b => b.textContent.length > 20), "a long publisher name is there to test");
  eq(statsClashes(document), [], `at ${W()} wide:`);
  for (const w of [360, 320]) {
    const f = document.createElement("iframe"); f.src = "index.html#stats"; f.style.cssText = `position:fixed;left:-3000px;top:0;width:${w}px;height:800px;border:0`;
    document.body.append(f);
    try {
      await new Promise(r => { f.onload = r; setTimeout(r, 15000); });
      // 10 s (round 3): the framed page asks its server once before drawing (the read-only check) and loads the family's code;
      // 5 s timed out now and then under the full suite's load
      await until(() => f.contentDocument?.querySelectorAll("#view .decades span").length > 12, `the Stats page at ${w} wide`, 10000);
      eq(f.contentWindow.innerWidth, w, "frame width:");
      eq(statsClashes(f.contentDocument), [], `at ${w} wide:`);
    } finally { f.remove(); }
  }
});


test("family phone helpers: the drawer is min(300px, 86vw) wide; “← Jemma’s Journals” is the family’s home link, 44px tall, 12.5px, and the brand stays where it was", async () => {
  click(menuButton()); await until(() => side().getBoundingClientRect().left >= -1, "the drawer to slide in");
  try {
    eq(Math.round(side().getBoundingClientRect().width), Math.round(Math.min(300, W() * .86)), "drawer width:");
    const home = $("#side .home-link"), r = home.getBoundingClientRect();
    ok(home.classList.contains("jj-home-link") && home.hasAttribute("data-jj-home"), "the family’s class and data-jj-home");
    ok(r.height >= 44, `“← Jemma’s Journals” is ${r.height}px tall`);
    eq(getComputedStyle(home).fontSize, "12.5px", "its text:");
    eq(Math.round(r.left - side().getBoundingClientRect().left), 24, "its left margin:");
    eq(Math.round($("#side .brand").getBoundingClientRect().top - side().getBoundingClientRect().top), 48, "the brand’s place in the drawer (as before):");
  } finally { click($("#scrim")); }
});

test("typing in the drawer’s search keeps the drawer open, letter by letter, and Escape in the empty box closes it", async () => {   // review, 21 Nov
  click(menuButton()); ok(isOpen());
  for (const v of ["t", "th", "t", ""]) { type(q, v); ok(isOpen(), `closed after “${v}”`); }
  q.focus();
  q.dispatchEvent(new KeyboardEvent("keydown", {key: "Escape", bubbles: true}));
  ok(!isOpen(), "Escape in the empty box closes the drawer");
});

// ---------- her decisions of 22 Nov ----------
test("22 Nov: on a phone the ❦ rule sits right under a heading, its button or note below it", async () => {
  for (const h of ["#home", "#reading"]) {
    await show(h);
    const head = $$(".section-head", view()).find(s => s.querySelector(".pick-open, .more"));
    ok(head, `${h}: a heading with a button or note`);
    const h2 = head.querySelector("h2"), btn = head.querySelector(".pick-open, .more");
    eq(getComputedStyle(h2, "::after").content, '"❦"', `${h}: the ornament is drawn under the heading:`);
    eq(getComputedStyle(head, "::after").content, "none", `${h}: not at the foot of the whole block:`);
    ok(btn.getBoundingClientRect().top >= h2.getBoundingClientRect().bottom - 1, `${h}: the button or note comes below the rule`);
  }
});

test("22 Nov: the Stats figures are square mounted panels on a phone too (not rounded walnut)", async () => {
  await show("#stats");
  for (const l of $$(".ledger", view())) { const cs = getComputedStyle(l); eq([cs.borderTopLeftRadius, cs.backgroundImage], ["0px", "none"], "a figures panel:"); }
});
