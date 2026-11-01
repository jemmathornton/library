// Jemma's Library: the page code. Everything is drawn from DATA (js/data.js, built by tools/build.py from data/).
// Reading comes from StoryGraph (data/storygraph.json); the site shows it and never sets it (her choice, 18 Oct: no buttons).
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
const VIEW_KEY = "jemmas-library-view";   // covers or list: a viewing preference, nothing more

// ---------- the library ----------
const SHELVES = DATA.shelves, shelfIndex = {};
SHELVES.forEach(s => { s.books = []; shelfIndex[s.id] = s; });
const BOOKS = DATA.books, bookIndex = {}, authorIndex = {}, editions = {};

// Display title: bracketed bits (series, edition, imprint) become a small line under it; a long subtitle after a colon
// does too, unless the part before the colon ends in a number ("Famous Five 9: Five Fall Into Adventure" stays whole).
// Imprints, formats, shop notes and prize blurbs aren't part of a title: they're dropped, not shown (her ask, 18 Oct).
const TITLE_NOISE = /^(gollancz s\.?\s?f\.?|voyager classics|puffin modern classics|storybook classics|wiley desktop editions|rough guides main series|seasonal|seasonal activity books|offered exclusively by amazon|hardcover|hardback|paperback|e|mira|iuniverse paperback|quest|the emma press novels|a novel|author|one)$/i;
const BLURB = /booker|bestseller|from the author of|shortlisted|longlisted|a novel for|award|spellbinding/i;
function tidyTitle(raw){
  let t = raw.trim().replace(/\s{2,}/g, " ").replace(/\s+(\.{3}\s*)?by\s+[^()]*\(\s*Author\s*\).*$/i, "").replace(/^The(?=[A-Z])/, "The "), bits = [], m;   // Amazon's "... by X ( Author ) ON date"
  while ((m = /\s*\(([^()]*)\)/.exec(t))) { if (m[1].trim()) bits.unshift(m[1].trim()); t = (t.slice(0, m.index) + t.slice(m.index + m[0].length)).trim(); }
  t = t.replace(/\s+Paperback$/i, "").replace(/[\s:;,–-]+$/, "").trim();   // "The Bear and The Nightingale: (Winternight Series)" leaves no colon behind
  const blurb = /:\s*([^:]+)$/.exec(t);   // "Autumn: Longlisted for the Man Booker Prize 2017": the blurb goes
  if (blurb && BLURB.test(blurb[1])) t = t.slice(0, blurb.index).trim();
  const inSeries = /:\s*Number (\d+) in series$/i.exec(t);   // "Waywalkers: Number 1 in series"
  if (inSeries) { bits.unshift("Book " + inSeries[1]); t = t.slice(0, inSeries.index).trim(); }
  const of = /:\s*(\d+)\/\d+$/.exec(t);   // "Foundation: 1/3"
  if (of) { bits.unshift("Book " + of[1]); t = t.slice(0, of.index).trim(); }
  // "Famous Five: 1: Five On A Treasure Island" -> "Five On A Treasure Island", with "Famous Five 1" underneath
  const numbered = /^(.+?):\s*(\d+):\s*(.+)$/.exec(t);
  if (numbered) { bits.unshift(numbered[1] + " " + numbered[2]); t = numbered[3]; }
  const c = numbered ? -1 : t.indexOf(": ");
  if (c > 0 && !/\d$/.test(t.slice(0, c)) && t.slice(0, c).split(/\s+/).length >= 2) { bits.unshift(t.slice(c + 2)); t = t.slice(0, c); }
  bits = [...new Set(bits.map(x => /^\d+$/.test(x) ? "Book " + x : x.replace(/:\s*Bk\.?\s*\d+$/i, "")))].filter(x => !TITLE_NOISE.test(x) && !BLURB.test(x));
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

// trial (28 Oct): proposed covers (data/covers-trial.json) shown only while the switch bottom right is on, for her to judge
const TRIAL_KEY = "jemmas-library-trial-covers", TRIAL = store.get(TRIAL_KEY, false);
const TRIALS = [...BOOKS, ...WISH, ...(DATA.storygraph || {books: []}).books.filter(e => !e.books)].filter(b => b.coverTrial);   // read but not owned too
TRIALS.forEach(b => { b.coverWas = b.cover; b.coverRatioWas = b.coverRatio; if (TRIAL) { b.cover = b.coverTrial; b.coverRatio = b.coverTrialRatio; } });

// ---------- reading ----------
// StoryGraph is where she tracks her reading (data/storygraph.json, from its export): it wins for every book it knows.
// A StoryGraph book can cover several copies on the shelves; ones not on the shelves (ebooks, audiobooks, borrowed)
// get a page of their own (#r-<n>). Books StoryGraph doesn't know can be marked here (kept in this browser).
const SG = DATA.storygraph || {books: []}, sgFor = {}, ELSEWHERE = [];
const RANK = {reading: 5, read: 4, paused: 3, stopped: 2, "to-read": 1};
const STATUS_WORDS = {read: "Read", reading: "Reading now", "to-read": "Not read yet", stopped: "Didn’t finish", paused: "Paused"};
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
    reviews: list.filter(e => e.review).map(e => e.review), key: list[0].id,
    format: (list.filter(e => e.format).sort(latest)[0] || {}).format};   // how she read it last: paperback, hardcover, audio, digital
}
const isElsewhere = b => String(b.id).startsWith("r-");
const reading = b => isElsewhere(b) ? (b.merged ||= sgMerged([b]))
  : sgFor[b.id] ? (sgFor[b.id].merged ||= sgMerged(sgFor[b.id]))
  : (b.status ? {status: b.status} : {});
const isRead = b => reading(b).status === "read", isReading = b => reading(b).status === "reading", isToRead = b => reading(b).status === "to-read";
// everything she has read or means to read, each book once (not once per copy; a copy with a cover stands for the rest)
// one book, however many copies she owns: same tidied title and surname, and the same series number if it has one
const bookKey = b => { const h = (seriesOf[b.id] || [])[0];
  return norm(b.t) + "|" + norm(b.surname || b.by || "") + "|" + (h ? h.series.id + h.entry.n : norm(/edition$/i.test(b.sub || "") ? "" : b.sub || "")); };   // an edition note ("Illumicrate Edition") is still the same book
function readingLog(){
  const seen = new Set(), out = [];
  [...BOOKS].sort((a, b) => !!b.cover - !!a.cover).forEach(b => { const k = bookKey(b); if (!seen.has(k) && reading(b).status) { seen.add(k); out.push(b); } });
  return out.concat(ELSEWHERE);
}
// every time she finished a book (a re-read counts in its own year: 8 books read in 2025 and again in 2026; her
// 100 books in 2025, 18 Oct); one date per finish, even when two StoryGraph editions of a book share it
const finishes = b => { const r = reading(b), ends = [...new Set((r.dates || []).map(d => d[1]).filter(Boolean))];
  return ends.length ? ends : r.finished ? [r.finished] : []; };
