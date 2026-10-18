// Jemma's Library: the page code. Everything is drawn from DATA (js/data.js, built by tools/build.py from data/).
// Reading marks (read, reading, dates, stars) and to-buy ticks are kept in this browser for now (see TODO.md).
const ic = n => ICONS[n].replace("<svg ", '<svg class="i" aria-hidden="true" ');
// shown text uses curly apostrophes and quotes; ids and links are untouched
const curly = s => String(s ?? "").replace(/(^|[\s(\[“"—-])'/g, "$1‘").replace(/'/g, "’");
const esc = s => curly(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const slug = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/&/g,"and").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const norm = s => String(s).toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z0-9]/g, "");
const num = n => n.toLocaleString("en-GB");
const plural = (n, one, many) => `${num(n)} ${n === 1 ? one : (many || one + "s")}`;
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const niceDate = d => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ""); return m ? `${+m[3]} ${MONTHS[m[2] - 1]} ${m[1]}` : ""; };
const year = d => (/^(\d{4})/.exec(d || "") || [])[1] || "";

// ---------- browser storage (wrapped: it can be blocked or empty) ----------
const store = {
  get(k, fallback){ try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
};
const READ_KEY = "jemmas-library-reading", GOT_KEY = "jemmas-library-found", VIEW_KEY = "jemmas-library-view";
let READ = store.get(READ_KEY, {}), GOT = store.get(GOT_KEY, {});

// ---------- the library ----------
const SHELVES = DATA.shelves, shelfIndex = {};
SHELVES.forEach(s => { s.books = []; shelfIndex[s.id] = s; });
const BOOKS = DATA.books, bookIndex = {}, authorIndex = {}, editions = {};

// Display title: bracketed bits (series, edition, imprint) become a small line under it; a long subtitle after a colon
// does too, unless the part before the colon ends in a number ("Famous Five 9: Five Fall Into Adventure" stays whole).
function tidyTitle(raw){
  let t = raw.trim(), bits = [], m;
  while ((m = /\s*\(([^()]*)\)/.exec(t))) { if (m[1].trim()) bits.unshift(m[1].trim()); t = (t.slice(0, m.index) + t.slice(m.index + m[0].length)).trim(); }
  t = t.replace(/\s+Paperback$/i, "").replace(/[\s:;,–-]+$/, "").trim();   // "The Bear and The Nightingale: (Winternight Series)" leaves no colon behind
  // "Famous Five: 1: Five On A Treasure Island" -> "Five On A Treasure Island", with "Famous Five 1" underneath
  const numbered = /^(.+?):\s*(\d+):\s*(.+)$/.exec(t);
  if (numbered) { bits.unshift(numbered[1] + " " + numbered[2]); t = numbered[3]; }
  const c = numbered ? -1 : t.indexOf(": ");
  if (c > 0 && !/\d$/.test(t.slice(0, c)) && t.slice(0, c).split(/\s+/).length >= 2) { bits.unshift(t.slice(c + 2)); t = t.slice(0, c); }
  return {t: t || raw, sub: bits.join(" · ")};
}
const sortTitle = t => t.toLowerCase().replace(/^(the|a|an)\s+/, "");

function prep(b){
  const tt = tidyTitle(b.displayTitle || b.title);
  b.t = tt.t; b.sub = tt.sub;
  const main = (b.authors || []).filter(a => !a.role), shown = main.length ? main : (b.authors || []);
  b.by = shown.map(a => a.name).join(" & ") || "Unknown author";
  b.sortAuthor = ((b.surname || (shown[0] && shown[0].name.split(" ").pop()) || "zzz") + " " + (shown[0] ? shown[0].name : "")).toLowerCase();
  b.sortTitle = sortTitle(b.t);
}
BOOKS.forEach(b => {
  prep(b); bookIndex[b.id] = b;
  (shelfIndex[b.shelf] || shelfIndex.unsorted).books.push(b);
  (b.authors || []).forEach(a => {
    const k = slug(a.name); if (!k) return;
    const au = authorIndex[k] ||= {id: k, name: a.name, books: [], surname: ""};
    au.books.push({book: b, role: a.role});
    if (!a.role && b.surname && a.name.endsWith(b.surname)) au.surname = b.surname;
  });
  (editions[norm(b.title) + "|" + norm(b.surname || "")] ||= []).push(b);
});
const AUTHORS = Object.values(authorIndex);
AUTHORS.forEach(a => { a.sort = ((a.surname || a.name.split(" ").pop()) + " " + a.name).toLowerCase(); });
AUTHORS.sort((x, y) => x.sort.localeCompare(y.sort));
const WISH = DATA.toBuy; WISH.forEach(prep);

// ---------- reading ----------
// StoryGraph is where she tracks her reading (data/storygraph.json, from its export): it wins for every book it knows.
// A StoryGraph book can cover several copies on the shelves; ones not on the shelves (ebooks, audiobooks, borrowed)
// get a page of their own (#r-<n>). Books StoryGraph doesn't know can be marked here (kept in this browser).
const SG = DATA.storygraph || {books: []}, sgFor = {}, ELSEWHERE = [];
const RANK = {reading: 5, read: 4, paused: 3, stopped: 2, "to-read": 1};
const STATUS_WORDS = {read: "Read", reading: "Reading now", "to-read": "On your to-read list", stopped: "Didn’t finish", paused: "Paused"};
const FORMATS = {digital: "Ebook", audio: "Audiobook", paperback: "Paperback", hardcover: "Hardback"};
SG.books.forEach((e, i) => {
  e.id = "r-" + i;
  e.finished = (e.dates || []).map(d => d[1]).filter(Boolean).sort().pop() || e.lastRead || "";
  e.started = ((e.dates || []).slice().sort((a, b) => (a[0] || "").localeCompare(b[0] || "")).pop() || [])[0] || "";
  e.authors = [...new Set(String(e.authors || "").split(/,\s*/).filter(Boolean))].map(name => ({name}));
  prep(e);
  if (e.books) e.books.forEach(id => (sgFor[id] ||= []).push(e)); else ELSEWHERE.push(e);
});
function sgMerged(list){   // a book she has on StoryGraph more than once (re-reads, other editions): one record
  const latest = (a, b) => (b.finished || "").localeCompare(a.finished || "");
  const best = list.slice().sort((a, b) => RANK[b.status] - RANK[a.status] || latest(a, b))[0];
  const dates = list.flatMap(e => e.dates || []).sort((a, b) => (a[0] || a[1] || "").localeCompare(b[0] || b[1] || ""));
  const rated = list.filter(e => e.rating).sort(latest)[0], felt = list.filter(e => e.moods || e.pace).sort(latest)[0] || {};
  return {sg: true, status: best.status, started: best.started, finished: list.map(e => e.finished).sort().pop() || "", rating: rated && rated.rating,
    dates, readCount: Math.max(dates.filter(d => d[1]).length, ...list.map(e => e.readCount || 0)), moods: felt.moods, pace: felt.pace,
    reviews: list.filter(e => e.review).map(e => e.review), key: list[0].id};
}
const isElsewhere = b => String(b.id).startsWith("r-");
const reading = b => isElsewhere(b) ? (b.merged ||= sgMerged([b]))
  : sgFor[b.id] ? (sgFor[b.id].merged ||= sgMerged(sgFor[b.id]))
  : ({...(b.status ? {status: b.status} : {}), ...(READ[b.id] || {})});
const isRead = b => reading(b).status === "read", isReading = b => reading(b).status === "reading", isToRead = b => reading(b).status === "to-read";
// everything she has read or means to read, each book once (not once per copy; a copy with a cover stands for the rest)
function readingLog(){
  const seen = new Set(), out = [];
  [...BOOKS].sort((a, b) => !!b.cover - !!a.cover).forEach(b => { const k = sgFor[b.id] ? reading(b).key : b.id; if (!seen.has(k) && reading(b).status) { seen.add(k); out.push(b); } });
  return out.concat(ELSEWHERE);
}
const starsText = r => String(Math.round(r * 100) / 100);   // decimals, not ½ (her choice, 18 Oct)

// ---------- series (data/series.json, in reading order) ----------
// Her copies are found by title (as Libib or StoryGraph spell it, brackets, "Book 3" and series numbers ignored) and
// author surname. A book goes to the entry its title fits best: the whole title beats the part before a colon, so
// "Artemis Fowl: The Eternity Code" is book 3, not book 1. An omnibus ("Vampire Blood Trilogy") can stand for several.
const tkey = s => norm(String(s).replace(/&/g, " and ")).replace(/(.)\1/g, "$1");
function titleKeys(raw){
  const s = String(raw).replace(/\(.*?\)|\[.*?\]/g, " ").replace(/\s+Paperback\s*$/i, ""), parts = s.split(/:\s*/), keys = new Map();
  const add = (k, score) => { k = tkey(k); if (k && (keys.get(k) || 0) < score) keys.set(k, score); };
  add(s, 4); add(s.replace(/[:,]?\s*(book\s*)?\d+(\/\d+)?\s*$/i, ""), 3); add(s.replace(/^\s*\d+\s*[:.]\s*/, ""), 3);
  parts.slice(1).forEach(p => add(p.replace(/^\s*(book\s*)?\d+(\/\d+)?\s*$/i, "").replace(/^\s*\d+\s*/, ""), 2));
  add(parts[0], 1);
  return keys;
}
const shelfKey = b => { const h = (seriesOf[b.id] || [])[0]; return h ? sortTitle(h.series.name) + " " + String(h.entry.n).padStart(3, "0") : b.sortTitle; };
const SERIES = (DATA.series || []).map(s => ({...s, id: slug(s.name), surnames: s.author.toLowerCase().split("|"),
  entries: s.books.map((t, i) => ({n: i + 1, title: t.split("|")[0], keys: new Set(t.split("|").map(tkey)), owned: [], away: [], wish: []}))}));
const seriesOf = {};   // book id -> [{series, entry}]
(function matchSeries(){
  const byAuthor = b => (b.authors || []).map(a => a.name.toLowerCase()).join(" ");
  [[BOOKS, "owned"], [ELSEWHERE, "away"], [WISH, "wish"]].forEach(([list, where]) => list.forEach(b => {
    const who = byAuthor(b), keys = titleKeys(b.title);
    let best = 0, hits = [];
    SERIES.forEach(s => { if (!s.surnames.some(n => who.includes(n))) return;
      s.entries.forEach(e => e.keys.forEach(k => { const sc = keys.get(k) || 0; if (!sc) return;
        if (sc > best) { best = sc; hits = []; } if (sc === best && !hits.some(h => h.entry === e)) hits.push({series: s, entry: e}); })); });
    hits.forEach(h => h.entry[where].push(b));
    if (hits.length && where !== "wish") seriesOf[b.id] = hits;
  }));
})();
// where she stands with one book of a series
function entryState(e){
  const all = e.owned.concat(e.away), read = all.some(isRead), now = all.some(isReading);
  return {read, now, owned: e.owned.length > 0, wish: e.wish.length > 0, book: e.owned.find(b => b.cover) || e.owned[0] || e.away[0] || e.wish[0]};
}

// ---------- pieces ----------
// covers are copied into covers/; one still only linked from Open Library uses its quicker medium size in lists
const coverSrc = (b, big) => big || !/^https:/.test(b.cover) ? b.cover : b.cover.replace(/-L\.jpg$/, "-M.jpg");
function cover(b, extra = "", big = false){
  const s = shelfIndex[b.shelf], st = reading(b).status;
  // read or reading: a tick (or bookmark) in the top corner, walnut and cream (her choice, 18 Oct); her stars, filled to
  // the rating with no number, in a strip across the foot
  const badge = st === "read" ? `<span class="badge" title="Read">${ic("check")}</span>` : st === "reading" ? `<span class="badge reading" title="Reading now">${ic("bookmark")}</span>` : "";
  const r = reading(b).rating;
  const strip = r ? `<span class="rated" title="${starsText(r)} stars"><span class="sg-stars" style="--r:${(r / 5 * 100).toFixed(1)}%"><span>★★★★★</span><span aria-hidden="true">★★★★★</span></span></span>` : "";
  return `<div class="cover${b.cover ? "" : " blank"} ${extra}" style="--c:${s ? s.color : "#5E3D22"}">${badge}${strip}${b.cover ? `<img src="${esc(coverSrc(b, big))}" alt="" loading="lazy">` : ""}<span class="t">${esc(b.t)}</span><span class="a">${esc(b.by)}</span></div>`;
}
// a cover that won't load becomes a title card
document.addEventListener("error", e => { const img = e.target; if (img.tagName === "IMG" && img.parentNode.classList.contains("cover")) { img.parentNode.classList.add("blank"); img.remove(); } }, true);

const href = b => isElsewhere(b) ? "#" + b.id : "#b-" + b.id;
const card = (b, note) => `<a class="bk" href="${href(b)}">${cover(b)}<h3>${esc(b.t)}</h3><div class="by">${esc(note || b.by)}</div></a>`;
const grid = (list, cls = "") => list.length ? `<div class="books ${cls}">${list.map(b => card(b)).join("")}</div>` : "";
function listView(list){
  return `<div class="blist">${list.map(b => { const st = reading(b).status;
    return `<a href="${href(b)}">${cover(b)}<b>${esc(b.t)}</b><span>${esc(b.by)}</span><span>${esc(b.publisher || "")}</span><span>${year(b.published)}</span>`
      + `<span class="st ${st || ""}">${st === "read" ? "Read" : st === "reading" ? "Reading" : st === "to-read" ? "To read" : ""}</span></a>`; }).join("")}</div>`;
}
// a banner is made of the page's own book covers, fading into the walnut behind the words (as the Sims site's banners
// are each world's own map); pages with too few covers keep the plain walnut
function shelfBanner(list){
  const pics = (list || []).filter(b => b.cover).slice(0, 32);
  return pics.length >= 8 ? `<div class="hero-shelf" aria-hidden="true">${pics.map(b => `<img src="${esc(coverSrc(b))}" alt="">`).join("")}</div>` : "";
}
const hero = (o) => { const bg = shelfBanner(o.covers);
  return `<header class="hero${bg ? " shelved" : ""}">${bg}<div class="kicker">${o.color ? `<span class="dot" style="--c:${o.color}"></span>` : "<i></i>"}<span class="label">${o.kicker}</span></div>
  <h1>${o.title}</h1>${o.text ? `<p>${o.text}</p>` : ""}${o.figures ? `<div class="figures">${o.figures.map(([n, l]) => `<div><b>${n}</b><span>${l}</span></div>`).join("")}</div>` : ""}</header>`; };
// a mix across the whole library: every few books, so all the shelves show
const mixed = list => { const c = list.filter(b => b.cover), step = Math.max(1, Math.floor(c.length / 32)); return c.filter((b, i) => i % step === 0); };
const sectionHead = (title, more) => `<div class="section-head"><h2>${title}</h2>${more || ""}</div>`;

// ---------- sidebar ----------
function renderNav(active){
  const nReading = readingLog().filter(isReading).length, left = WISH.filter(w => !GOT[w.id]).length;
  const link = (href, icon, text, n) => `<a href="${href}" class="${active === href ? "on" : ""}">${icon}${text}${n != null ? `<span class="n">${n}</span>` : ""}</a>`;
  // the shelves come first and largest (her choice, 18 Oct); the rest of the library is a quiet list at the foot
  // (the name at the top is the way home)
  document.getElementById("nav").innerHTML = `
    <div class="nav-group shelves-nav"><span class="label">Shelves</span>
      ${link("#shelves", ic("library"), "All shelves", BOOKS.length)}
      ${SHELVES.filter(s => s.books.length).map(s => link("#shelf-" + s.id, `<span class="dot" style="--c:${s.color}"></span>`, esc(s.name), s.books.length)).join("")}
    </div>
    <div class="nav-group minor">
      ${link("#reading", ic("bookmark"), "Reading", nReading || null)}
      ${link("#to-read", ic("clock"), "To read", readingLog().filter(b => isToRead(b) && !isElsewhere(b)).length || null)}
      ${link("#to-buy", ic("shopping-bag"), "To buy", left)}
      ${link("#authors", ic("users"), "Authors", AUTHORS.length)}
      ${link("#stats", ic("chart"), "Stats")}
      ${link("#add", ic("plus"), "Add a book")}    </div>`;
}

// ---------- pages ----------
function pageHome(){
  const now = readingLog().filter(isReading), recent = [...BOOKS].sort((a, b) => (b.added || "").localeCompare(a.added || "")).slice(0, 12);
  const fan = s => { const withCover = s.books.filter(b => b.cover), pick = (withCover.length >= 3 ? withCover : s.books).slice(0, 3); return pick.map(b => cover(b)).join(""); };
  return hero({kicker: "Home library", title: "Jemma’s <em>Library</em>", covers: [...BOOKS].sort(SORTS.added[1]),
      text: `Every book on the shelves at home, ${plural(SHELVES.filter(s => s.books.length && s.libib).length, "shelf", "shelves")} of them, brought over from Libib on 18 October 2026.`,
      figures: [[num(BOOKS.length), "books"], [num(AUTHORS.length), "authors"], [num(readingLog().filter(b => !isElsewhere(b) && isRead(b)).length), "of them read"], [num(WISH.length), "on the to-buy list"]]})
    + (now.length ? sectionHead("Reading <em>now</em>", `<a class="more" href="#reading">All reading</a>`) + grid(now, "row") : "")
    + sectionHead("The <em>shelves</em>", `<a class="more" href="#shelves">See them all at once</a>`)
    + `<div class="shelves">${SHELVES.filter(s => s.books.length).map(s => `<a class="shelf-card" href="#shelf-${s.id}" style="--c:${s.color}"><div class="fan">${fan(s)}</div>
        <div class="txt"><h3>${esc(s.name)}</h3><span>${plural(s.books.length, "book")}</span></div></a>`).join("")}</div>`
    + sectionHead("Recently <em>added</em>") + grid(recent, "row");
}

// shelves are in author surname order, like a real bookcase (her choice, 18 Oct)
const SHELF_VIEW = {filter: "all", sort: "author"};
let shelfView = {...SHELF_VIEW};
const SORTS = {
  // within an author, a series stays together in reading order, filed where its name falls among the other titles
  author: ["Author surname", (a, b) => a.sortAuthor.localeCompare(b.sortAuthor) || shelfKey(a).localeCompare(shelfKey(b))],
  title: ["Title A–Z", (a, b) => a.sortTitle.localeCompare(b.sortTitle)],
  added: ["Recently added", (a, b) => (b.added || "").localeCompare(a.added || "")],
  old: ["Oldest first", (a, b) => (a.published || "9999").localeCompare(b.published || "9999")],
  new: ["Newest first", (a, b) => (b.published || "").localeCompare(a.published || "")],
  stars: ["Your stars", (a, b) => (reading(b).rating || 0) - (reading(a).rating || 0) || a.sortAuthor.localeCompare(b.sortAuthor)],
};
const FILTERS = {all: ["All", () => true], unread: ["Not read", b => !isRead(b) && !isReading(b)], toread: ["To read", isToRead], reading: ["Reading", isReading], read: ["Read", isRead]};

function shelfBooks(list, grouped = currentGrouped){
  const f = FILTERS[shelfView.filter][1], shown = list.filter(f).sort(SORTS[shelfView.sort][1]);
  const view = store.get(VIEW_KEY, "covers"), books = l => view === "list" ? listView(l) : grid(l);
  // all shelves at once: each shelf in turn, in the same order as the sidebar
  const body = !shown.length ? `<p class="empty">Nothing here yet.</p>` : !grouped ? books(shown)
    : SHELVES.map(s => { const l = shown.filter(b => b.shelf === s.id); return l.length ? `<section class="shelf-part">`
        + sectionHead(`<span class="dot big" style="--c:${s.color}"></span>${esc(s.name)}`, `<a class="more" href="#shelf-${s.id}">${plural(l.length, "book")}</a>`) + books(l) + `</section>` : ""; }).join("");
  return `<div class="toolbar" id="toolbar">
      <div class="chips">${Object.entries(FILTERS).map(([k, [l]]) => `<button type="button" data-filter="${k}" class="${shelfView.filter === k ? "on" : ""}">${l}</button>`).join("")}</div>
      <select id="sort" aria-label="Sort by">${Object.entries(SORTS).map(([k, [l]]) => `<option value="${k}"${shelfView.sort === k ? " selected" : ""}>${l}</option>`).join("")}</select>
      <div class="views"><button type="button" data-view="covers" class="${view === "covers" ? "on" : ""}" aria-label="Covers">${ic("grid")}</button><button type="button" data-view="list" class="${view === "list" ? "on" : ""}" aria-label="List">${ic("list")}</button></div>
      <span class="count">${plural(shown.length, "book")}</span>
    </div>` + body;
}
let currentList = [], currentGrouped = false;
function pageAllShelves(){
  currentList = BOOKS; currentGrouped = true;
  const shelves = SHELVES.filter(s => s.books.length && s.libib).length;
  return hero({kicker: `<a href="#home">Every shelf</a>`, title: "All <em>shelves</em>", covers: mixed(BOOKS), text: "The whole bookcase at once, shelf by shelf, each in author surname order.",
      figures: [[num(BOOKS.length), "books"], [num(shelves), "shelves"], [num(AUTHORS.length), "authors"], [num(BOOKS.filter(isRead).length), "read"]]})
    + `<div id="shelfBooks">${shelfBooks(BOOKS)}</div>`;
}
function pageShelf(s){
  currentList = s.books; currentGrouped = false;
  const authors = new Set(s.books.map(b => b.by)).size, pages = s.books.reduce((n, b) => n + (b.pages || 0), 0);
  return hero({kicker: `<a href="#home">Shelf</a>`, title: esc(s.name), color: s.color, text: s.note ? esc(s.note) : "", covers: [...s.books].sort(SORTS.author[1]),
      figures: [[num(s.books.length), "books"], [num(authors), "authors"], [num(s.books.filter(isRead).length), "read"], [num(pages), "pages"]]})
    + `<div id="shelfBooks">${shelfBooks(s.books)}</div>`;
}

function stars(n){
  return `<div class="stars" role="group" aria-label="Your stars">${[1,2,3,4,5].map(i => `<button type="button" data-star="${i}" class="${n >= i ? "on" : ""}" aria-label="${i} star${i > 1 ? "s" : ""}">${ic("star")}</button>`).join("")}${n ? `<button type="button" class="clear" data-star="0">Clear</button>` : ""}</div>`;
}
function readingPanel(b){
  const r = reading(b), st = r.status || "none";
  return `<div class="panel" id="readPanel"><h2>Your reading</h2>
    <div class="seg" role="group" aria-label="Reading status">${[["none", "Not read", "book"], ["reading", "Reading", "bookmark"], ["read", "Read", "check"]].map(([k, l, i]) =>
      `<button type="button" data-status="${k}" class="${st === k ? "on" : ""}">${ic(i)}${l}</button>`).join("")}</div>
    ${st !== "none" ? `<div class="dates"><label>Started<input type="date" data-date="started" value="${esc(r.started || "")}"></label>${st === "read" ? `<label>Finished<input type="date" data-date="finished" value="${esc(r.finished || "")}"></label>` : ""}</div>` : ""}
    ${st === "read" ? stars(r.rating || 0) : ""}
    <span class="saved">Saved in this browser.</span></div>`;
}
const MON = MONTHS.map(m => m.slice(0, 3));
function dateRange([a, b]){   // ['2024-01-02', '2024-01-20'] -> '2 Jan – 20 Jan 2024'
  const p = d => (/^(\d{4})-(\d{2})-(\d{2})/.exec(d || "") || []).slice(1).map(Number);
  const [y1, m1, d1] = p(a), [y2, m2, d2] = p(b);
  if (!y2) return y1 ? `Started ${d1} ${MON[m1 - 1]} ${y1}` : "";
  if (!y1 || a === b) return `${d2} ${MON[m2 - 1]} ${y2}`;
  return `${d1} ${MON[m1 - 1]}${y1 !== y2 ? " " + y1 : ""} – ${d2} ${MON[m2 - 1]} ${y2}`;
}
const starsShown = r => `<span class="sg-stars" style="--r:${(r / 5 * 100).toFixed(1)}%" aria-label="${r} stars"><span>★★★★★</span><span aria-hidden="true">★★★★★</span></span><b class="sg-num">${r}</b>`;
// her StoryGraph reviews: spoilers stay hidden until clicked
const reviewHtml = t => esc(t).replace(/\[spoiler\]([\s\S]*?)(\[\/spoiler\]|$)/g, '<span class="spoiler" tabindex="0" title="Spoiler: click to show">$1</span>');
function sgPanel(r){
  const icon = {read: "check", reading: "bookmark", "to-read": "clock", stopped: "x", paused: "clock"}[r.status] || "book";
  const dates = r.dates.filter(d => d[0] || d[1]);
  return `<div class="panel"><h2>Your reading</h2>
    <div class="sg-status ${r.status}">${ic(icon)}${STATUS_WORDS[r.status] || esc(r.status)}</div>
    ${dates.length ? `<ul class="sg-dates">${dates.slice().reverse().map(d => `<li>${dateRange(d)}</li>`).join("")}</ul>` : ""}
    ${r.readCount > 1 ? `<div class="saved">Read ${r.readCount} times</div>` : ""}
    ${r.rating ? `<div class="sg-rating">${starsShown(r.rating)}</div>` : ""}
    ${r.moods ? `<div class="moods">${r.moods.split(/,\s*/).map(m => `<span>${esc(m)}</span>`).join("")}</div>` : ""}
    ${r.pace ? `<div class="saved">Pace: ${esc(r.pace)}</div>` : ""}
    <span class="saved">From StoryGraph, ${niceDate(SG.imported)}.</span></div>`;
}
const reviews = r => r.reviews && r.reviews.length ? sectionHead("Your <em>review</em>") + r.reviews.map(t => `<div class="review">${reviewHtml(t)}</div>`).join("") : "";

function pageSgBook(e){   // a book from StoryGraph that isn't on her shelves
  const r = reading(e), fmt = FORMATS[e.format] || "";
  const known = e.authors.map(a => authorIndex[slug(a.name)]).filter(Boolean);
  const more = known.length ? known[0].books.map(x => x.book).slice(0, 12) : [];
  const fact = (k, v) => v ? `<dt>${k}</dt><dd>${v}</dd>` : "";
  return `<header class="hero book-hero" style="--c:#8A6A3F"><div class="book-top">${cover(e, "", true)}<div>
      <div class="kicker"><i></i><a class="label" href="#reading">Not on your shelves${fmt ? " · " + fmt : ""}</a></div>
      <h1>${esc(e.t)}</h1>${e.sub ? `<div class="sub">${esc(e.sub)}</div>` : ""}
      <div class="authors">${e.authors.map(a => authorIndex[slug(a.name)] ? `<span><a href="#a-${slug(a.name)}">${esc(a.name)}</a></span>` : `<span>${esc(a.name)}</span>`).join("")}</div>
    </div></div></header>
    <div class="book-body"><div>
      ${reviews(r) || `<p class="desc none">A book you’ve read or mean to read that isn’t on your shelves, from StoryGraph.</p>`}
      ${more.length ? sectionHead(`On your shelves by <em>${esc(known[0].name)}</em>`) + grid(more) : ""}
    </div><aside style="display:grid;gap:18px">
      ${sgPanel(r)}
      <div class="panel"><h2>Details</h2><dl class="facts">
        ${fact("Format", fmt)}${fact("ISBN-13", e.isbn13 || "")}${fact("On StoryGraph since", niceDate(e.added))}
      </dl></div></aside></div>`;
}

function pageBook(b){
  const s = shelfIndex[b.shelf], others = (editions[norm(b.title) + "|" + norm(b.surname || "")] || []).filter(x => x !== b);
  const lead = (b.authors || []).find(a => !a.role), au = lead && authorIndex[slug(lead.name)];
  const more = au ? au.books.map(x => x.book).filter(x => x !== b && !others.includes(x)).slice(0, 12) : [];
  const fact = (k, v) => v ? `<dt>${k}</dt><dd>${v}</dd>` : "";
  return `<header class="hero book-hero" style="--c:${s.color}"><div class="book-top">${cover(b, "", true)}<div>
      <div class="kicker"><i></i><a class="label" href="#shelf-${s.id}">${esc(s.name)}</a></div>
      <h1>${esc(b.t)}</h1>${b.sub ? `<div class="sub">${esc(b.sub)}</div>` : ""}
      <div class="authors">${(b.authors || []).map(a => `<span><a href="#a-${slug(a.name)}">${esc(a.name)}</a>${a.role ? ` <small>${esc(a.role)}</small>` : ""}</span>`).join("") || "<span>Unknown author</span>"}</div>
      ${seriesLine(b)}
    </div></div></header>
    <div class="book-body"><div>
      <p class="desc${b.description ? "" : " none"}">${b.description ? esc(b.description) : "No description on Libib."}</p>
      ${sgFor[b.id] ? reviews(reading(b)) : ""}
      ${others.length ? sectionHead(`Other copies <em>you own</em>`) + grid(others) : ""}
      ${more.length ? sectionHead(`More by <em>${esc(au.name)}</em>`, au.books.length > more.length + 1 ? `<a class="more" href="#a-${au.id}">All ${au.books.length}</a>` : "") + grid(more) : ""}
    </div><aside style="display:grid;gap:18px">
      ${sgFor[b.id] ? sgPanel(reading(b)) : readingPanel(b)}
      <div class="panel"><h2>Details</h2><dl class="facts">
        ${fact("Shelf", `<a href="#shelf-${s.id}">${esc(s.name)}</a>`)}${fact("Publisher", esc(b.publisher || ""))}
        ${fact("Published", niceDate(b.published) || year(b.published))}${fact("Pages", b.pages ? num(b.pages) : "")}
        ${fact("ISBN-13", b.isbn13 || "")}${fact("ISBN-10", b.isbn10 || "")}${fact("Copies", b.copies > 1 ? b.copies : "")}
        ${fact("Added", niceDate(b.added))}${fact("Title on Libib", b.t !== b.title ? esc(b.title) : "")}
      </dl></div></aside></div>`;
}

function pageAuthors(){
  const groups = {};
  AUTHORS.forEach(a => { const L = (a.sort[0] || "#").toUpperCase(); (groups[/[A-Z]/.test(L) ? L : "#"] ||= []).push(a); });
  const letters = Object.keys(groups).sort();
  return hero({kicker: "Browse", title: "The <em>authors</em>", covers: mixed([...BOOKS].sort(SORTS.author[1])), text: "Everyone with a name on a book here, illustrators and translators included, by surname.",
      figures: [[num(AUTHORS.length), "people"], [num(AUTHORS.filter(a => a.books.length > 1).length), "with more than one book"]]})
    + `<div class="letters">${letters.map(L => `<a href="#authors" data-jump="az-${L}">${L}</a>`).join("")}</div>`
    + letters.map(L => `<section class="az" id="az-${L}"><h2>${L}</h2><ul>${groups[L].map(a => `<li><a href="#a-${a.id}">${esc(a.name)}</a><span>${a.books.length}</span></li>`).join("")}</ul></section>`).join("");
}
function pageAuthor(a){
  const list = a.books.map(x => x.book).sort((x, y) => (x.published || "9999").localeCompare(y.published || "9999"));
  const roles = [...new Set(a.books.map(x => x.role).filter(Boolean))];
  return hero({kicker: `<a href="#authors">Author</a>`, title: esc(a.name), covers: list, text: roles.length ? `Also credited as ${esc(roles.join(", ").toLowerCase())}.` : "",
      figures: [[num(list.length), list.length === 1 ? "book" : "books"], [num(list.filter(isRead).length), "read"], [num(new Set(list.map(b => b.shelf)).size), "shelves"]]})
    + sectionHead("Their <em>books</em>", `<span class="more">Oldest first</span>`)
    + `<div class="books">${a.books.slice().sort((x, y) => (x.book.published || "9999").localeCompare(y.book.published || "9999")).map(x => card(x.book, x.role ? x.role : year(x.book.published) || x.book.by)).join("")}</div>`;
}

function pageReading(){
  const log = readingLog(), byFinish = (a, b) => (reading(b).finished || "").localeCompare(reading(a).finished || "");
  const now = log.filter(isReading), done = log.filter(isRead).sort(byFinish), next = log.filter(b => isToRead(b) && !isElsewhere(b)).sort(SORTS.author[1]);
  const later = log.filter(b => ["paused", "stopped"].includes(reading(b).status));
  const thisYear = String(new Date().getFullYear()), years = {};
  done.forEach(b => (years[year(reading(b).finished) || "undated"] ||= []).push(b));
  const order = Object.keys(years).filter(y => y !== "undated").sort().reverse().concat(years.undated ? ["undated"] : []);
  const away = done.filter(isElsewhere).length;
  return hero({kicker: "Your reading", title: "Reading <em>log</em>", covers: now.concat(done),
      text: `From StoryGraph, ${niceDate(SG.imported)}. Books that aren’t on your shelves (library books, ebooks, audiobooks) are here too, but never on the shelves.`,
      figures: [[num(now.length), "reading now"], [num(done.length), "read"], [num((years[thisYear] || []).length), `finished in ${thisYear}`], [num(next.length), "to read from your shelves"]]})
    + sectionHead("Reading <em>now</em>") + (now.length ? grid(now) : `<p class="empty">Nothing on the go.</p>`)
    + order.map(y => sectionHead(y === "undated" ? "Read, <em>date not recorded</em>" : `${y} <em>· ${plural(years[y].length, "book")}</em>`) + grid(years[y])).join("")
    + (later.length ? sectionHead("Paused or <em>didn’t finish</em>") + grid(later) : "")
    + `<div class="note">${ic("info")}<div><b>${num(done.length - away)} of the books you’ve read are on your shelves; ${num(away)} aren’t.</b>
        To bring in new reading, export again from StoryGraph and import it. Books StoryGraph doesn’t know can be marked on their own page; those marks stay in this browser.
        <div class="backup"><button class="btn" type="button" id="saveBackup">${ic("download")}Save a backup of those marks</button>
        <label class="btn">${ic("upload")}Load a backup<input type="file" id="loadBackup" accept=".json,application/json" hidden></label></div></div></div>`;
}

// ---------- series, in place on the shelves (her choice, 18 Oct: no page of their own) ----------
const seriesLine = b => (seriesOf[b.id] || []).map(h => `<span class="in-series">${ic("layers")}Book ${h.entry.n} of ${esc(h.series.name)}</span>`).join("");

// ---------- to read ----------
let pickFrom = "list", pickShelf = "", picked = null;
function pickPool(){
  const log = readingLog(), unread = b => !isRead(b) && !isReading(b);
  let pool = pickFrom === "list" ? log.filter(b => isToRead(b) && !isElsewhere(b)) : BOOKS.filter(unread);
  if (pickShelf) pool = pool.filter(b => b.shelf === pickShelf);
  const seen = new Set();   // one copy of each book
  return pool.filter(b => { const k = norm(b.t) + "|" + (b.surname || ""); if (seen.has(k)) return false; seen.add(k); return true; });
}
function picker(){
  const pool = pickPool(), b = picked && pool.includes(picked) ? picked : null;
  return `<div class="picker" id="picker"><div class="picker-head"><h2>What should I <em>read next?</em></h2>
      <div class="picker-opts"><select id="pickFrom" aria-label="Pick from"><option value="list"${pickFrom === "list" ? " selected" : ""}>From my to-read list</option><option value="all"${pickFrom === "all" ? " selected" : ""}>Anything unread on my shelves</option></select>
      <select id="pickShelf" aria-label="Shelf"><option value="">Any shelf</option>${SHELVES.filter(s => s.books.length).map(s => `<option value="${s.id}"${pickShelf === s.id ? " selected" : ""}>${esc(s.name)}</option>`).join("")}</select>
      <button class="btn pick" type="button" id="pickOne">${ic("sparkle")}${b ? "Pick another" : "Pick one"}</button></div></div>
    ${b ? `<a class="picked" href="${href(b)}">${cover(b)}<div><span class="label">How about…</span><h3>${esc(b.t)}</h3><div class="by">${esc(b.by)} · ${esc(shelfIndex[b.shelf].name)}</div>${b.description ? `<p>${esc(b.description.slice(0, 260))}${b.description.length > 260 ? "…" : ""}</p>` : ""}</div></a>`
      : `<p class="empty">${pool.length ? `${plural(pool.length, "book")} to choose from.` : "Nothing to pick from there."}</p>`}</div>`;
}
function pageToRead(){
  const log = readingLog(), mine = log.filter(b => isToRead(b) && !isElsewhere(b)).sort(SORTS.author[1]), away = ELSEWHERE.filter(isToRead).sort(SORTS.author[1]);
  const unread = BOOKS.filter(b => !isRead(b) && !isReading(b)).length;
  return hero({kicker: "Your reading", title: "To <em>read</em>", covers: mine.concat(away),
      text: `From your StoryGraph to-read list, ${niceDate(SG.imported)}.`,
      figures: [[num(mine.length), "on your shelves"], [num(away.length), "not on your shelves"], [num(unread), "unread books on your shelves in all"]]})
    + picker()
    + sectionHead("On your <em>shelves</em>", `<span class="more">Ready to read</span>`) + (mine.length ? grid(mine) : `<p class="empty">Nothing from your to-read list is on your shelves.</p>`)
    + sectionHead("Not on your <em>shelves</em>", `<span class="more">Library, ebook, or one to buy</span>`) + (away.length ? grid(away) : `<p class="empty">Everything on your list is on your shelves.</p>`);
}

function pageToBuy(){
  const got = WISH.filter(w => GOT[w.id]).length;
  const list = [...WISH].sort((a, b) => a.sortAuthor.localeCompare(b.sortAuthor) || a.sortTitle.localeCompare(b.sortTitle));
  return hero({kicker: "On the lookout", title: "To <em>buy</em>", text: "Books to look out for. Tick one off when you find it.",
      figures: [[num(WISH.length - got), "still to find"], [num(got), "found"]]})
    + `<div class="wish">${list.map(w => `<div class="wish-item${GOT[w.id] ? " got" : ""}">${cover(w)}<div><h3>${esc(w.t)}</h3>${w.sub ? `<div class="by">${esc(w.sub)}</div>` : ""}<div class="by">${esc(w.by)}</div>
        ${w.maybeOwned ? `<a class="flag" href="#b-${w.maybeOwned[0]}">${ic("info")}Already on a shelf?</a>` : ""}
        ${GOT[w.id] ? `<a class="flag add" href="#add" data-add-from="${w.id}">${ic("plus")}Add it to a shelf</a>` : ""}</div>
        <button type="button" class="tick${GOT[w.id] ? " on" : ""}" data-got="${w.id}" aria-label="Found it" aria-pressed="${!!GOT[w.id]}">${ic("check")}</button></div>`).join("")}</div>`;
}

// ---------- add a book ----------
// Typed or scanned ISBN -> details from Open Library (through the little server, tools/serve.py) -> a shelf -> saved in
// data/added.json and the site rebuilt. Only works in her app window (served from the server), not from the folder.
let addForm = {isbn: "", title: "", authors: "", publisher: "", published: "", pages: "", cover: "", shelf: "", note: "", busy: false};
const api = (path, opts = {}) => fetch(path, {...opts, headers: {"X-Library": "1", "Content-Type": "application/json", ...(opts.headers || {})}}).then(r => r.json());
function pageAdd(){
  const f = addForm, served = location.protocol.startsWith("http");
  const field = (k, label, extra = "") => `<label><span>${label}</span><input id="add-${k}" value="${esc(f[k] || "").replace(/’/g, "'")}" ${extra}></label>`;
  return hero({kicker: "Your shelves", title: "Add a <em>book</em>", text: "Type or scan its ISBN (the barcode number, usually on the back), check the details, pick a shelf."})
    + (!served ? `<div class="note">${ic("info")}<div><b>Open the library from its desktop shortcut to add books.</b> Opened straight from the folder, it can’t save anything.</div></div>` : "")
    + `<div class="add-form" id="addForm">
        <div class="isbn-row">${field("isbn", "ISBN", 'inputmode="numeric" autocomplete="off" placeholder="9780000000000"')}
          <button class="btn pick" type="button" id="addLookup"${served ? "" : " disabled"}>${ic("search")}Look it up</button></div>
        ${f.note ? `<p class="add-note">${esc(f.note)}</p>` : ""}
        <div class="add-main">${f.cover ? `<div class="cover"><img src="${esc(f.cover)}" alt=""></div>` : `<div class="cover gap"></div>`}
          <div class="add-fields">${field("title", "Title")}${field("authors", "Author(s), with commas between")}
            <div class="two">${field("publisher", "Publisher")}${field("published", "Published")}</div>
            <div class="two">${field("pages", "Pages", 'inputmode="numeric"')}
              <label><span>Shelf</span><select id="add-shelf"><option value="">Choose a shelf…</option>${SHELVES.filter(s => s.libib).map(s => `<option value="${s.id}"${f.shelf === s.id ? " selected" : ""}>${esc(s.name)}</option>`).join("")}</select></label></div>
            <button class="btn pick" type="button" id="addSave"${served && !f.busy ? "" : " disabled"}>${ic("plus")}${f.busy ? "Adding…" : "Add to the shelf"}</button>
          </div></div></div>`;
}
const readAdd = () => ["isbn", "title", "authors", "publisher", "published", "pages"].forEach(k => { const el = document.getElementById("add-" + k); if (el) addForm[k] = el.value.trim(); });
const redrawAdd = () => { const y = scrollY; document.getElementById("view").innerHTML = pageAdd(); scrollTo(0, y); };
document.addEventListener("click", async e => {
  const from = e.target.closest("[data-add-from]");
  if (from) { const w = WISH.find(x => x.id === from.dataset.addFrom); addForm = {isbn: w.isbn13 || "", title: w.title, authors: w.by === "Unknown author" ? "" : w.by.replace(/ & /g, ", "), publisher: "", published: "", pages: "", cover: "", shelf: "", note: "", busy: false}; return; }
  if (e.target.closest("#addLookup")) {
    readAdd(); if (!addForm.isbn) { addForm.note = "Type the ISBN first."; return redrawAdd(); }
    addForm.note = "Looking it up…"; redrawAdd();
    try { const d = await api("api/lookup?isbn=" + encodeURIComponent(addForm.isbn));
      if (d.found) Object.assign(addForm, {title: d.title, authors: d.authors.join(", "), publisher: d.publisher, published: d.published, pages: d.pages || "", cover: d.cover, note: "Found it. Check the details and pick a shelf."});
      else addForm.note = "Open Library doesn’t know that ISBN. Fill in the details yourself."; }
    catch { addForm.note = "Couldn’t reach Open Library. Fill in the details yourself."; }
    return redrawAdd();
  }
  if (e.target.closest("#addSave")) {
    readAdd(); addForm.shelf = document.getElementById("add-shelf").value;
    if (!addForm.title || !addForm.shelf) { addForm.note = !addForm.title ? "It needs a title." : "Pick a shelf for it."; return redrawAdd(); }
    addForm.busy = true; addForm.note = ""; redrawAdd();
    try { const r = await api("api/books", {method: "POST", body: JSON.stringify({...addForm, authors: addForm.authors.split(",")})});
      if (r.ok) { addForm = {isbn: "", title: "", authors: "", publisher: "", published: "", pages: "", cover: "", shelf: "", note: "", busy: false}; location.href = location.pathname + "?v=" + Date.now() + "#b-" + r.id; return; }
      addForm.note = r.error || "That didn’t save."; }
    catch { addForm.note = "That didn’t save: is the library open from its shortcut?"; }
    addForm.busy = false; redrawAdd();
  }
});
document.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.id === "add-isbn") document.getElementById("addLookup")?.click(); });

