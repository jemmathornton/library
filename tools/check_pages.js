// (The same checks and more run by themselves in the test suite: python -X utf8 tests/run_tests.py e2e)
// Whole-site check: paste into the browser console with the library open (http://127.0.0.1:8020), or run it from
// Claude's browser tool. It opens every page (home, every shelf, book, author, reading page, old books, to buy, stats…),
// follows every in-site link it finds, and lists problems. Expect: {problems: []}. It changes nothing.
// Looks for: script errors, pages that come out empty, "undefined", "NaN" or "[object" in the text, links to pages
// that don't exist (the site quietly shows Home for those), pictures that fail to load, and sidebar counts that
// don't match the page they open.
(async () => {
  const problems = [], errs = [], seen = new Set(), wait = ms => new Promise(r => setTimeout(r, ms));
  const onErr = e => errs.push(e.message || String(e.reason)); addEventListener("error", onErr); addEventListener("unhandledrejection", onErr);
  let fellBack = false; const home = window.pageHome; window.pageHome = (...a) => { fellBack = true; return home(...a); };
  const routes = ["#home", "#shelves", "#authors", "#reading", "#history", "#add", "#to-buy", "#stats", "#trial-covers", "#old-to-find",
    ...OLD_KINDS.map(k => "#old-" + k[0]), ...DATA.shelves.map(s => "#shelf-" + s.id), ...DATA.books.map(b => "#b-" + b.id),
    ...Object.keys(authorIndex).map(k => "#a-" + k), ...ELSEWHERE.map(e => "#r-" + SG.books.indexOf(e))];
  const links = new Set(), imgs = new Set();
  for (const h of routes) {
    if (seen.has(h)) continue; seen.add(h);
    fellBack = false; const before = errs.length;
    route(h.slice(1)); await wait(0);   // drawn without changing the address: the browser limits how often a page may
    const v = document.getElementById("view"), text = v.innerText;
    if (fellBack && h !== "#home") problems.push(`${h}: page doesn’t exist (shows Home)`);
    if (errs.length > before) problems.push(`${h}: script error: ${errs.slice(before).join(" / ")}`);
    if (text.trim().length < 20) problems.push(`${h}: page is empty`);
    const bad = text.match(/\bundefined\b|\bNaN\b|\[object [A-Za-z]+\]/);
    if (bad) problems.push(`${h}: shows “${bad[0]}”`);
    v.querySelectorAll('a[href^="#"]').forEach(a => links.add(a.getAttribute("href")));
    v.querySelectorAll("img[src]").forEach(i => imgs.add(i.getAttribute("src")));
  }
  // links found on the pages that weren't in the list above
  for (const h of links) {
    if (seen.has(h) || h === "#") continue; seen.add(h);
    fellBack = false; route(h.slice(1)); await wait(0);
    if (fellBack && h !== "#home") problems.push(`link to ${h}: page doesn’t exist (shows Home)`);
  }
  // sidebar counts against the page each one opens
  document.querySelectorAll("#nav a[href^='#shelf-'], #nav a[href^='#old-']").forEach(a => {
    const n = +(a.querySelector(".n")?.textContent || NaN), h = a.getAttribute("href");
    let real = NaN;
    if (h.startsWith("#shelf-")) real = shelfIndex[h.slice(7)]?.books.length;
    else if (h === "#old-to-find") real = WISH.filter(w => w.old).length;
    else real = oldBooks(h.slice(5)).length;
    if (!Number.isNaN(n) && n !== real) problems.push(`sidebar ${h}: says ${n}, has ${real}`);
  });
  // every picture the pages use (local ones only; outside pictures can be slow or blocked)
  const local = [...imgs].filter(s => !/^https?:/.test(s) || s.startsWith(location.origin));
  await Promise.all(local.map(src => new Promise(ok => { const i = new Image(); i.onload = () => ok(); i.onerror = () => { problems.push(`picture missing: ${src}`); ok(); }; i.src = src; })));
  window.pageHome = home; removeEventListener("error", onErr); removeEventListener("unhandledrejection", onErr);
  route();
  const out = {pages: seen.size, pictures: local.length, problems};
  console.log(out); return out;
})();