// "read this year" everywhere: every finish that year, a re-read too
const finishedIn = y => readingLog().filter(isRead).flatMap(finishes).filter(d => year(d) === y);
// how many books are read, each book once however many copies (three Philosopher's Stones are one book)
const booksRead = list => new Set(list.filter(isRead).map(bookKey)).size;
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
// a book in a series shows the series' own title for it, with "Series, book n" underneath, instead of however Libib
// wrote the series into the title ("Famous Five 10: Five On A Hike Together"); an edition note is kept. Boxed sets and
// omnibuses (one book, several entries) keep their own title. Her own displayTitle always wins. (Her ask, 18 Oct.)
BOOKS.forEach(b => {
  const hits = seriesOf[b.id];
  if (!hits || hits.length !== 1 || b.displayTitle || /collection|box(ed)? set|omnibus/i.test(b.title)) return;
  const {series, entry} = hits[0];
  // her special editions (data/editions.json) first, then an edition named in the title
  const edition = (b.special || (/(illustrated|hufflepuff|children's|collector's|centenary|special|anniversary|movie tie-in|illumicrate)[\w' -]*edition/i.exec(b.title) || [])[0] || "")
    .replace(/(^|[\s-])\w/g, c => c.toUpperCase()).replace(/'/g, "’");
  // a group with no numbering (series.json "unnumbered", e.g. Discworld extras) just names the group
  b.t = entry.title; b.sub = `${series.name}${series.unnumbered ? "" : ", book " + entry.n}${edition ? " · " + edition : ""}`;
  b.edition = edition;   // the book page says the series in its own line, so only this goes under its title
  b.sortTitle = sortTitle(b.t);
});
// All her copies of one book share one reading record: StoryGraph may have linked each copy to a different entry (the
// Prisoner of Azkaban twice, 18 Oct), so the entries of every copy are joined. The same for books not on her shelves
// that StoryGraph lists twice (Worm; Murder at the Vicarage with and without "The"): one is kept, with both entries' reading.
(function joinCopies(){
  const groups = {};
  BOOKS.forEach(b => (groups[bookKey(b)] ||= []).push(b));
  Object.values(groups).forEach(copies => {
    const entries = [...new Set(copies.flatMap(b => sgFor[b.id] || []))];
    if (entries.length && copies.length > 1) copies.forEach(b => { sgFor[b.id] = entries.slice(); });
  });
  const away = {};
  ELSEWHERE.forEach(e => (away[norm(e.t.replace(/^(the|a|an) /i, "")) + "|" + norm(e.by)] ||= []).push(e));
  Object.values(away).filter(l => l.length > 1).forEach(l => { l[0].merged = sgMerged(l); l.slice(1).forEach(e => ELSEWHERE.splice(ELSEWHERE.indexOf(e), 1)); });
})();
// Books she has read but doesn't own sit on a shelf too, tagged Not owned (her choice, 18 Oct; data/elsewhere-shelves.json).
// They stay out of the shelf counts and the library's own figures; books she only means to read stay off the shelves.
const NOT_OWNED = [];
ELSEWHERE.forEach(e => { const id = (DATA.elsewhereShelves || {})[e.title]; if (!id || !shelfIndex[id] || isToRead(e)) return;
  e.shelf = id; e.notOwned = true; (shelfIndex[id].notOwned ||= []).push(e); NOT_OWNED.push(e); });
// where she stands with one book of a series
function entryState(e){
  const all = e.owned.concat(e.away), read = all.some(isRead), now = all.some(isReading);
  return {read, now, owned: e.owned.length > 0, wish: e.wish.length > 0, book: e.owned.find(b => b.cover) || e.owned[0] || e.away[0] || e.wish[0]};
}

// ---------- pieces ----------
// covers are copied into covers/; one still only linked from Open Library uses its quicker medium size in lists
const coverSrc = (b, big) => big || !/^https:/.test(b.cover) ? b.cover : b.cover.replace(/-L\.jpg$/, "-M.jpg");
// her signed copies (data/signed.json, her choice 1 Nov): a brass seal with a pen, bottom right level with the stars;
// signed to her, a scalloped seal with a big pen and a small person beside it
const SIGN_PATHS = {signed: '<path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/>',
  "to-you": '<path d="M18.9 5.7a1.9 1.9 0 0 1 2.7 2.7L10.7 19.3l-3.7 1.1 1.1-3.7z"/><circle cx="6" cy="4.6" r="2.1"/><path d="M2.6 10.8a3.4 3.4 0 0 1 6.8 0"/>'};
const SIGN_WORDS = {signed: "Signed", "to-you": "Signed to you"};
const sealMark = kind => `<span class="seal${kind === "to-you" ? " fancy" : ""}" title="${SIGN_WORDS[kind]}"><svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${SIGN_PATHS[kind]}</svg></span>`;
function cover(b, extra = "", big = false){
  const s = shelfIndex[b.shelf], st = reading(b).status;
  // read or reading: a tick (or bookmark) in the top corner, walnut and cream (her choice, 18 Oct); her stars, filled to
  // the rating with no number, in a strip across the foot
  // read: a cream "Read" sash across the top corner (her choice, 18 Oct, over a tick)
  // didn't finish and paused: "DNF" and "Paused" sashes the same way (her choices, 18 Oct)
  // with a small icon for how she read it: an open book (print), headphones (audiobook) or a tablet (ebook) (her ask, 18 Oct)
  const fmt = reading(b).format, how = {paperback: "book-open", hardcover: "book-open", audio: "headphones", digital: "tablet"}[fmt];
  const sash = (word, title) => `<span class="sash" title="${title}${fmt ? " · " + FORMATS[fmt] : ""}">${how ? ic(how) : ""}${word}</span>`;
  const badge = st === "read" ? sash("Read", "Read") : st === "reading" ? sash("Reading", "Reading now")
    : st === "stopped" ? sash("DNF", "Didn’t finish") : st === "paused" ? sash("Paused", "Paused") : "";
  const r = reading(b).rating;
  const strip = r ? `<span class="rated" title="${starsText(r)} stars"><span class="sg-stars" style="--r:${(r / 5 * 100).toFixed(1)}%"><span>★★★★★</span><span aria-hidden="true">★★★★★</span></span></span>` : "";
  // not owned: the cover faded, with a walnut "Not owned" band across it (her choice, 18 Oct; not on a book's own page)
  const tag = (b.notOwned && !big ? `<span class="not-owned">Not owned</span>` : "")
    // a special edition (Illumicrate and the like, data/editions.json): a brass sash across the other top corner (her ask, 18 Oct)
    + (b.special && !big ? `<span class="special" title="${esc(b.special)}">Special</span>` : "")
    + (b.signed ? sealMark(b.signed) : "");
  // the whole cover at its own shape, never trimmed to a frame (her ask, 30 Oct); a picture with no known shape keeps the frame
  const ratio = b.cover && b.coverRatio;
  return `<div class="cover${b.cover ? "" : " blank"}${ratio ? " fit" : ""}${b.notOwned && !big ? " unowned" : ""}${TRIAL && b.coverTrial ? " trial" : ""} ${extra}" style="--c:${s ? s.color : "#5E3D22"}${ratio ? ";--r:" + ratio : ""}">${badge}${tag}${strip}${b.cover ? `<img src="${esc(coverSrc(b, big))}" alt="" loading="lazy">` : ""}<span class="t">${esc(b.t)}</span><span class="a">${esc(b.by)}</span></div>`;
}
// a cover that won't load becomes a title card
document.addEventListener("error", e => { const img = e.target; if (img.tagName === "IMG" && img.parentNode.classList.contains("cover")) { img.parentNode.classList.add("blank"); img.remove(); } }, true);

const href = b => isElsewhere(b) ? "#" + b.id : "#b-" + b.id;
const card = (b, note) => `<a class="bk" href="${href(b)}"><div class="slot">${cover(b)}</div><h3>${esc(b.t)}</h3><div class="by">${esc(note || b.by)}</div></a>`;
const grid = (list, cls = "") => list.length ? `<div class="books ${cls}">${list.map(b => card(b)).join("")}</div>` : "";
function listView(list){
  return `<div class="blist">${list.map(b => { const st = reading(b).status;
    return `<a href="${href(b)}">${cover(b)}<b>${esc(b.t)}</b><span>${esc(b.by)}</span><span>${esc(b.publisher || "")}</span><span>${year(b.published)}</span>`
      + `<span class="st ${st || ""}">${st === "read" ? "Read" : st === "reading" ? "Reading" : ""}</span></a>`; }).join("")}</div>`;
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
  const nReading = readingLog().filter(isReading).length, left = WISH.length;
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
      ${link("#to-buy", ic("shopping-bag"), "To buy", left)}
      ${link("#authors", ic("users"), "Authors", AUTHORS.length)}
      ${link("#stats", ic("chart"), "Stats")}
      ${link("#add", ic("plus"), "Add a book")}    </div>`;
}

// ---------- pages ----------
// home (her yes to a fuller one, 18 Oct): this year in figures, what she's reading, what she just finished, a pick
// for what to read next, the shelves, and what's new on them (no closing line: out of place, her call)
function pageHome(){
  const log = readingLog(), now = log.filter(isReading), thisYear = String(new Date().getFullYear());
  const lastFinish = b => finishes(b).sort().pop() || "";
  const done = log.filter(isRead).filter(b => lastFinish(b)).sort((a, b) => lastFinish(b).localeCompare(lastFinish(a))).slice(0, 6);
  const yearReads = finishedIn(thisYear).length;
  const unreadOwned = BOOKS.filter(b => !isRead(b) && !isReading(b)).length;   // her to-read list is for borrowing, not this site (1 Nov)
  const recent = [...BOOKS].sort((a, b) => (b.added || "").localeCompare(a.added || "")).slice(0, 6);
  const fan = s => { const withCover = s.books.filter(b => b.cover), pick = (withCover.length >= 3 ? withCover : s.books).slice(0, 3); return pick.map(b => cover(b)).join(""); };
  const shortDate = d => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ""); return m ? `${+m[3]} ${MON[m[2] - 1]}` : ""; };
  return hero({kicker: "Home library", title: "Jemma’s <em>Library</em>", covers: [...BOOKS].sort(SORTS.added[1]),
      text: "Every book on the shelves at home, and everything you read.",
      figures: [[num(yearReads), `read in ${thisYear}`], [num(BOOKS.length), "books on the shelves"], [num(unreadOwned), "not read yet on your shelves"], [num(AUTHORS.length), "authors"]]})
    + (now.length ? sectionHead("Reading <em>now</em>", `<a class="more" href="#reading">All your reading</a>`)
        + `<div class="now-row">${now.map(b => { const st = reading(b).started; return `<a class="now-card" href="${href(b)}">${cover(b, "", true)}<div><span class="label">Reading now</span><h3>${esc(b.t)}</h3><div class="by">${esc(b.by)}</div>${st ? `<div class="by">Started ${niceDate(st)}</div>` : ""}</div></a>`; }).join("")}</div>` : "")
    + (done.length ? sectionHead("Just <em>finished</em>") + `<div class="books row">${done.map(b => card(b, `Finished ${shortDate(lastFinish(b))}`)).join("")}</div>` : "")
    // newest books, straight under what she's just read (her ask, 1 Nov; it was at the foot of the page)
    + sectionHead("New on the <em>shelves</em>") + `<div class="books row">${recent.map(b => card(b, `Added ${niceDate(b.added)}`)).join("")}</div>`
    + picker()
    + sectionHead("The <em>shelves</em>", `<a class="more" href="#shelves">See them all at once</a>`)
    + `<div class="shelves">${SHELVES.filter(s => s.books.length).map(s => `<a class="shelf-card" href="#shelf-${s.id}" style="--c:${s.color}"><div class="fan">${fan(s)}</div>
        <div class="txt"><h3>${esc(s.name)}</h3><span>${plural(s.books.length, "book")}</span></div></a>`).join("")}</div>`;
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
  finished: ["Recently read", (a, b) => (finishes(b).sort().pop() || "").localeCompare(finishes(a).sort().pop() || "") || a.sortTitle.localeCompare(b.sortTitle)],
  stars: ["Your stars", (a, b) => (reading(b).rating || 0) - (reading(a).rating || 0) || a.sortAuthor.localeCompare(b.sortAuthor)],
};
const FILTERS = {all: ["All", () => true], owned: ["Owned", b => !b.notOwned], notowned: ["Not owned", b => !!b.notOwned], special: ["Special editions", b => !!b.special], signed: ["Signed", b => !!b.signed], toyou: ["Signed to you", b => b.signed === "to-you"], unread: ["Not read", b => !isRead(b) && !isReading(b)], reading: ["Reading", isReading], read: ["Read", isRead]};

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
  currentList = BOOKS.concat(NOT_OWNED); currentGrouped = true;
  const shelves = SHELVES.filter(s => s.books.length && s.libib).length;
  return hero({kicker: `<a href="#home">Every shelf</a>`, title: "All <em>shelves</em>", covers: mixed(BOOKS), text: "The whole bookcase at once, shelf by shelf, each in author surname order.",
      figures: [[num(BOOKS.length), "books"], [num(shelves), "shelves"], [num(AUTHORS.length), "authors"], [num(booksRead(BOOKS)), "read"]]})
    + `<div id="shelfBooks">${shelfBooks(currentList)}</div>`;
}
function pageShelf(s){
  currentList = s.books.concat(s.notOwned || []); currentGrouped = false;
  const authors = new Set(s.books.map(b => b.by)).size, pages = s.books.reduce((n, b) => n + (b.pages || 0), 0);
  return hero({kicker: `<a href="#home">Shelf</a>`, title: esc(s.name), color: s.color, text: s.note ? esc(s.note) : "", covers: [...s.books].sort(SORTS.author[1]),
      figures: [[num(s.books.length), "books"], [num(authors), "authors"], [num(booksRead(s.books)), "read"], ...((s.notOwned || []).length ? [[num(s.notOwned.length), "read but not owned"]] : []), [num(pages), "pages"]]})
    + `<div id="shelfBooks">${shelfBooks(currentList)}</div>`;
}

// her reading on a book StoryGraph doesn't know: shown, never set here (her choice, 18 Oct: no buttons on the site)
function readingPanel(b){
  const st = reading(b).status;
  return `<div class="panel" id="readPanel"><h2>Your reading</h2>
    <div class="sg-status ${st || "unread"}">${ic(st === "reading" ? "bookmark" : st === "read" ? "check" : "book")}${STATUS_WORDS[st] || "Not read"}</div>
  </div>`;
}

const MON = MONTHS.map(m => m.slice(0, 3));
function dateRange([a, b]){   // ['2024-01-02', '2024-01-20'] -> '2 Jan – 20 Jan 2024'; partial dates too ('2024', '2024-09')
  const p = d => (/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/.exec(d || "") || []).slice(1).map(x => +x || 0);
  const [y1, m1, d1] = p(a), [y2, m2, d2] = p(b);
  const when = (y, m, d, withYear = true) => [d || "", m ? MON[m - 1] : "", withYear ? y : ""].filter(Boolean).join(" ");
  if (!y2) return y1 ? `Started ${when(y1, m1, d1)}` : "";
  if (!y1 || a === b) return when(y2, m2, d2);
  return `${when(y1, m1, d1, y1 !== y2 || !m1)} – ${when(y2, m2, d2)}`;
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
  </div>`;
}
const reviews = r => r.reviews && r.reviews.length ? sectionHead("Your <em>review</em>") + r.reviews.map(t => `<div class="review">${reviewHtml(t)}</div>`).join("") : "";

function pageSgBook(e){   // a book from StoryGraph that isn't on her shelves
  const r = reading(e), fmt = FORMATS[e.format] || "";
  const known = e.authors.map(a => authorIndex[slug(a.name)]).filter(Boolean);
  const more = known.length ? known[0].books.map(x => x.book).slice(0, 12) : [];
  const fact = (k, v) => v ? `<dt>${k}</dt><dd>${v}</dd>` : "";
  return `<header class="hero book-hero"><div class="book-top">${cover(e, "", true)}<div>
      <div class="kicker"><i></i>${e.shelf ? `<a class="label" href="#shelf-${e.shelf}">${esc(shelfIndex[e.shelf].name)}</a><span class="label"> · Not owned</span>` : `<span class="label">Not owned</span>`}${fmt ? `<span class="label"> · ${fmt}</span>` : ""}</div>
      <h1>${esc(e.t)}</h1>${e.sub ? `<div class="sub">${esc(e.sub)}</div>` : ""}
      <div class="authors">${e.authors.map(a => authorIndex[slug(a.name)] ? `<span><a href="#a-${slug(a.name)}">${esc(a.name)}</a></span>` : `<span>${esc(a.name)}</span>`).join("")}</div>
    </div></div></header>
    <div class="book-body"><div>
      ${reviews(r) || `<p class="desc none">A book you’ve read or mean to read that isn’t on your shelves.</p>`}
      ${more.length ? sectionHead(`On your shelves by <em>${esc(known[0].name)}</em>`) + grid(more) : ""}
    </div><aside style="display:grid;gap:18px">
      ${sgPanel(r)}
      <div class="panel"><h2>Details</h2><dl class="facts">
        ${fact("Format", fmt)}${fact("ISBN-13", e.isbn13 || "")}${fact("On your list since", niceDate(e.added))}
      </dl></div></aside></div>`;
}

function pageBook(b){
  const s = shelfIndex[b.shelf], others = (editions[norm(b.title) + "|" + norm(b.surname || "")] || []).filter(x => x !== b);
  const lead = (b.authors || []).find(a => !a.role), au = lead && authorIndex[slug(lead.name)];
  const more = au ? au.books.map(x => x.book).filter(x => x !== b && !others.includes(x)).slice(0, 12) : [];
  const fact = (k, v) => v ? `<dt>${k}</dt><dd>${v}</dd>` : "", sub = "edition" in b ? b.edition : b.sub;
  return `<header class="hero book-hero" style="--c:${s.color}"><div class="book-top">${cover(b, "", true)}<div>
      <div class="kicker"><i></i><a class="label" href="#shelf-${s.id}">${esc(s.name)}</a></div>
      <h1>${esc(b.t)}</h1>${sub ? `<div class="sub">${esc(sub)}</div>` : ""}
      <div class="authors">${(b.authors || []).map(a => `<span><a href="#a-${slug(a.name)}">${esc(a.name)}</a>${a.role ? ` <small>${esc(a.role)}</small>` : ""}</span>`).join("") || "<span>Unknown author</span>"}</div>
      ${seriesLine(b)}
      ${b.signed ? `<div class="signed-line">${sealMark(b.signed)}${SIGN_WORDS[b.signed]}</div>` : ""}
    </div></div></header>
    <div class="book-body"><div>
      ${b.description ? `<p class="desc">${esc(b.description)}</p>` : ""}
      ${sgFor[b.id] ? reviews(reading(b)) : ""}
      ${others.length ? sectionHead(`Other copies <em>you own</em>`) + grid(others) : ""}
      ${more.length ? sectionHead(`More by <em>${esc(au.name)}</em>`, au.books.length > more.length + 1 ? `<a class="more" href="#a-${au.id}">All ${au.books.length}</a>` : "") + grid(more) : ""}
    </div><aside style="display:grid;gap:18px">
      ${sgFor[b.id] ? sgPanel(reading(b)) : readingPanel(b)}
      <div class="panel"><h2>Details</h2><dl class="facts">
        ${fact("Shelf", `<a href="#shelf-${s.id}">${esc(s.name)}</a>`)}${fact("Publisher", esc(b.publisher || ""))}
        ${fact("Published", niceDate(b.published) || year(b.published))}${fact("Pages", b.pages ? num(b.pages) : "")}
        ${fact("ISBN-13", b.isbn13 || "")}${fact("ISBN-10", b.isbn10 || "")}${fact("Copies", b.copies > 1 ? b.copies : "")}
        ${fact("Added", niceDate(b.added))}${fact("Full title", b.t !== b.title ? esc(b.title) : "")}
        ${location.protocol.startsWith("http") ? fact("Signed", `<select class="sign-pick" data-sign-id="${b.id}">${[["", "Not signed"], ["signed", "Signed"], ["to-you", "Signed to you"]].map(([v, t]) => `<option value="${v}"${(b.signed || "") === v ? " selected" : ""}>${t}</option>`).join("")}</select>`) : ""}
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
      figures: [[num(list.length), list.length === 1 ? "book" : "books"], [num(booksRead(list)), "read"], [num(new Set(list.map(b => b.shelf)).size), "shelves"]]})
    + sectionHead("Their <em>books</em>", `<span class="more">Oldest first</span>`)
    + `<div class="books">${a.books.slice().sort((x, y) => (x.book.published || "9999").localeCompare(y.book.published || "9999")).map(x => card(x.book, x.role ? x.role : year(x.book.published) || x.book.by)).join("")}</div>`;
}

function pageReading(){
  const log = readingLog(), byFinish = (a, b) => (reading(b).finished || "").localeCompare(reading(a).finished || "");
  const now = log.filter(isReading), done = log.filter(isRead).sort(byFinish), next = BOOKS.filter(b => !isRead(b) && !isReading(b));
  const later = log.filter(b => ["paused", "stopped"].includes(reading(b).status));
  const thisYear = String(new Date().getFullYear()), years = {};
  done.forEach(b => { const ys = [...new Set(finishes(b).map(year).filter(Boolean))]; (ys.length ? ys : ["undated"]).forEach(y => (years[y] ||= []).push(b)); });
  const order = Object.keys(years).filter(y => y !== "undated").sort().reverse().concat(years.undated ? ["undated"] : []);
  const away = done.filter(isElsewhere).length;
  return hero({kicker: "Your reading", title: "Reading <em>log</em>", covers: now.concat(done),
      text: `Everything you’ve read and are reading. Books you’ve read but don’t own (library books, ebooks, audiobooks) sit on the shelves too, marked Not owned.`,
      figures: [[num(now.length), "reading now"], [num(done.length), "read"], [num(finishedIn(thisYear).length), `finished in ${thisYear}`], [num(next.length), "not read yet on your shelves"]]})
    + sectionHead("Reading <em>now</em>") + (now.length ? grid(now) : `<p class="empty">Nothing on the go.</p>`)
    + order.map(y => sectionHead(y === "undated" ? "Read, <em>date not recorded</em>" : `${y} <em>· ${plural(years[y].length, "book")}</em>`) + grid(years[y])).join("")
    + (later.length ? sectionHead("Paused or <em>didn’t finish</em>") + grid(later) : "")
    + `<div class="note">${ic("info")}<div><b>${num(done.length - away)} of the books you’ve read are on your shelves; ${num(away)} aren’t.</b></div></div>`;
}

// ---------- series, in place on the shelves (her choice, 18 Oct: no page of their own) ----------
const seriesLine = b => (seriesOf[b.id] || []).map(h => `<span class="in-series">${ic("layers")}${h.series.unnumbered ? "Part of" : `Book ${h.entry.n} of`} ${esc(h.series.name)}</span>`).join("");

// ---------- to read ----------
let pickShelf = "", picked = null;   // picks from anything unread on her shelves (her to-read list is for borrowing, 1 Nov)
function pickPool(){
  const log = readingLog(), unread = b => !isRead(b) && !isReading(b);
  let pool = BOOKS.filter(unread);
  if (pickShelf) pool = pool.filter(b => b.shelf === pickShelf);
  const seen = new Set();   // one copy of each book
  return pool.filter(b => { const k = norm(b.t) + "|" + (b.surname || ""); if (seen.has(k)) return false; seen.add(k); return true; });
}
function picker(){
  const pool = pickPool(), b = picked && pool.includes(picked) ? picked : null;
  return `<div class="picker" id="picker"><div class="picker-head"><h2>What should I <em>read next?</em></h2>
      <div class="picker-opts"><select id="pickShelf" aria-label="Shelf"><option value="">Any shelf</option>${SHELVES.filter(s => s.books.length).map(s => `<option value="${s.id}"${pickShelf === s.id ? " selected" : ""}>${esc(s.name)}</option>`).join("")}</select>
      <button class="btn pick" type="button" id="pickOne">${ic("sparkle")}${b ? "Pick another" : "Pick one"}</button></div></div>
    ${b ? `<a class="picked" href="${href(b)}">${cover(b)}<div><span class="label">How about…</span><h3>${esc(b.t)}</h3><div class="by">${esc(b.by)} · ${esc(shelfIndex[b.shelf].name)}</div>${b.description ? `<p>${esc(b.description.slice(0, 260))}${b.description.length > 260 ? "…" : ""}</p>` : ""}</div></a>`
      : `<p class="empty">${pool.length ? `${plural(pool.length, "book")} to choose from.` : "Nothing to pick from there."}</p>`}</div>`;
}

function pageToBuy(){
  // found one? "Got it" adds it to a shelf, and it comes off this list by itself (her ask, 18 Oct)
  const list = [...WISH].sort((a, b) => a.sortAuthor.localeCompare(b.sortAuthor) || a.sortTitle.localeCompare(b.sortTitle));
  return hero({kicker: "On the lookout", title: "To <em>buy</em>", text: "Books to look out for. When you find one, press Got it to put it on a shelf; it comes off this list.",
      figures: [[num(WISH.length), "still to find"]]})
    + `<div class="wish">${list.map(w => `<div class="wish-item">${cover(w)}<div><h3${w.t.length > 40 ? ' class="long"' : ""}>${esc(w.t)}</h3>${w.sub ? `<div class="by">${esc(w.sub)}</div>` : ""}<div class="by">${esc(w.by)}</div>
        ${w.maybeOwned ? `<a class="flag" href="#b-${w.maybeOwned[0]}">${ic("info")}Already on a shelf?</a>` : ""}</div>
        <a class="btn got-it" href="#add" data-add-from="${w.id}">${ic("check")}Got it</a></div>`).join("")}</div>`;
}

// ---------- add a book ----------
// Typed or scanned ISBN -> details from Open Library (through the little server, tools/serve.py) -> a shelf -> saved in
// data/added.json and the site rebuilt. Only works in her app window (served from the server), not from the folder.
let addFromWish = false;   // the Add page opened from "Got it" keeps its to-buy book; opened any other way it starts empty
let addForm = {isbn: "", title: "", authors: "", publisher: "", published: "", pages: "", cover: "", shelf: "", note: "", busy: false};
const api = (path, opts = {}) => fetch(path, {...opts, headers: {"X-Library": "1", "Content-Type": "application/json", ...(opts.headers || {})}}).then(r => r.json());
function pageAdd(){
  const f = addForm, served = location.protocol.startsWith("http");
  const field = (k, label, extra = "") => `<label><span>${label}</span><input id="add-${k}" value="${esc(f[k] || "").replace(/’/g, "'")}" ${extra}></label>`;
  return hero({kicker: "Your shelves", title: "Add a <em>book</em>", text: "Type or scan its ISBN (the barcode number, usually on the back), check the details, pick a shelf."})
    + (!served ? `<div class="note">${ic("info")}<div><b>Open the library from its desktop shortcut to add books.</b> Opened straight from the folder, it can’t save anything.</div></div>` : "")
    + `<div id="scannedBox">${scannedBox()}</div>`
    + `<div class="add-form" id="addForm">
        <div class="isbn-row">${field("isbn", "ISBN", 'inputmode="numeric" autocomplete="off" placeholder="9780000000000"')}
          <button class="btn pick" type="button" id="addLookup"${served ? "" : " disabled"}>${ic("search")}Look it up</button>
          <button class="btn" type="button" id="camOpen"${served ? "" : " disabled"}>${ic("scan-barcode")}Scan with camera</button></div>
        ${f.note ? `<p class="add-note">${esc(f.note)}</p>` : ""}
        <div class="add-main">${f.cover ? `<div class="cover"><img src="${esc(f.cover)}" alt=""></div>` : `<div class="cover gap"></div>`}
          <div class="add-fields">${field("title", "Title")}${field("authors", "Author(s), with commas between")}
            <div class="two">${field("publisher", "Publisher")}${field("published", "Published")}</div>
            <div class="two">${field("pages", "Pages", 'inputmode="numeric"')}
              <label><span>Shelf</span><select id="add-shelf"><option value="">Choose a shelf…</option>${SHELVES.filter(s => s.libib).map(s => `<option value="${s.id}"${f.shelf === s.id ? " selected" : ""}>${esc(s.name)}</option>`).join("")}</select></label></div>
            <label><span>Signed</span><select id="add-signed">${[["", "Not signed"], ["signed", "Signed"], ["to-you", "Signed to you"]].map(([v, t]) => `<option value="${v}"${(f.signed || "") === v ? " selected" : ""}>${t}</option>`).join("")}</select></label>
            <button class="btn pick" type="button" id="addSave"${served && !f.busy ? "" : " disabled"}>${ic("plus")}${f.busy ? "Adding…" : "Add to the shelf"}</button>
          </div></div></div>`
    + (served ? `<details class="scan-setup" id="scanSetup"><summary>Set up phone scanning</summary><ol>
        <li>Install <b>Binary Eye</b> on your phone (Google Play).</li>
        <li>In Binary Eye: Settings → Forwarding → turn on <b>Forward scans</b>.</li>
        <li><b>URL to forward to</b>: type <code id="scanUrl">…</code></li>
        <li><b>Request type</b>: “GET and simply add content”. Then tap <b>Test URL</b>.</li>
        <li>Scan a book: it shows up at the top of this page.</li></ol>
        <p>The phone and this laptop need to be on the home Wi-Fi.</p></details>` : "");
}
// scanned on her phone (Binary Eye -> the server's scanned list, 30 Oct): shown above the form while the page is open,
// checked every few seconds; a new scan fills the form and is looked up by itself if the form is empty
let scanList = [], scanSeen = null;
function scannedBox(){
  if (!scanList.length) return "";
  return `<div class="scanned"><div class="label">${ic("download")}From your phone</div>${scanList.slice().reverse().map(s => {
    const owned = s.owned || (BOOKS.find(b => b.isbn13 === s.isbn) || {}).title;
    return `<div class="scan-row"><div><b>${esc(s.title || "Unknown title")}</b><span>${esc(s.isbn)}${owned ? " · you already have a copy" : ""}</span></div>
      <button class="btn" type="button" data-scan-use="${esc(s.isbn)}">Use this</button><button class="btn quiet" type="button" data-scan-remove="${esc(s.isbn)}" title="Take it off this list">${ic("x")}</button></div>`;
  }).join("")}</div>`;
}
async function pollScanned(){
  if (location.hash !== "#add" || !location.protocol.startsWith("http")) { scanSeen = null; return; }
  try { scanList = await api("api/scanned"); } catch { return; }
  const box = document.getElementById("scannedBox"); if (box) box.innerHTML = scannedBox();
  const fresh = scanSeen ? scanList.filter(s => !scanSeen.has(s.isbn)) : [];
  scanSeen = new Set(scanList.map(s => s.isbn));
  readAdd();
  if (fresh.length && !addForm.title && !addForm.busy) useScan(fresh[fresh.length - 1].isbn);
}
function useScan(isbn){ const el = document.getElementById("add-isbn"); if (!el) return; el.value = isbn; document.getElementById("addLookup")?.click(); }

// scanning with the laptop's own camera (her ask, 1 Nov: no app on her phone). The barcode reader (ZXing, MIT licence,
// js/zxing.min.js) is loaded the first time. The camera panel sits outside #view, so redrawing the form doesn't stop it.
// Only a real book number is taken (978/979, 13 digits, right check digit); the rest of a barcode's noise is ignored.
let camReader = null;
const isBookNumber = s => /^97[89]\d{10}$/.test(s) && [...s].reduce((t, d, i) => t + d * (i % 2 ? 3 : 1), 0) % 10 === 0;
// a Waterstones price sticker (13 digits starting 2, her yes 1 Nov): the server finds that exact edition on their site
const isShopCode = s => /^2\d{12}$/.test(s) && [...s].reduce((t, d, i) => t + d * (i % 2 ? 3 : 1), 0) % 10 === 0;
const loadZxing = () => window.ZXing ? Promise.resolve() : new Promise((ok, fail) => {
  const s = document.createElement("script"); s.src = "js/zxing.min.js"; s.onload = ok; s.onerror = fail; document.head.appendChild(s); });
function camClose(){
  if (camReader) { camReader.reset(); camReader = null; }
  document.getElementById("camPanel")?.remove();
}
async function camOpen(){
  camClose();
  const panel = document.createElement("div"); panel.id = "camPanel"; panel.className = "cam-panel";
  panel.innerHTML = `<div class="cam-box"><div class="cam-view"><video id="camVideo" muted playsinline></video><div class="cam-aim"></div></div>
    <div class="cam-zoom"><canvas id="camZoom" width="640" height="200"></canvas><span>What the reader sees in the box, close up</span></div>
    <p id="camMsg">Starting the camera…</p>
    <div class="cam-buttons"><button class="btn" type="button" id="camShot">${ic("download")}Save a test picture</button>
    <button class="btn" type="button" id="camStop">${ic("x")}Stop</button></div></div>`;
  document.body.appendChild(panel);
  const msg = t => { const m = document.getElementById("camMsg"); if (m) m.textContent = t; };
  try { await loadZxing(); }
  catch { return msg("The barcode reader didn’t load. Type the ISBN instead."); }
  const hints = new Map([[ZXing.DecodeHintType.POSSIBLE_FORMATS, [ZXing.BarcodeFormat.EAN_13]], [ZXing.DecodeHintType.TRY_HARDER, true]]);
  camReader = new ZXing.BrowserMultiFormatReader(hints, 250);
  // the camera is asked for here, not by the reader, so each step can say what's happening (a black box on 1 Nov said nothing)
  msg("Asking for the camera… If a box asks to use it, press Allow (in the app window it’s at the top left).");
  let stream;   // asked for the sharpest picture the camera has
  try { stream = await navigator.mediaDevices.getUserMedia({video: {width: {ideal: 4096}, height: {ideal: 2160}}}); }
  catch (e) {
    return msg({NotAllowedError: "The camera isn’t allowed for the library. Click the camera sign at the top left of the window, choose Allow, then press Scan with camera again.",
      NotReadableError: "The camera is busy: another app may be using it. Close that app, then try again.",
      NotFoundError: "No camera found. Type the ISBN instead."}[e && e.name] || `The camera didn’t start (${e && e.name}). Type the ISBN instead.`);
  }
  if (!camReader) { stream.getTracks().forEach(t => t.stop()); return; }   // closed while the box was asking
  const video = document.getElementById("camVideo");
  video.srcObject = stream; video.play().catch(() => {});
  msg("Hold the back of the book so the barcode sits inside the gold box. Then move it slowly nearer or further until the numbers in the close-up look sharp, and hold still. Good light helps.");
  setTimeout(() => { if (camReader && !video.videoWidth) msg("The camera is on but sending no picture. Close any other app using it and try again."); }, 5000);
  // a laptop webcam gives soft pictures close up, so each frame is read three ways: the middle strip (where the gold line is)
  // and the whole picture with the method made for blurry one-line barcodes, then the middle strip the usual way
  const reader = new ZXing.MultiFormatReader(); reader.setHints(hints);
  const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d", {willReadFrequently: true});
  const tries = [[ZXing.GlobalHistogramBinarizer, .3], [ZXing.GlobalHistogramBinarizer, 0], [ZXing.HybridBinarizer, .3]];
  let n = 0;
  const look = () => {
    if (!camReader) { stream.getTracks().forEach(t => t.stop()); return; }
    const w = video.videoWidth, h = video.videoHeight;
    if (w) {
      const [Bin, edge] = tries[n++ % tries.length], y = Math.round(h * edge), sh = h - 2 * y;
      canvas.width = w; canvas.height = sh; ctx.drawImage(video, 0, y, w, sh, 0, 0, w, sh);
      try {
        const text = reader.decodeWithState(new ZXing.BinaryBitmap(new Bin(new ZXing.HTMLCanvasElementLuminanceSource(canvas)))).getText();
        if (isBookNumber(text) || isShopCode(text)) { stream.getTracks().forEach(t => t.stop()); camClose(); return useScan(text); }
        msg(`That barcode (${text}) isn’t a book’s. Look for the one whose number starts 978, or a Waterstones price sticker.`);
      } catch {}   // nothing readable in this frame
    }
    setTimeout(look, 80);
  };
  // the close-up: the middle of the picture (inside the gold box), the right way round, so she can see when it's sharp
  const zoom = document.getElementById("camZoom"), zctx = zoom.getContext("2d");
  const showZoom = () => { if (!camReader) return; const w = video.videoWidth, h = video.videoHeight;
    if (w) zctx.drawImage(video, w * .2, h * .3, w * .6, h * .4, 0, 0, zoom.width, zoom.height);
    requestAnimationFrame(showZoom); };
  showZoom();
  let ocr = null;
  camReader.reset = () => { stream.getTracks().forEach(t => t.stop()); ocr?.then(w => w.terminate()).catch(() => {}); };
  look();
  readPrinted(video, () => camReader, w => ocr = w);
}

// her webcam blurs barcode bars but the printed "ISBN 978-…" above them stays nearly readable (1 Nov), so the picture is
// also read as text (Tesseract, Apache licence, js/ocr/, loaded the first time). A number is only taken when its check digit
// is right and the same number has been read twice in a row, so a misread digit can't fill in the wrong book.
function readPrinted(video, open, keep){
  const base = new URL("js/ocr/", location.href).href;
  const load = window.Tesseract ? Promise.resolve() : new Promise((ok, fail) => {
    const s = document.createElement("script"); s.src = base + "tesseract.min.js"; s.onload = ok; s.onerror = fail; document.head.appendChild(s); });
  const worker = load.then(async () => {
    const w = await Tesseract.createWorker("eng", 1, {workerPath: base + "worker.min.js", corePath: base, langPath: base, workerBlobURL: false});
    await w.setParameters({tessedit_char_whitelist: "ISBN0123456789- ", tessedit_pageseg_mode: "11"});
    return w;
  });
  keep(worker);
  const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d");
  let last = "";
  const round = async w => {
    if (!open()) return;
    if (video.videoWidth) {
      const sc = Math.min(1, 1280 / video.videoWidth);
      canvas.width = video.videoWidth * sc; canvas.height = video.videoHeight * sc;
      ctx.filter = "grayscale(1) contrast(160%)"; ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      try {
        const text = (await w.recognize(canvas)).data.text;
        const found = (text.match(/97[89][\d\s-]{10,20}/g) || []).map(t => t.replace(/\D/g, "").slice(0, 13)).find(isBookNumber) || "";
        if (found && found === last && open()) { camClose(); return useScan(found); }
        last = found;
      } catch {}
    }
    setTimeout(() => round(w), 300);
  };
  worker.then(round).catch(() => {});   // if the text reader can't load, the barcode reader carries on alone
}
document.addEventListener("click", e => {
  if (e.target.closest("#camOpen")) camOpen();
  if (e.target.closest("#camStop") || e.target.id === "camPanel") camClose();
  if (e.target.closest("#camShot")) {   // one frame, as the camera gives it, to Downloads (1 Nov: to see why her webcam doesn't read)
    const v = document.getElementById("camVideo"); if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas"); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext("2d").drawImage(v, 0, 0);
    const a = document.createElement("a"); a.download = `library-camera-test-${c.width}x${c.height}.png`; a.href = c.toDataURL("image/png"); a.click();
    const m = document.getElementById("camMsg"); if (m) m.textContent = "Saved to your Downloads.";
  }
});
document.addEventListener("keydown", e => { if (e.key === "Escape") camClose(); });
addEventListener("hashchange", camClose);
setInterval(pollScanned, 4000);
document.addEventListener("toggle", async e => { if (e.target.id !== "scanSetup" || !e.target.open) return;   // the address and key, fetched only when opened
  try { document.getElementById("scanUrl").textContent = (await api("api/scan-setup")).url; } catch { document.getElementById("scanUrl").textContent = "(the library server isn’t answering)"; } }, true);
addEventListener("hashchange", pollScanned);
document.addEventListener("click", async e => {
  const use = e.target.closest("[data-scan-use]"), drop = e.target.closest("[data-scan-remove]");
  if (use) useScan(use.dataset.scanUse);
  if (drop) { try { scanList = (await api("api/scanned/remove", {method: "POST", body: JSON.stringify({isbn: drop.dataset.scanRemove})})).left; } catch {}
    document.getElementById("scannedBox").innerHTML = scannedBox(); }
});
const readAdd = () => ["isbn", "title", "authors", "publisher", "published", "pages"].forEach(k => { const el = document.getElementById("add-" + k); if (el) addForm[k] = el.value.trim(); });
const redrawAdd = () => { const y = scrollY; document.getElementById("view").innerHTML = pageAdd(); scrollTo(0, y); };
document.addEventListener("click", async e => {
  const from = e.target.closest("[data-add-from]");
  if (from) { const w = WISH.find(x => x.id === from.dataset.addFrom); addFromWish = true; addForm = {isbn: w.isbn13 || "", title: w.title, authors: w.by === "Unknown author" ? "" : w.by.replace(/ & /g, ", "), publisher: "", published: "", pages: "", cover: "", shelf: "", busy: false, fromWish: w.id,
    note: "From your to-buy list: type the ISBN of the copy you got and look it up, or just pick a shelf. It comes off the list when you add it."}; return; }
  if (e.target.closest("#addLookup")) {
    readAdd(); if (!addForm.isbn) { addForm.note = "Type the ISBN first."; return redrawAdd(); }
    addForm.note = "Looking it up…"; redrawAdd();
    try { const d = await api("api/lookup?isbn=" + encodeURIComponent(addForm.isbn));
      if (d.found) Object.assign(addForm, {title: d.title, authors: d.authors.join(", "), publisher: d.publisher, published: d.published, pages: d.pages || "", cover: d.cover, note: "Found it. Check the details and pick a shelf."});
      else addForm.note = "Neither Open Library nor Waterstones knows that number yet (new or special editions can take a while). Try the Waterstones price sticker if it has one, or fill in the details yourself."; }
    catch { addForm.note = "Couldn’t reach Open Library. Fill in the details yourself."; }
    const have = BOOKS.find(b => b.isbn13 === addForm.isbn);
    if (have) addForm.note = `You already have this one: ${have.t}. Add it again only if it’s a second copy.`;
    return redrawAdd();
  }
  if (e.target.closest("#addSave")) {
    readAdd(); addForm.shelf = document.getElementById("add-shelf").value; addForm.signed = document.getElementById("add-signed").value;
    if (!addForm.title || !addForm.shelf) { addForm.note = !addForm.title ? "It needs a title." : "Pick a shelf for it."; return redrawAdd(); }
    addForm.busy = true; addForm.note = ""; redrawAdd();
    try { const r = await api("api/books", {method: "POST", body: JSON.stringify({...addForm, authors: addForm.authors.split(",")})});
      if (r.ok) { addForm = {isbn: "", title: "", authors: "", publisher: "", published: "", pages: "", cover: "", shelf: "", note: "", busy: false}; location.href = location.pathname + "?v=" + Date.now() + "#b-" + r.id; return; }
      addForm.note = r.error || "That didn’t save."; }
    catch { addForm.note = "That didn’t save: is the library open from its shortcut?"; }
    addForm.busy = false; redrawAdd();
  }
});
document.addEventListener("change", async e => {   // signed or not, from a book's page: saved by the server, then the page reloads
  const pick = e.target.closest("[data-sign-id]"); if (!pick) return;
  pick.disabled = true;
  try { const r = await api("api/signed", {method: "POST", body: JSON.stringify({id: pick.dataset.signId, signed: pick.value})});
    if (r.ok) return location.reload(); } catch {}
  pick.disabled = false; alert("That didn’t save: is the library open from its shortcut?");
});
document.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.id === "add-isbn") document.getElementById("addLookup")?.click(); });

// her reading in numbers, from StoryGraph (her ask, 18 Oct): every book she has read, on the shelves or not
function readingStats(bars, readYears){
  const done = readingLog().filter(isRead), rated = done.filter(b => reading(b).rating);
  const avg = rated.length ? rated.reduce((n, b) => n + reading(b).rating, 0) / rated.length : 0;
  const thisYear = String(new Date().getFullYear()), yearEnds = finishedIn(thisYear), inYear = yearEnds;
  const pagesRead = done.reduce((n, b) => n + (b.pages || 0), 0);
  const months = MON.map((m, i) => ({label: m, n: yearEnds.filter(d => +d.slice(5, 7) === i + 1).length}));
  const mmax = Math.max(1, ...months.map(m => m.n));
  const byAuthor = {};
  rated.forEach(b => { const a = (b.authors || []).find(x => !x.role) || (b.authors || [])[0]; if (!a) return; (byAuthor[a.name] ||= []).push(reading(b).rating); });
  const bestAuthors = Object.entries(byAuthor).filter(([, rs]) => rs.length >= 2)
    .map(([name, rs]) => ({label: name, n: rs.reduce((x, y) => x + y, 0) / rs.length, href: authorIndex[slug(name)] ? "#a-" + slug(name) : "", count: rs.length}))
    .sort((a, b) => b.n - a.n || b.count - a.count).slice(0, 10).map(r => ({...r, text: `${starsText(Math.round(r.n * 100) / 100)} ★ · ${r.count} books`}));
  const moods = {}, paces = {};
  done.forEach(b => { const r = reading(b); (r.moods || "").split(/,\s*/).filter(Boolean).forEach(m => moods[m] = (moods[m] || 0) + 1); if (r.pace) paces[r.pace] = (paces[r.pace] || 0) + 1; });
  const moodRows = Object.entries(moods).map(([label, n]) => ({label: label[0].toUpperCase() + label.slice(1), n})).sort((a, b) => b.n - a.n).slice(0, 10);
  const starRows = [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5].map(s => ({label: "★".repeat(Math.floor(s)) + (s % 1 ? "½" : ""), n: rated.filter(b => Math.round(reading(b).rating * 2) / 2 === s).length})).filter(r => r.n);
  return sectionHead("Your <em>reading</em>", `<span class="more">Shelves or not</span>`)
    + `<div class="ledger"><div class="ledger-grid">
        <div class="meter"><b>${num(done.length)}</b><span>books read</span></div>
        <div class="meter"><b>${num(inYear.length)}</b><span>finished in ${thisYear}</span></div>
        <div class="meter"><b>${avg ? starsText(Math.round(avg * 100) / 100) : "–"}</b><span>stars on average (${plural(rated.length, "book")} rated)</span></div>
        <div class="meter"><b>${num(pagesRead)}</b><span>pages read (books on the shelves)</span></div>
      </div></div>`
    + sectionHead(`${thisYear}, <em>month by month</em>`) + `<div class="decades">${months.map(m => `<div><b>${m.n || ""}</b><i style="height:${(m.n / mmax * 100).toFixed(1)}%"></i><span>${m.label}</span></div>`).join("")}</div>`
    + (readYears.length ? sectionHead("Books read <em>each year</em>") + bars(readYears, Math.max(...readYears.map(r => r.n))) : "")
    + (bestAuthors.length ? sectionHead("Your highest-rated <em>authors</em>", `<span class="more">Two or more books rated</span>`) + bars(bestAuthors, 5) : "")
    + (starRows.length ? sectionHead("How you <em>rate</em>") + bars(starRows, Math.max(...starRows.map(r => r.n))) : "")
    + (moodRows.length ? sectionHead("Moods you read <em>most</em>") + bars(moodRows, moodRows[0].n) : "")
    + (Object.keys(paces).length ? sectionHead("Pace") + bars(Object.entries(paces).map(([label, n]) => ({label: label[0].toUpperCase() + label.slice(1), n})).sort((a, b) => b.n - a.n), Math.max(...Object.values(paces))) : "");
}
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
  const readN = booksRead(BOOKS), titles = new Set(BOOKS.map(bookKey)).size, perYear = {};
  readingLog().filter(isRead).flatMap(finishes).forEach(d => { const y = year(d); if (y) perYear[y] = (perYear[y] || 0) + 1; });
  const readYears = Object.keys(perYear).sort().reverse().map(y => ({label: y, n: perYear[y], href: "#reading"}));
  return hero({kicker: "The numbers", title: "<em>Stats</em>", text: "How the library adds up.", covers: mixed([...BOOKS].reverse())})
    + `<div class="ledger"><div class="ledger-grid">
        <div class="meter"><b>${num(BOOKS.length)}</b><span>books on the shelves</span></div>
        <div class="meter"><b>${num(pages)}</b><span>pages (${num(withPages.length)} books with a page count)</span></div>
        <div class="meter"><b>${num(Math.round(pages / (withPages.length || 1)))}</b><span>pages in an average book</span></div>
        <div class="meter"><b>${Math.round(readN / titles * 100)}%</b><span>read (${plural(readN, "book")})</span></div>
      </div></div>`
    + sectionHead("By <em>shelf</em>") + bars(shelves, shelves[0].n)
    + readingStats(bars, readYears)
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
    + (wish.length ? sectionHead("On the <em>to-buy list</em>") + `<div class="books">${wish.map(w => `<a class="bk" href="#to-buy"><div class="slot">${cover(w)}</div><h3>${esc(w.t)}</h3><div class="by">${esc(w.by)}</div></a>`).join("")}</div>` : "");
}
q.addEventListener("input", () => { const v = q.value.trim(); if (v.length >= 2) { document.getElementById("view").innerHTML = pageSearch(v); scrollTo(0, 0); } else if (!v) route(); });
q.addEventListener("keydown", e => { if (e.key === "Escape") { q.value = ""; route(); } });
document.getElementById("nav").addEventListener("click", () => { if (q.value) q.value = ""; });