function pageStats(){
  const pages = BOOKS.reduce((n, b) => n + (b.pages || 0), 0), withPages = BOOKS.filter(b => b.pages);
  const bars = (rows, max) => `<div class="bars">${rows.map(r => `<${r.href ? `a href="${r.href}"` : "div"} class="bar-row" style="--c:${r.color || "var(--deep-2)"}"><b>${esc(r.label)}</b><div class="track"><i style="width:${(r.n / max * 100).toFixed(1)}%"></i></div><span>${r.text || num(r.n)}</span></${r.href ? "a" : "div"}>`).join("")}</div>`;
  const shelves = SHELVES.filter(s => s.books.length).map(s => ({label: s.name, n: s.books.length, color: s.color, href: "#shelf-" + s.id,
    text: `${num(s.books.length)} · ${Math.round(s.books.length / BOOKS.length * 100)}%`})).sort((a, b) => b.n - a.n);
  const top = AUTHORS.map(a => ({label: a.name, n: a.books.filter(x => !x.role).length, href: "#a-" + a.id})).sort((a, b) => b.n - a.n).slice(0, 12);
  const pubs = {}; BOOKS.forEach(b => { if (b.publisher) { const p = b.publisher.replace(/\s+(Ltd|Limited|PLC|Plc|plc|Inc|LLC|Publishing|Publishers|Books)\.?$/g, "").replace(/,$/, "").trim(); pubs[p] = (pubs[p] || 0) + 1; } });
  const topPubs = Object.entries(pubs).map(([label, n]) => ({label, n})).sort((a, b) => b.n - a.n).slice(0, 10);
  const dec = {}; BOOKS.forEach(b => { const y = +year(b.published); if (y) { const d = Math.floor(y / 10) * 10; dec[d] = (dec[d] || 0) + 1; } });
  const decs = Object.keys(dec).map(Number).sort(), dmax = Math.max(...Object.values(dec));
  const readN = BOOKS.filter(isRead).length, perYear = {};
  readingLog().filter(isRead).forEach(b => { const y = year(reading(b).finished); if (y) perYear[y] = (perYear[y] || 0) + 1; });
  const readYears = Object.keys(perYear).sort().reverse().map(y => ({label: y, n: perYear[y], href: "#reading"}));
  return hero({kicker: "The numbers", title: "<em>Stats</em>", text: "How the library adds up.", covers: mixed([...BOOKS].reverse())})
    + `<div class="ledger"><div class="ledger-grid">
        <div class="meter"><b>${num(BOOKS.length)}</b><span>books on the shelves</span></div>
        <div class="meter"><b>${num(pages)}</b><span>pages (${num(withPages.length)} books with a page count)</span></div>
        <div class="meter"><b>${num(Math.round(pages / (withPages.length || 1)))}</b><span>pages in an average book</span></div>
        <div class="meter"><b>${Math.round(readN / BOOKS.length * 100)}%</b><span>read (${plural(readN, "book")})</span></div>
      </div></div>`
    + sectionHead("By <em>shelf</em>") + bars(shelves, shelves[0].n)
    + (readYears.length ? sectionHead("Books read <em>each year</em>", `<span class="more">From StoryGraph, shelves or not</span>`) + bars(readYears, Math.max(...readYears.map(r => r.n))) : "")
    + sectionHead("Most <em>books</em> by", `<span class="more">Written, not illustrated or translated</span>`) + bars(top, top[0].n)
    + sectionHead("When they were <em>published</em>") + `<div class="decades">${decs.map(d => `<div><b>${dec[d]}</b><i style="height:${(dec[d] / dmax * 100).toFixed(1)}%"></i><span>${d}s</span></div>`).join("")}</div>`
    + sectionHead("Top <em>publishers</em>") + bars(topPubs, topPubs[0].n);
}

