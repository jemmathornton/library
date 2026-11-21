// Page tests at phone size (21 Nov, her ask): her own library (a throwaway copy) in a 390 × 844 window, as on her phone.
// The sidebar is a drawer opened from the top bar (like her Sim World app); every page fits the width; things to tap
// are big enough; typing boxes don't make a phone zoom in. Toolkit in harness.js.
const W = () => innerWidth;
const menuButton = () => $("#menuBtn");
const isOpen = () => document.body.classList.contains("nav-open");
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

test("the top bar shows the menu button and the library’s name; the sidebar is away", async () => {
  const bar = $(".topbar");
  eq(getComputedStyle(bar).display, "flex", "top bar shown:");
  ok(/^\s*Menu\s*$/.test(menuButton().textContent) && menuButton().querySelector("svg"), "the button has the menu icon and its word");
  eq($(".topbar-name").textContent.replace(/\s+/g, " ").trim(), "Jemma’s Library");
  ok(!onScreen(side()), "the sidebar is off the screen");
  eq(getComputedStyle(side()).visibility, "hidden", "the closed drawer can't be reached with Tab:");
  eq(getComputedStyle($("main")).marginLeft, "0px", "the page uses the whole width:");
  eq(menuButton().getAttribute("aria-expanded"), "false");
});

test("the menu button opens the drawer over the page, with the way back to Jemma’s Journals at the top", async () => {
  click(menuButton());
  await until(() => side().getBoundingClientRect().left >= -1, "the drawer to slide in");
  ok(isOpen(), "open");
  eq(menuButton().getAttribute("aria-expanded"), "true");
  eq(getComputedStyle(side()).visibility, "visible");
  eq(getComputedStyle($("#scrim")).display, "block", "the dark layer behind it:");
  const first = $$("a, input", side()).filter(e => e.offsetParent)[0];
  eq(first.textContent.trim(), "← Jemma’s Journals", "first thing in the drawer:");
  await until(() => side().contains(document.activeElement), "keyboard focus to move into the drawer");
  ok(side().getBoundingClientRect().width < W() - 40, "a strip of the page stays showing to tap");
  eq(getComputedStyle(document.body).overflow, "hidden", "the page behind doesn't scroll:");
});

test("the drawer closes on Escape, and focus goes back to the button", async () => {
  click(menuButton()); ok(isOpen());
  document.dispatchEvent(new KeyboardEvent("keydown", {key: "Escape", bubbles: true}));
  ok(!isOpen(), "closed"); eq(document.activeElement, menuButton(), "focus:");
  eq(menuButton().getAttribute("aria-expanded"), "false");
});

test("the drawer closes on a tap outside it", async () => {
  click(menuButton()); ok(isOpen());
  click($("#scrim"));
  ok(!isOpen());
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

test("the old books’ list scrolls sideways inside itself instead of squashing", async () => {
  store.set(VIEW_KEY, "list");
  await show("#shelf-" + COLLECTION);
  const t = $("table.oldbooks", view());
  if (!t) return;   // her old books shown another way: nothing to check
  ok(["auto", "scroll"].includes(getComputedStyle(t).overflowX), "the list scrolls");
  ok(t.getBoundingClientRect().right <= W() + 1, "and stays inside the page");
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


test("Back to top and Dark mode sit side by side at the bottom of a phone page, big enough to tap", async () => {
  await show("#reading");
  const t = $("#toTop").getBoundingClientRect(), m = $("#modeBtn").getBoundingClientRect();
  ok(t.height >= 44 && m.height >= 44, `too small to tap: ${t.height}px, ${m.height}px`);
  eq(Math.round(t.top), Math.round(m.top), "on one line:");
  ok(t.left >= 0 && m.right <= W(), "inside the screen");
  ok(t.top >= view().getBoundingClientRect().bottom - 1, "below the page");
});