// ---------- trial covers: every proposed cover next to the one shown now ----------
function pageTrialCovers(){
  const pic = (src, b) => `<div class="cover${src ? "" : " blank"}">${src ? `<img src="${esc(src)}" alt="" loading="lazy">` : ""}<span class="t">${esc(b.t)}</span><span class="a">${esc(b.by)}</span></div>`;
  return `<div class="section-head" style="margin-top:56px"><h2>New <em>covers</em></h2><span class="more">${plural(TRIALS.length, "book")}</span></div>
    <div class="trial-list">${TRIALS.map(b => `<a class="trial-row" href="${WISH.includes(b) ? "#to-buy" : href(b)}">
      ${pic(b.coverWas, b)}<span class="arrow">${ic("arrow-right")}</span>${pic(b.coverTrial, b)}
      <div><h3>${esc(b.t)}</h3><div class="by">${esc(b.by)}${WISH.includes(b) ? " · to buy" : ""}</div><p>${esc(b.coverTrialWhy || "")}</p></div></a>`).join("")}</div>`;
}
const trialSwitch = document.createElement("div");
trialSwitch.className = "trial-switch";
trialSwitch.innerHTML = `<button type="button" aria-pressed="${TRIAL}">${ic("image")}New covers: <b>${TRIAL ? "on" : "off"}</b></button>${TRIAL ? `<a href="#trial-covers">See all ${TRIALS.length}</a>` : ""}`;
trialSwitch.querySelector("button").addEventListener("click", () => { store.set(TRIAL_KEY, !TRIAL); location.reload(); });
document.body.append(trialSwitch);