// ---------- search ----------
const q = document.getElementById("q");
document.getElementById("searchIco").innerHTML = ic("search");
function pageSearch(term){
  const t = term.toLowerCase().trim(), tn = t.replace(/[^0-9x]/g, "");
  const hit = b => b.title.toLowerCase().includes(t) || b.by.toLowerCase().includes(t) || (b.authors || []).some(a => a.name.toLowerCase().includes(t))
    || (tn.length >= 6 && ((b.isbn13 || "").includes(tn) || (b.isbn10 || "").toLowerCase().includes(tn)));
  const books = BOOKS.filter(hit).sort(SORTS.title[1]), authors = AUTHORS.filter(a => a.name.toLowerCase().includes(t)), wish = WISH.filter(hit);
  const away = ELSEWHERE.filter(hit).sort(SORTS.title[1]);
  return `<div class="section-head" style="margin-top:56px"><h2>Results for <em>‘${esc(term)}’</em></h2><span class="more">${plural(books.length, "book")}</span></div>`
    + (authors.length ? `<div class="chips" style="margin-bottom:28px">${authors.slice(0, 20).map(a => `<a class="btn" href="#a-${a.id}">${ic("user")}${esc(a.name)} · ${a.books.length}</a>`).join("")}</div>` : "")
    + (books.length ? grid(books) : `<p class="empty">No books match.</p>`)
    + (away.length ? sectionHead("Read or to read, <em>not on your shelves</em>") + grid(away) : "")
    + (wish.length ? sectionHead("On the <em>to-buy list</em>") + `<div class="books">${wish.map(w => `<a class="bk" href="#to-buy">${cover(w)}<h3>${esc(w.t)}</h3><div class="by">${esc(w.by)}</div></a>`).join("")}</div>` : "");
}
q.addEventListener("input", () => { const v = q.value.trim(); if (v.length >= 2) { document.getElementById("view").innerHTML = pageSearch(v); scrollTo(0, 0); } else if (!v) route(); });
q.addEventListener("keydown", e => { if (e.key === "Escape") { q.value = ""; route(); } });
document.getElementById("nav").addEventListener("click", () => { if (q.value) q.value = ""; });

