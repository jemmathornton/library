// The page tests' toolkit (19 Nov): loaded into the site (a throwaway copy) before a test file, by tests/e2e/test_site.py.
//   test(name, fn)            one test, named in plain English (Python shows each as its own result; -k picks by name)
//   knownBug(name, bug, fn)   a test that shows a real bug not fixed yet: an expected failure until the bug is fixed,
//                             then a failure that says to take the mark off
// After every test the page is put back as it was (fake server off, search box and Add form empty, shelf view and
// covers/list choice reset, home page drawn), so no test depends on another and each can run alone (?only=[names]).
// No fixed sleeps: waits are until() a condition holds, or until the browser has handled what a click set going.
const TESTS = [];
const test = (name, fn) => TESTS.push({name, fn});
const knownBug = (name, bug, fn) => TESTS.push({name, fn, bug});

const wait = ms => new Promise(r => setTimeout(r, ms));
const eq = (a, b, msg) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg || ""} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
const ok = (v, msg) => { if (!v) throw new Error(msg || "not true"); };
const until = async (cond, what = "", ms = 5000) => {
  for (const end = performance.now() + ms; performance.now() < end;) { if (cond()) return; await wait(15); }
  ok(cond(), `timed out waiting${what ? " for " + what : ""}`);
};
const view = () => document.getElementById("view");
// the address changes without a hashchange event (a thousand queued ones would fire during later tests);
// route() is what the event would call
const go = async h => {
  history.replaceState(null, "", h);
  if (location.hash !== h) throw new Error(`the browser didn’t change the address to ${h} (too many changes too fast?)`);
  route(); await wait(0);
};
// for the sweeps over every page: the page is drawn without touching the address
const show = async h => { route(h.slice(1)); await wait(0); };
const type = (el, v) => { el.value = v; el.dispatchEvent(new Event("input", {bubbles: true})); };
const click = el => el.dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true}));
// a link she clicks: the browser's own navigation, then the hashchange it sets off has been handled
const follow = el => new Promise(done => {
  const to = el.getAttribute("href");
  if (to === location.hash) { click(el); return setTimeout(done, 0); }
  addEventListener("hashchange", () => setTimeout(done, 0), {once: true});
  click(el);
});
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
// the big figures in a page's banner, as {label: number}
const figures = () => Object.fromEntries($$(".hero .figures div", view()).map(d => [d.querySelector("span").textContent.trim().toLowerCase(), +d.querySelector("b").textContent.replace(/[^\d.]/g, "")]));
const countText = () => $("#toolbar .count")?.textContent.trim();
const navCount = href => { const a = $(`#nav a[href="${href}"]`); return a ? +(a.querySelector(".n")?.textContent ?? NaN) : null; };
// the books shown in #shelfBooks (covers, list or ledger), by the page each one opens
const shownBooks = (root = $("#shelfBooks")) => $$("a.bk, .blist > a, table.oldbooks td.t a", root).map(a => a.getAttribute("href"));
const bookAt = href => href.startsWith("#b-") ? bookIndex[href.slice(3)] : SG.books[+href.slice(3)];

// a fake server for the Add page: answers by path, records what was sent
const realFetch = window.fetch.bind(window);
let fake = null; const sent = [];
window.fetch = (url, opts = {}) => {
  const path = String(url).replace(location.origin + "/", "").split("?")[0];
  if (fake && fake[path]) { sent.push([path, String(url), opts.body || null]); return Promise.resolve(fake[path](String(url), opts)).then(v => new Response(JSON.stringify(v))); }
  return realFetch(url, opts);
};
const freshAdd = () => { addForm = {isbn: "", title: "", authors: "", publisher: "", published: "", pages: "", cover: "", shelf: "", note: "", busy: false}; };

// everything a test may have changed, put back
function resetPage(){
  fake = null; sent.length = 0;
  q.value = ""; searchFrom = null; freshAdd(); addFromWish = false; shelfView = {...SHELF_VIEW};
  try { localStorage.removeItem(VIEW_KEY); } catch {}
  pickHide(); document.getElementById("spineCard")?.remove();
  if (typeof menuOpen === "function" && menuOpen()) setMenu(false);   // the phone drawer (21 Nov; the family's JJFamily.menu since 22 Nov)
  // the foot's Dark mode button (21 Nov; key jj-mode, the family rules; the family's family.js since 22 Nov): back to light
  if (window.JJFamily && JJFamily.mode.get() !== "light") JJFamily.mode.set("light");
  try { localStorage.removeItem("jj-mode"); localStorage.removeItem("jemmas-library-mode"); } catch {}
  document.documentElement.setAttribute("data-mode", "light"); window.JJFamily?.paint(true);
  history.replaceState(null, "", location.pathname + location.search + "#home"); route();
  if (typeof trialShown === "function") trialShown();   // the New covers switch follows the address (no hashchange here)
}

addEventListener("load", async () => {
  const params = new URLSearchParams(location.search), only = params.get("only") ? new Set(JSON.parse(params.get("only"))) : null;
  const out = [], names = TESTS.map(t => t.name);
  const twice = names.filter((n, i) => names.indexOf(n) !== i);
  if (twice.length) out.push({name: "(page tests)", ok: false, error: "two tests with one name: " + twice.join(", ")});
  await until(() => view().innerText.trim().length > 20, "the site to draw its first page", 15000);
  // ?order=reverse or ?order=shuffle-<seed> (LIBRARY_TEST_ORDER in Python): the same tests in another order, to show
  // up any test that only passes after another one
  const order = params.get("order") || "", list = TESTS.slice();
  if (order === "reverse") list.reverse();
  else if (order.startsWith("shuffle-")) { let s = +order.slice(8) || 1; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; } }
  for (const t of list) {
    if (only && !only.has(t.name)) continue;
    const r = {name: t.name, ok: true, ...(t.bug ? {bug: t.bug} : {})};
    try {
      await Promise.race([t.fn(), wait(30000).then(() => { throw new Error("still running after 30 seconds"); })]);
    } catch (e) {
      Object.assign(r, {ok: false, error: `${String(e && e.stack || e).slice(0, 600)}\n  (page then: ${location.hash} · ${document.title})`});
    }
    try { resetPage(); } catch (e) { Object.assign(r, {ok: false, error: (r.error || "") + "\n  and putting the page back failed: " + e}); }
    out.push(r);
  }
  const report = params.get("report");   // back to the test, which waits for it
  if (report) await realFetch(`http://127.0.0.1:${report}/`, {method: "POST", mode: "no-cors", headers: {"Content-Type": "text/plain"}, body: JSON.stringify(out)});
});