// ---------- routing ----------
function route(){
  const key = location.hash.slice(1) || "home", view = document.getElementById("view");
  let html, active = "#" + key, title = "Jemma’s Library";
  if (key === "add" && !addFromWish && addForm.fromWish) addForm = {isbn: "", title: "", authors: "", publisher: "", published: "", pages: "", cover: "", shelf: "", note: "", busy: false};
  addFromWish = false;
  if (key.startsWith("shelf-") && shelfIndex[key.slice(6)]) { shelfView = {...SHELF_VIEW}; const s = shelfIndex[key.slice(6)]; html = pageShelf(s); title = s.name; }
  else if (key === "shelves") { shelfView = {...SHELF_VIEW}; html = pageAllShelves(); title = "All shelves"; }
  else if (key.startsWith("b-") && bookIndex[key.slice(2)]) { const b = bookIndex[key.slice(2)]; html = pageBook(b); active = "#shelf-" + b.shelf; title = b.t; }
  else if (key.startsWith("r-") && SG.books[+key.slice(2)] && !SG.books[+key.slice(2)].books) { const e = SG.books[+key.slice(2)]; html = pageSgBook(e); active = e.shelf ? "#shelf-" + e.shelf : "#reading"; title = e.t; }
  else if (key.startsWith("a-") && authorIndex[key.slice(2)]) { const a = authorIndex[key.slice(2)]; html = pageAuthor(a); active = "#authors"; title = a.name; }
  else html = {authors: pageAuthors, reading: pageReading, add: pageAdd, "to-buy": pageToBuy, stats: pageStats, "trial-covers": pageTrialCovers}[key]?.() || (active = "#home", pageHome());
  view.innerHTML = html; renderNav(active);
  document.title = title === "Jemma’s Library" ? title : `${curly(title)} · Jemma’s Library`;
  scrollTo(0, 0);
}
addEventListener("hashchange", () => { q.value = ""; route(); });