// ---------- routing ----------
function route(){
  const key = location.hash.slice(1) || "home", view = document.getElementById("view");
  let html, active = "#" + key, title = "Jemma’s Library";
  if (key.startsWith("shelf-") && shelfIndex[key.slice(6)]) { shelfView = {...SHELF_VIEW}; const s = shelfIndex[key.slice(6)]; html = pageShelf(s); title = s.name; }
  else if (key === "shelves") { shelfView = {...SHELF_VIEW}; html = pageAllShelves(); title = "All shelves"; }
  else if (key.startsWith("b-") && bookIndex[key.slice(2)]) { const b = bookIndex[key.slice(2)]; html = pageBook(b); active = "#shelf-" + b.shelf; title = b.t; }
  else if (key.startsWith("r-") && SG.books[+key.slice(2)] && !SG.books[+key.slice(2)].books) { const e = SG.books[+key.slice(2)]; html = pageSgBook(e); active = "#reading"; title = e.t; }
  else if (key.startsWith("a-") && authorIndex[key.slice(2)]) { const a = authorIndex[key.slice(2)]; html = pageAuthor(a); active = "#authors"; title = a.name; }
  else html = {authors: pageAuthors, reading: pageReading, "to-read": pageToRead, add: pageAdd, "to-buy": pageToBuy, stats: pageStats}[key]?.() || (active = "#home", pageHome());
  view.innerHTML = html; renderNav(active);
  document.title = title === "Jemma’s Library" ? title : `${curly(title)} · Jemma’s Library`;
  scrollTo(0, 0);
}
addEventListener("hashchange", () => { q.value = ""; route(); });