// ---------- interactions ----------
document.addEventListener("click", e => {
  const t = e.target.closest("button, a[data-jump]"); if (!t) return;
  if (t.dataset.filter || t.dataset.view) {
    if (t.dataset.filter) shelfView.filter = t.dataset.filter; else store.set(VIEW_KEY, t.dataset.view);
    document.getElementById("shelfBooks").innerHTML = shelfBooks(currentList);
  } else if (t.dataset.jump) { e.preventDefault(); document.getElementById(t.dataset.jump).scrollIntoView({behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"}); }
});
document.addEventListener("click", e => { const s = e.target.closest(".spoiler"); if (s) s.classList.toggle("shown"); });
document.addEventListener("click", e => { if (!e.target.closest("#pickOne")) return;
  const pool = pickPool().filter(b => b !== picked); picked = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  document.getElementById("picker").outerHTML = picker(); });
document.addEventListener("change", e => {
  const t = e.target;
  if (t.id === "sort") { shelfView.sort = t.value; document.getElementById("shelfBooks").innerHTML = shelfBooks(currentList); }
  else if (t.id === "pickShelf") { pickShelf = t.value; picked = null; document.getElementById("picker").outerHTML = picker(); }
});

// installed as a Chrome app from the local server (sharp taskbar icon); opened straight from the folder it's an ordinary page
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});
// no "Install as app" offer: her shortcut window already has its own sharp taskbar icon (18 Oct)
addEventListener("beforeinstallprompt", e => e.preventDefault());

route();

// ---------- capitals on each word in headings, the menu and buttons (her ask, 1 Nov) ----------
// "New on the Shelves": small words stay lower case unless first or last. Book titles (h3, a book page's h1) are left as published.
const SMALL_WORDS = new Set(["a", "an", "and", "as", "at", "but", "by", "for", "from", "in", "into", "nor", "of", "on", "or", "per", "the", "to", "via", "with"]);
function capitalise(root){
  const nodes = [];
  root.querySelectorAll("#view h2, #view .hero:not(.book-hero) h1, #nav a, #view .btn, #view .section-head .more, #camPanel .btn").forEach(el => {
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) if (!walk.currentNode.parentElement.closest(".n, svg, h3")) nodes.push(walk.currentNode);
  });
  // number the words across each element, so "first" and "last" mean the heading's own, not each text piece's
  const groups = new Map();
  nodes.forEach(n => { const el = n.parentElement.closest("h1, h2, a, .btn, .more"); (groups.get(el) || groups.set(el, []).get(el)).push(n); });
  groups.forEach(list => {
    const total = list.reduce((t, n) => t + (n.textContent.match(/[A-Za-z’'-]+/g) || []).length, 0);
    let i = 0;
    list.forEach(n => {
      const text = n.textContent.replace(/[A-Za-z][A-Za-z’'-]*/g, w => {
        const k = i++, low = w.toLowerCase();
        if (k > 0 && k < total - 1 && SMALL_WORDS.has(low)) return low;
        return w.split("-").map(p => p ? p[0].toUpperCase() + p.slice(1) : p).join("-");
      });
      if (text !== n.textContent) n.textContent = text;
    });
  });
}
new MutationObserver(() => capitalise(document)).observe(document.body, {childList: true, subtree: true});
capitalise(document);