// ---------- interactions ----------
const saveRead = () => store.set(READ_KEY, READ);
function setReading(id, change){
  const b = bookIndex[id], r = {...reading(b), ...change};
  if (r.status === "none") { READ[id] = {status: "none"}; }   // "none" also hides what Libib had
  else READ[id] = Object.fromEntries(Object.entries(r).filter(([, v]) => v !== "" && v != null));
  saveRead();
}
document.addEventListener("click", e => {
  const t = e.target.closest("button, a[data-jump]"); if (!t) return;
  const id = location.hash.slice(3);
  if (t.dataset.status) {
    const today = new Date().toISOString().slice(0, 10), r = reading(bookIndex[id]), ch = {status: t.dataset.status};
    if (ch.status === "reading" && !r.started) ch.started = today;
    if (ch.status === "read" && !r.finished) ch.finished = today;
    setReading(id, ch); route();
  } else if (t.dataset.star) { setReading(id, {rating: +t.dataset.star || null}); route(); }
  else if (t.dataset.filter || t.dataset.view) {
    if (t.dataset.filter) shelfView.filter = t.dataset.filter; else store.set(VIEW_KEY, t.dataset.view);
    document.getElementById("shelfBooks").innerHTML = shelfBooks(currentList);
  } else if (t.dataset.got) { GOT[t.dataset.got] = !GOT[t.dataset.got]; if (!GOT[t.dataset.got]) delete GOT[t.dataset.got]; store.set(GOT_KEY, GOT); const y = scrollY; route(); scrollTo(0, y); }
  else if (t.dataset.jump) { e.preventDefault(); document.getElementById(t.dataset.jump).scrollIntoView({behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"}); }
  else if (t.id === "saveBackup") {
    const blob = new Blob([JSON.stringify({reading: READ, found: GOT, saved: new Date().toISOString()}, null, 1)], {type: "application/json"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `jemmas-library-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(a.href);
  }
});
document.addEventListener("click", e => { const s = e.target.closest(".spoiler"); if (s) s.classList.toggle("shown"); });
document.addEventListener("click", e => { if (!e.target.closest("#pickOne")) return;
  const pool = pickPool().filter(b => b !== picked); picked = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  document.getElementById("picker").outerHTML = picker(); });
document.addEventListener("change", e => {
  const t = e.target;
  if (t.id === "sort") { shelfView.sort = t.value; document.getElementById("shelfBooks").innerHTML = shelfBooks(currentList); }
  else if (t.id === "pickFrom" || t.id === "pickShelf") { if (t.id === "pickFrom") pickFrom = t.value; else pickShelf = t.value; picked = null; document.getElementById("picker").outerHTML = picker(); }
  else if (t.dataset.date) setReading(location.hash.slice(3), {[t.dataset.date]: t.value});
  else if (t.id === "loadBackup" && t.files[0]) t.files[0].text().then(txt => {
    try { const d = JSON.parse(txt); READ = d.reading || {}; GOT = d.found || {}; saveRead(); store.set(GOT_KEY, GOT); route(); }
    catch { alert("That file isn’t a library backup."); }
  });
});

// installed as a Chrome app from the local server (sharp taskbar icon); opened straight from the folder it's an ordinary page
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});
// no "Install as app" offer: her shortcut window already has its own sharp taskbar icon (18 Oct)
addEventListener("beforeinstallprompt", e => e.preventDefault());

route();
