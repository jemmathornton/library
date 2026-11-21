// Jemma's Library: the page code. Everything is drawn from DATA (js/data.js, built by tools/build.py from data/).
// Reading comes from StoryGraph (data/storygraph.json); the site shows it and never sets it (her choice, 18 Oct: no buttons).
const ic = n => ICONS[n].replace("<svg ", '<svg class="i" aria-hidden="true" ');
// shown text uses curly apostrophes and quotes; ids and links are untouched
const curly = s => String(s ?? "").replace(/'(?=\d0s\b)/g, "’").replace(/(^|[\s(\[“"—-])'/g, "$1‘").replace(/'/g, "’")
  .replace(/(^|[\s(\[—-])"/g, "$1“").replace(/"/g, "”");   // double quotes too (review, 15 Nov)
const esc = s => curly(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
// for form boxes and their choices: escaped but not curled, so what she typed is saved as she typed it (review, 9 Nov)
const escRaw = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
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
  let t = raw.trim().replace(/\s{2,}/g, " ").replace(/\s+(\.{3}\s*)?by\s+[^()]*\(\s*Author\s*\).*$/i, "").replace(/^The(?=[A-Z])/, "The "), bits = [], brackets = [], m, colon = null;   // Amazon's "... by X ( Author ) ON date"
  while ((m = /\s*\(([^()]*)\)/.exec(t))) { if (m[1].trim()) brackets.push({x: m[1].trim(), at: m.index}); t = (t.slice(0, m.index) + t.slice(m.index + m[0].length)).trim(); }
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
  if (c > 0 && !/\d$/.test(t.slice(0, c)) && t.slice(0, c).split(/\s+/).length >= 2) { colon = {x: t.slice(c + 2), at: c}; t = t.slice(0, c); }
  // in the order the title has them (19 Nov: "We Are Legion (We Are Bob): Volume 1 (Bobiverse)" came out backwards)
  bits = bits.concat(brackets.filter(b => !colon || b.at <= colon.at).map(b => b.x), colon ? [colon.x] : [], brackets.filter(b => colon && b.at > colon.at).map(b => b.x));
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
  if (!shelfIndex[b.shelf]) b.shelf = "unsorted";   // placeholder
  shelfIndex[b.shelf].books.push(b);
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
const finishedIn = y => readingLog().flatMap(finishes).filter(d => year(d) === y);   // a re-read under way keeps its earlier finish (19 Nov)
// how many books are read, each book once however many copies (three Philosopher's Stones are one book)
const booksRead = list => new Set(list.filter(isRead).map(bookKey)).size;
// not read yet: not started at all (a book she didn't finish or is taking a break from isn't waiting to be read)
const isUnread = b => { const st = reading(b).status; return !st || st === "to-read"; };
const booksUnread = list => new Set(list.filter(isUnread).map(bookKey)).size;
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
    // a set tied to one edition (her Illumicrate Klunes, 1 Nov) takes only that edition, and those copies leave the
    // author's ordinary series, so her paperbacks and her Illumicrate copies each sit in their own row
    const inSet = SERIES.some(s => s.edition && s.edition === b.special && s.surnames.some(n => who.includes(n)));
    SERIES.forEach(s => { if (!s.surnames.some(n => who.includes(n))) return;
      if (s.edition ? s.edition !== b.special : inSet) return;
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
  b.t = entry.title; b.sub = `${series.name}${series.unnumbered ? "" : ", book " + entry.n}${edition && !series.edition ? " · " + edition : ""}`;
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
  const strip = r ? `<span class="rated" title="${starsText(r)} stars" role="img" aria-label="${starsText(r)} stars"><span class="sg-stars" style="--r:${(r / 5 * 100).toFixed(1)}%" aria-hidden="true"><span>★★★★★</span><span>★★★★★</span></span></span>` : "";
  // not owned: the cover faded, with a walnut "Not owned" band across it (her choice, 18 Oct; not on a book's own page)
  const tag = (b.notOwned && !big ? `<span class="not-owned">Not owned</span>` : "")
    // a special edition (Illumicrate and the like, data/editions.json): a brass sash across the other top corner (her ask, 18 Oct)
    + (b.special && !big ? `<span class="special" title="${esc(b.special)}">Special</span>` : "")
    + (b.signed ? sealMark(b.signed) : "");
  // the whole cover at its own shape, never trimmed to a frame (her ask, 30 Oct); a picture with no known shape keeps the frame
  const ratio = b.cover && b.coverRatio;
  return `<div class="cover${b.cover ? "" : " blank"}${ratio ? " fit" : ""}${b.notOwned && !big ? " unowned" : ""}${TRIAL && b.coverTrial ? " trial" : ""} ${extra}" style="--c:${s ? s.color : "#5E3D22"}${ratio ? ";--r:" + ratio : ""}">${badge}${tag}${strip}${b.cover ? `<img src="${escRaw(coverSrc(b, big))}" alt="" loading="lazy">` : ""}<span class="t">${esc(b.t)}</span><span class="a">${esc(b.by)}</span></div>`;
}
// a cover that won't load becomes a title card
document.addEventListener("error", e => { const img = e.target; if (img.tagName === "IMG" && img.parentNode.classList.contains("cover")) { img.parentNode.classList.add("blank"); img.remove(); } }, true);

const href = b => isElsewhere(b) ? "#" + b.id : "#b-" + b.id;
// each card as wide as its cover at the shelf height, so every cover is the same height and none overlap (her ask, 1 Nov)
const cardShape = b => `style="--br:${(b.cover && b.coverRatio) || 1.5}"`;
const card = (b, note) => `<a class="bk" ${cardShape(b)} href="${href(b)}"><div class="slot">${cover(b)}</div><h3>${esc(b.t)}</h3><div class="by">${esc(note || b.by)}</div></a>`;
const grid = (list, cls = "") => list.length ? `<div class="books ${cls}">${list.map(b => card(b)).join("")}</div>` : "";
// an old-books page (her choice, 6 Nov): each series as a shelf of spines in reading order, the spine in the book's cloth
// colour with its title up it, a book she has no old copy of as a dashed gap in its place (by the series' original
// author only); then a shelf of the books in no series. A spine opens its book.
function oldShelves(list){
  const inList = new Set(list), placed = new Set(), shelves = [];
  // each spine: the title in gilt, its number in the series at the foot, a gold star at the head for a first edition
  // (her yes, 6 Nov); pointing at one shows a card with the cover and its details
  const firstEd = b => /first edition/i.test(b.description || "") && !/reprint|\?/i.test(b.description || "");
  const pale = c => { const m = /^#(..)(..)(..)$/.exec(c || ""); return m && (.299 * parseInt(m[1], 16) + .587 * parseInt(m[2], 16) + .114 * parseInt(m[3], 16)) > 165; };   // dark lettering on a pale spine
  const spine = (b, n) => `<a class="spine${pale(b.cloth) ? " pale" : ""}" href="${href(b)}" data-spine="${b.id}" style="background:${b.cloth || "#7A6650"}"><span>${esc(b.t)}</span>${firstEd(b) ? `<i class="ed" aria-label="First edition">★</i>` : ""}${n ? `<i class="no">${n}</i>` : ""}</a>`;
  const gap = (e, n) => `<span class="spine gap" title="${esc(e.title)}${e.wish.some(w => w.old) ? " · on your list to find" : ""}"><span>${esc(e.title)}</span><i class="no">${n}</i></span>`;
  SERIES.forEach(s => {
    const here = s.entries.map(e => e.owned.filter(b => inList.has(b) && !placed.has(b)));
    if (!here.some(h => h.length)) return;
    const authors = new Set(here.flat().map(b => b.by)), byOf = e => (e.owned[0] || e.wish[0] || {}).by;
    const sur = (here.flat()[0] || {}).sortAuthor || s.author || "", by = (here.flat()[0] || {}).by;
    shelves.push([s.name + (by ? " – " + by : ""), s.entries.map((e, i) => here[i].length ? here[i].map(b => (placed.add(b), spine(b, i + 1))).join("") : !byOf(e) || authors.has(byOf(e)) ? gap(e, i + 1) : "").join(""), sur]);
  });
  // by author surname, then series name (her ask, 6 Nov)
  shelves.sort((a, b) => a[2].localeCompare(b[2]) || a[0].replace(/^The /, "").localeCompare(b[0].replace(/^The /, "")));
  const rest = list.filter(b => !placed.has(b)).sort(SORTS.author[1]);
  if (rest.length) shelves.push([shelves.length ? "Not in a series" : "", rest.map(b => spine(b)).join("")]);
  return shelves.map(([name, html]) => `<div class="shelf-name">${esc(name) || "&nbsp;"}</div><div class="bookshelf">${html}</div>`).join("");
}
function pageOldKind([k, name, color]){
  const list = oldBooks(k), firsts = list.filter(b => /first edition/i.test(b.description || "") && !/reprint|\?/i.test(b.description || "")).length;
  const dated = list.map(b => +year(b.published)).filter(Boolean), mine = SERIES.filter(s => s.entries.some(e => e.owned.some(b => list.includes(b)))), nSeries = mine.length;
  const toFind = mine.reduce((n, s) => n + s.entries.filter(e => !e.owned.some(b => list.includes(b)) && e.wish.some(w => w.old)).length, 0);
  return hero({kicker: "Old books", title: name, figures: [[num(list.length), "books"], ...(nSeries ? [[num(nSeries), "series"]] : []), ...(dated.length ? [[Math.min(...dated), "oldest dated"]] : []),
      ...(firsts ? [[num(firsts), "first editions"]] : []), ...(toFind ? [[num(toFind), "on your list to find"]] : [])]})
    + (list.length ? oldShelves(list) : `<p class="empty">Nothing here yet.</p>`);
}
// the card for a spine pointed at
document.addEventListener("mouseover", e => {
  const a = e.target.closest && e.target.closest("[data-spine]"), old = document.getElementById("spineCard");
  if (!a) { old?.remove(); return; }
  const b = bookIndex[a.dataset.spine]; if (!b || (old && old.dataset.id === b.id)) return;
  const c = old || document.body.appendChild(Object.assign(document.createElement("div"), {id: "spineCard", className: "spine-card"}));
  const note = (b.description || "").length < 90 ? b.description || "" : "", r = a.getBoundingClientRect();
  c.dataset.id = b.id;
  c.innerHTML = `${b.cover ? `<img src="${escRaw(b.cover)}" alt="">` : "<div></div>"}<div><b>${esc(b.t)}</b><div class="by">${esc(b.by)}</div>
    <dl><dt>Year</dt><dd>${year(b.published) || "Undated"}</dd><dt>Edition</dt><dd>${esc(note) || "—"}</dd><dt>Condition</dt><dd>${esc(b.condition || "") || "—"}</dd>${b.inscription ? `<dt>Inscribed</dt><dd>${esc(b.inscription.length > 70 ? b.inscription.slice(0, 68) + "…" : b.inscription)}</dd>` : ""}</dl></div>`;
  c.style.left = Math.min(innerWidth - 310, r.right + 10) + "px"; c.style.top = Math.max(10, Math.min(innerHeight - 170, r.top)) + "px";
});
addEventListener("hashchange", () => document.getElementById("spineCard")?.remove());
addEventListener("scroll", () => document.getElementById("spineCard")?.remove(), {passive: true});
document.documentElement.addEventListener("mouseleave", () => document.getElementById("spineCard")?.remove());
// the old books to find: the same list as on To Buy (her choice, 5 Nov: in both places)
function pageOldToFind(){
  const list = WISH.filter(w => w.old).sort((a, b) => a.sortAuthor.localeCompare(b.sortAuthor) || a.sortTitle.localeCompare(b.sortTitle));
  return hero({kicker: "Old books", title: "To <em>find</em>", text: "Old printings to look out for. When you find one, press Got it to put it on a shelf; it comes off this list.", figures: [[num(list.length), "to find"]]})
    + wishItems(list);
}
// the old books' ledger: a line each, cloth colour, title, author, year, her edition notes, condition. In author order
// it's grouped by series in reading order, the books of a series she has no old copy of in their places, greyed (and
// marked when they're on her old-books-to-find list); the books in no series follow together, by author
const CONDITIONS = ["Fine", "Very good", "Good", "Fair", "Poor"];
function ledgerView(list){
  const yr = b => year(b.published) || "—", note = b => (b.description || "").length < 90 ? b.description || "" : "";
  const row = b => `<tr><td>${b.cloth ? `<span class="chip" style="background:${b.cloth}"></span>` : `<span class="chip none"></span>`}</td>
      <td class="t"><a href="${href(b)}">${esc(b.t)}</a></td><td class="m">${esc(b.by)}</td><td>${yr(b)}</td><td class="m">${esc(note(b)) || "—"}</td><td class="m">${esc(b.condition || "") || "—"}</td></tr>`;
  const missing = (e, s) => `<tr class="gone"><td><span class="chip none"></span></td><td class="t">${esc(e.title)}</td><td class="m">${esc((e.owned[0] || e.wish[0] || {}).by || "")}</td>
      <td></td><td class="m">${e.wish.some(w => w.old) ? "On your list to find" : ""}</td><td></td></tr>`;
  const head = t => `<tr class="group"><td colspan="6">${esc(t)}</td></tr>`;
  let body;
  if (shelfView.sort !== "author") body = list.map(row).join("");
  else {
    const inList = new Set(list), placed = new Set(), parts = [];
    SERIES.forEach(s => {
      const here = s.entries.map(e => e.owned.filter(b => inList.has(b) && !placed.has(b)));
      if (!here.some(h => h.length)) return;
      // a gap is only shown when it's by the same author as her old copies (not, say, Pamela Cox's modern Malory Towers)
      const authors = new Set(here.flat().map(b => b.by)), byOf = e => (e.owned[0] || e.wish[0] || {}).by;
      parts.push([s.name, head(s.name) + s.entries.map((e, i) => here[i].length ? here[i].map(b => (placed.add(b), row(b))).join("")
        : !byOf(e) || authors.has(byOf(e)) ? missing(e, s) : "").join(""), (here.flat()[0] || {}).sortAuthor || ""]);
    });
    parts.sort((a, b) => a[2].localeCompare(b[2]) || a[0].replace(/^The /, "").localeCompare(b[0].replace(/^The /, "")));   // by author surname (6 Nov)
    const rest = list.filter(b => !placed.has(b));   // the rest together, in author order (her ask, 5 Nov)
    body = parts.map(p => p[1]).join("") + (rest.length ? head("Not in a series") + rest.map(row).join("") : "");
  }
  return `<table class="oldbooks"><tr><th></th><th>Title</th><th>Author</th><th>Year</th><th>Edition (your notes)</th><th>Condition</th></tr>${body}</table>`;
}
function listView(list){
  return `<div class="blist">${list.map(b => { const st = reading(b).status;
    return `<a href="${href(b)}">${cover(b)}<b>${esc(b.t)}</b><span>${esc(b.by)}</span><span>${esc(b.publisher || "")}</span><span>${year(b.published)}</span>`
      + `<span class="st ${st || ""}">${st === "read" ? "Read" : st === "reading" ? "Reading" : ""}</span></a>`; }).join("")}</div>`;
}
// a banner is made of the page's own book covers, fading into the walnut behind the words (as the Sims site's banners
// are each world's own map); pages with too few covers keep the plain walnut
function shelfBanner(list){
  const pics = (list || []).filter(b => b.cover).slice(0, 32);
  return pics.length >= 8 ? `<div class="hero-shelf" aria-hidden="true">${pics.map(b => `<img src="${escRaw(coverSrc(b))}" alt="">`).join("")}</div>` : "";
}
const hero = (o) => { const bg = shelfBanner(o.covers);
  return `<header class="hero${bg ? " shelved" : ""}">${bg}<div class="kicker">${o.color ? `<span class="dot" style="--c:${o.color}"></span>` : "<i></i>"}<span class="label">${o.kicker}</span></div>
  <h1>${o.title}</h1>${o.text ? `<p>${o.text}</p>` : ""}${o.figures ? `<div class="figures">${o.figures.map(([n, l]) => `<div><b>${n}</b><span>${l}</span></div>`).join("")}</div>` : ""}</header>`; };
// a mix across the whole library: every few books, so all the shelves show
const mixed = list => { const c = list.filter(b => b.cover), step = Math.max(1, Math.floor(c.length / 32)); return c.filter((b, i) => i % step === 0); };
const sectionHead = (title, more) => `<div class="section-head"><h2>${title}</h2>${more || ""}</div>`;

// ---------- sidebar ----------
// her old books are a collection of their own, not a shelf (her choice, 5 Nov): their own place in the menu, and a ledger
// that puts year, edition and condition first and the cover last
const COLLECTION = "old-book-collection";
// her old books by kind (her choice, 6 Nov; data/old-books-kinds.json, Children's unless listed), each a page of shelves
const OLD_KINDS = [["childrens", "Children’s", "#B5482F"], ["fiction", "Fiction", "#4F5D47"], ["non-fiction", "Non-Fiction", "#6A5440"]];
const oldBooks = k => (shelfIndex[COLLECTION] ? shelfIndex[COLLECTION].books : []).filter(b => ((DATA.oldKinds || {})[b.id] || "childrens") === k);
function renderNav(active){
  const nReading = readingLog().filter(isReading).length, left = WISH.length;
  const link = (href, icon, text, n) => `<a href="${href}" class="${active === href ? "on" : ""}">${icon}${text}${n != null ? `<span class="n">${n}</span>` : ""}</a>`;
  // the shelves come first and largest (her choice, 18 Oct); the rest of the library is a quiet list at the foot
  // (the name at the top is the way home)
  document.getElementById("nav").innerHTML = `
    <div class="nav-group shelves-nav"><span class="label">Shelves</span>
      ${link("#shelves", ic("library"), "All shelves", BOOKS.length)}
      ${SHELVES.filter(s => s.books.length && s.id !== COLLECTION).map(s => link("#shelf-" + s.id, `<span class="dot" style="--c:${s.color}"></span>`, esc(s.name), s.books.length)).join("")}
    </div>
    ${shelfIndex[COLLECTION] ? `<div class="nav-group"><span class="label">Old books</span>
      ${OLD_KINDS.map(([k, name, c]) => link("#old-" + k, `<span class="dot" style="--c:${c}"></span>`, name, oldBooks(k).length)).join("")}
      ${link("#old-to-find", ic("search"), "To find", WISH.filter(w => w.old).length)}</div>` : ""}
    <div class="nav-group minor">
      ${link("#reading", ic("bookmark"), "Reading", nReading || null)}
      ${link("#history", ic("clock"), "History")}
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
  const paused = log.filter(b => reading(b).status === "paused");
  const lastFinish = b => finishes(b).sort().pop() || "";
  const done = log.filter(isRead).filter(b => lastFinish(b)).sort((a, b) => lastFinish(b).localeCompare(lastFinish(a))).slice(0, 6);
  const yearReads = finishedIn(thisYear).length;
  const unreadOwned = booksUnread(BOOKS);   // each book once, like "read" (review, 15 Nov)   // her to-read list is for borrowing, not this site (1 Nov)
  const recent = [...BOOKS].sort(SORTS.added[1]).slice(0, 6);
  const fan = s => { const withCover = s.books.filter(b => b.cover), pick = (withCover.length >= 3 ? withCover : s.books).slice(0, 3); return pick.map(b => cover(b)).join(""); };
  const shortDate = d => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ""); return m ? `${+m[3]} ${MON[m[2] - 1]}` : ""; };
  return hero({kicker: "Home library", title: "Jemma’s <em>Library</em>", covers: [...BOOKS].sort(SORTS.added[1]),
      text: "Every book on the shelves at home, and everything you read.",
      figures: [[num(yearReads), `read in ${thisYear}`], [num(BOOKS.length), "books on the shelves"], [num(unreadOwned), "not read yet on your shelves"], [num(AUTHORS.length), "authors"]]})
    + (now.length ? sectionHead("Reading <em>now</em>", `<a class="more" href="#reading">All your reading</a>`)
        + `<div class="now-row">${now.map(b => { const st = reading(b).started; return `<a class="now-card" href="${href(b)}">${cover(b, "", true)}<div><span class="label">Reading now</span><h3>${esc(b.t)}</h3><div class="by">${esc(b.by)}</div>${st ? `<div class="by">Started ${niceDate(st)}</div>` : ""}</div></a>`; }).join("")}</div>` : "")
    + (done.length ? sectionHead("Just <em>finished</em>", pickButton()) + `<div class="books row">${done.map(b => card(b, `Finished ${shortDate(lastFinish(b))}`)).join("")}</div>` : "")
    // newest books, straight under what she's just read (her ask, 1 Nov; it was at the foot of the page)
    + sectionHead("New on the <em>shelves</em>", done.length ? "" : pickButton()) + `<div class="books row">${recent.map(b => card(b, `Added ${shortDate(b.added)}`)).join("")}</div>`
    + sectionHead("The <em>shelves</em>", `<a class="more" href="#shelves">See them all at once</a>`)
    + `<div class="shelves">${SHELVES.filter(s => s.books.length).map(s => `<a class="shelf-card" href="#shelf-${s.id}" style="--c:${s.color}"><div class="fan">${fan(s)}</div>
        <div class="txt"><h3>${esc(s.name)}</h3><span>${plural(s.books.length, "book")}</span></div></a>`).join("")}</div>`
    // books she's taking a break from, out of Reading Now and below the shelves (her ask, 1 Nov)
    + (paused.length ? sectionHead("On a <em>break</em>") + `<div class="books">${paused.map(b => card(b)).join("")}</div>` : "");
}

// shelves are in author surname order, like a real bookcase (her choice, 18 Oct)
const addedNo = b => /^add\d+$/.test(b.id) ? +b.id.slice(3) : 0;
const SHELF_VIEW = {filter: "all", sort: "author"};
let shelfView = {...SHELF_VIEW};
const SORTS = {
  // within an author, a series stays together in reading order, filed where its name falls among the other titles
  author: ["Author surname", (a, b) => a.sortAuthor.localeCompare(b.sortAuthor) || shelfKey(a).localeCompare(shelfKey(b))],
  title: ["Title A–Z", (a, b) => a.sortTitle.localeCompare(b.sortTitle)],
  // books added on the same day: the one added last comes first (1 Nov: books added here carry only the day, so a day's
  // books came out oldest first); books added on the site are numbered in the order she added them
  added: ["Recently added", (a, b) => (b.added || "").localeCompare(a.added || "") || addedNo(b) - addedNo(a)],
  old: ["Oldest first", (a, b) => (a.published || "9999").localeCompare(b.published || "9999")],
  new: ["Newest first", (a, b) => (b.published || "").localeCompare(a.published || "")],
  finished: ["Recently read", (a, b) => (finishes(b).sort().pop() || "").localeCompare(finishes(a).sort().pop() || "") || a.sortTitle.localeCompare(b.sortTitle)],
  stars: ["Your stars", (a, b) => (reading(b).rating || 0) - (reading(a).rating || 0) || a.sortAuthor.localeCompare(b.sortAuthor)],
};
const FILTERS = {all: ["All", () => true], owned: ["Owned", b => !b.notOwned], notowned: ["Not owned", b => !!b.notOwned], special: ["Special editions", b => !!b.special], signed: ["Signed", b => !!b.signed], toyou: ["Signed to you", b => b.signed === "to-you"], unread: ["Not read", isUnread], reading: ["Reading", isReading], read: ["Read", isRead]};

function shelfBooks(list, grouped = currentGrouped){
  const f = FILTERS[shelfView.filter][1], shown = list.filter(f).sort(SORTS[shelfView.sort][1]);
  const ledger = !grouped && currentShelf === COLLECTION;
  const view = store.get(VIEW_KEY, "covers"), books = l => ledger ? ledgerView(l) : view === "list" ? listView(l) : grid(l);
  // all shelves at once: each shelf in turn, in the same order as the sidebar
  const body = !shown.length ? `<p class="empty">Nothing here yet.</p>` : !grouped ? books(shown)
    : SHELVES.map(s => { const l = shown.filter(b => b.shelf === s.id); return l.length ? `<section class="shelf-part">`
        + sectionHead(`<span class="dot big" style="--c:${s.color}"></span>${esc(s.name)}`, `<a class="more" href="#shelf-${s.id}">${plural(l.length, "book")}</a>`) + books(l) + `</section>` : ""; }).join("");
  return `<div class="toolbar" id="toolbar">
      <div class="chips">${Object.entries(FILTERS).map(([k, [l]]) => `<button type="button" data-filter="${k}" class="${shelfView.filter === k ? "on" : ""}">${l}</button>`).join("")}</div>
      <select id="sort" aria-label="Sort by">${Object.entries(SORTS).map(([k, [l]]) => `<option value="${k}"${shelfView.sort === k ? " selected" : ""}>${l}</option>`).join("")}</select>
      <div class="views"${ledger ? " hidden" : ""}><button type="button" data-view="covers" class="${view === "covers" ? "on" : ""}" aria-label="Covers">${ic("grid")}</button><button type="button" data-view="list" class="${view === "list" ? "on" : ""}" aria-label="List">${ic("list")}</button></div>
      ${pickButton(grouped ? "" : currentShelf)}<span class="count">${plural(shown.length, "book")}</span>
    </div>` + body;
}
let currentList = [], currentGrouped = false, currentShelf = "";
function pageAllShelves(){
  currentList = BOOKS.concat(NOT_OWNED); currentGrouped = true;
  const shelves = SHELVES.filter(s => s.books.length && s.libib).length;
  return hero({kicker: `<a href="#home">Every shelf</a>`, title: "All <em>shelves</em>", covers: mixed(BOOKS), text: "The whole bookcase at once, shelf by shelf, each in author surname order.",
      figures: [[num(BOOKS.length), "books"], [num(shelves), "shelves"], [num(AUTHORS.length), "authors"], [num(booksRead(BOOKS)), "read"]]})
    + `<div id="shelfBooks">${shelfBooks(currentList)}</div>`;
}
function pageShelf(s){
  currentList = s.books.concat(s.notOwned || []); currentGrouped = false; currentShelf = s.id;
  const authors = new Set(s.books.map(b => b.by)).size, pages = s.books.reduce((n, b) => n + (b.pages || 0), 0);
  return hero({kicker: `<a href="#home">Shelf</a>`, title: esc(s.name), color: s.color, text: s.note ? esc(s.note) : "", covers: [...s.books].sort(SORTS.author[1]),
      figures: [[num(s.books.length), "books"], [num(authors), "authors"], [num(booksRead(s.books)), "read"], ...((s.notOwned || []).filter(isRead).length ? [[num(s.notOwned.filter(isRead).length), "read but not owned"]] : []), [num(pages), "pages"]]})
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
const starsShown = r => `<span class="sg-stars" style="--r:${(r / 5 * 100).toFixed(1)}%" role="img" aria-label="${r} stars"><span aria-hidden="true">★★★★★</span><span aria-hidden="true">★★★★★</span></span><b class="sg-num">${r}</b>`;
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
      ${more.length ? sectionHead(`On your shelves by <em class="keep">${esc(known[0].name)}</em>`) + grid(more) : ""}
    </div><aside style="display:grid;gap:18px">
      ${sgPanel(r)}
      <div class="panel"><h2>Details</h2><dl class="facts">
        ${fact("Format", fmt)}${fact("ISBN-13", e.isbn13 || "")}${fact("On your list since", niceDate(e.added))}
      </dl></div></aside></div>`;
}

// an old book's description is her own note on the copy ("First edition", "Undated"), shown under Details (review, 15 Nov)
const oldNote = b => b.shelf === COLLECTION && (b.description || "").length < 90;
// a blurb whose paragraphs ran together ("…shooting.Set in…") gets its breaks back; the words are untouched
const blurb = t => esc(t).replace(/([a-z]{2,}[.!?…][”’)]?)(?=[A-Z][a-z])/g, "$1\n\n").split(/\n\s*\n+/).map(p => `<p class="desc">${p.trim()}</p>`).join("");
function pageBook(b){
  const s = shelfIndex[b.shelf] || {id: b.shelf, name: b.shelf, color: "#5E3D22"}, others = BOOKS.filter(x => x !== b && (bookKey(x) === bookKey(b) || (editions[norm(b.title) + "|" + norm(b.surname || "")] || []).includes(x)));
  const lead = (b.authors || []).find(a => !a.role), au = lead && authorIndex[slug(lead.name)];
  const more = au ? au.books.map(x => x.book).filter(x => x !== b && !others.includes(x)).slice(0, 12) : [];
  const fact = (k, v) => v ? `<dt>${k}</dt><dd>${v}</dd>` : "", sub = "edition" in b ? b.edition : b.sub;
  return `<header class="hero book-hero" style="--c:${s.color}"><div class="book-top">${cover(b, "", true)}<div>
      <div class="kicker"><i></i><a class="label" href="#shelf-${s.id}">${esc(s.name)}</a></div>
      <h1>${esc(b.t)}</h1>${sub ? `<div class="sub">${esc(sub)}</div>` : ""}
      <div class="authors">${(b.authors || []).map(a => `<span><a href="#a-${slug(a.name)}">${esc(a.name)}</a>${a.role ? ` <small>${esc(a.role)}</small>` : ""}</span>`).join("") || "<span>Unknown author</span>"}</div>
      ${seriesLine(b)}
      ${b.signed ? `<div class="signed-line">${sealMark(b.signed)}${SIGN_WORDS[b.signed]}</div>` : ""}
      ${b.special && !(sub || "").includes(b.special) ? `<div class="signed-line special-line">${esc(b.special)}</div>` : ""}
    </div></div></header>
    <div class="book-body"><div>
      ${b.description && !oldNote(b) ? blurb(b.description) : ""}
      ${sgFor[b.id] ? reviews(reading(b)) : ""}
      ${others.length ? sectionHead(`Other copies <em>you own</em>`) + grid(others) : ""}
      ${more.length ? sectionHead(`More by <em class="keep">${esc(au.name)}</em>`, au.books.length > more.length + 1 ? `<a class="more" href="#a-${au.id}">All ${au.books.length}</a>` : "") + grid(more) : ""}
    </div><aside style="display:grid;gap:18px">
      ${sgFor[b.id] ? sgPanel(reading(b)) : readingPanel(b)}
      <div class="panel"><h2>Details</h2><dl class="facts">
        ${fact("Shelf", `<a href="#shelf-${s.id}">${esc(s.name)}</a>`)}${fact("Publisher", esc(b.publisher || ""))}
        ${fact("Published", /-01-01/.test(b.published || "") ? year(b.published) : niceDate(b.published) || year(b.published))}${fact("Pages", b.pages ? num(b.pages) : "")}
        ${fact("ISBN-13", b.isbn13 || "")}${fact("ISBN-10", b.isbn10 || "")}${fact("Copies", b.copies > 1 ? b.copies : "")}
        ${fact("Edition", oldNote(b) ? esc(b.description) : "")}${fact("Added", niceDate(b.added))}${fact("Full title", b.t !== b.title ? esc(b.title) : "")}
        ${location.protocol.startsWith("http") && b.shelf === COLLECTION ? fact("Condition", `<select class="cond-pick" data-cond-id="${b.id}" aria-label="Condition"><option value="">Not set</option>${CONDITIONS.map(c => `<option${b.condition === c ? " selected" : ""}>${c}</option>`).join("")}</select>`) : ""}
        ${b.shelf !== COLLECTION ? "" : location.protocol.startsWith("http") ? fact("Inscription", `<textarea class="inscr-pick" data-inscr-id="${b.id}" aria-label="Inscription" rows="${b.inscription ? 3 : 1}" maxlength="1000" placeholder="None">${escRaw(b.inscription || "")}</textarea>`) : fact("Inscription", esc(b.inscription || ""))}
        ${location.protocol.startsWith("http") ? fact("Signed", `<select class="sign-pick" data-sign-id="${b.id}" aria-label="Signed">${[["", "Not signed"], ["signed", "Signed"], ["to-you", "Signed to you"]].map(([v, t]) => `<option value="${v}"${(b.signed || "") === v ? " selected" : ""}>${t}</option>`).join("")}</select>`) : ""}
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
  return hero({kicker: `<a href="#authors">Author</a>`, title: `<span class="keep">${esc(a.name)}</span>`, covers: list, text: roles.length ? `Also credited as ${esc(roles.join(", ").toLowerCase())}.` : "",
      figures: [[num(list.length), list.length === 1 ? "book" : "books"], [num(booksRead(list)), "read"], (n => [num(n), n === 1 ? "shelf" : "shelves"])(new Set(list.map(b => b.shelf)).size)]})
    + sectionHead("Their <em>books</em>", `<span class="more">Oldest first</span>`)
    + `<div class="books">${a.books.slice().sort((x, y) => (x.book.published || "9999").localeCompare(y.book.published || "9999")).map(x => card(x.book, x.role ? x.role : year(x.book.published) || x.book.by)).join("")}</div>`;
}

function pageReading(){
  const log = readingLog(), byFinish = (a, b) => (reading(b).finished || "").localeCompare(reading(a).finished || "");
  const now = log.filter(isReading), done = log.filter(isRead).sort(byFinish), next = {length: booksUnread(BOOKS)};
  // paused and didn't-finish are different things (her word, 1 Nov): a break sits above this year's reading
  const paused = log.filter(b => reading(b).status === "paused");   // didn't-finish books get no row here (her call, 1 Nov)
  const thisYear = String(new Date().getFullYear()), away = done.filter(isElsewhere).length;
  const shortDay = d => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ""); return m ? `${+m[3]} ${MON[m[2] - 1]}` : year(d); };
  return hero({kicker: "Your reading", title: "Reading <em>log</em>", covers: now.concat(done),
      text: `What you’re reading, what you’ve just finished, and what you’re taking a break from. Books you’ve read but don’t own (library books, ebooks, audiobooks) sit on the shelves too, marked Not owned.`,
      figures: [[num(now.length), "reading now"], [num(done.length), "read"], [num(finishedIn(thisYear).length), `finished in ${thisYear}`], [num(next.length), "not read yet on your shelves"]]})
    + (now.length ? sectionHead("Reading <em>now</em>") + grid(now) : "")
    + (done.length ? sectionHead("Recently <em>finished</em>", pickButton()) + `<div class="books row">${done.slice(0, 6).map(b => card(b, finishes(b).length ? `Finished ${shortDay(finishes(b).sort().pop())}` : "")).join("")}</div>` : "")
    + (paused.length ? sectionHead("On a <em>break</em>") + grid(paused) : "")
    + `<div class="note">${ic("info")}<div><b>${num(done.length - away)} of the books you’ve read are on your shelves; ${num(away)} aren’t.</b> <a href="#history">Everything you’ve read, year by year, is in History.</a></div></div>`;
}
// everything she has read, year by year: its own page, apart from what she's reading now (her ask, 1 Nov)
function pageHistory(){
  const log = readingLog(), byFinish = (a, b) => (reading(b).finished || "").localeCompare(reading(a).finished || "");
  const done = log.filter(b => isRead(b) || finishes(b).length).sort(byFinish), thisYear = String(new Date().getFullYear()), years = {};
  done.forEach(b => { const ys = [...new Set(finishes(b).map(year).filter(Boolean))]; (ys.length ? ys : ["undated"]).forEach(y => (years[y] ||= []).push(b)); });
  const order = Object.keys(years).filter(y => y !== "undated").sort().reverse().concat(years.undated ? ["undated"] : []);
  const stopped = log.filter(b => reading(b).status === "stopped");
  const fold = (title, list) => `<details class="year"><summary><h2>${title}</h2><span class="more">${ic("arrow-right")}</span></summary>${grid(list)}</details>`;
  return hero({kicker: "Your reading", title: "Reading <em>history</em>", covers: done,
      text: "Everything you’ve read, year by year.",
      figures: [[num(done.length), "read"], [num(finishedIn(thisYear).length), `finished in ${thisYear}`], [num(order.filter(y => y !== "undated").length), "years"]]})
    // every year folded to one line; click a year to open it (her choice, 1 Nov)
    + `<div class="years">${order.map(y => fold(y === "undated" ? "Read, <em>date not recorded</em>" : `${y} <em>· ${plural(years[y].length, "book")}</em>`, years[y])).join("")}`
    // and, last, the books she stopped (her ask, 1 Nov)
    + (stopped.length ? fold(`Didn’t finish <em>· ${plural(stopped.length, "book")}</em>`, stopped) : "") + `</div>`;
}

// ---------- series, in place on the shelves (her choice, 18 Oct: no page of their own) ----------
const seriesLine = b => (seriesOf[b.id] || []).map(h => `<span class="in-series">${ic("layers")}${h.series.unnumbered ? "Part of" : `Book ${h.entry.n} of`} ${esc(h.series.name)}</span>`).join("");

// ---------- to read ----------
let pickShelf = "", picked = null;   // picks from anything unread on her shelves (her to-read list is for borrowing, 1 Nov)
function pickPool(){
  let pool = BOOKS.filter(isUnread);
  if (pickShelf) pool = pool.filter(b => b.shelf === pickShelf);
  const seen = new Set();   // one copy of each book
  return pool.filter(b => { const k = norm(b.t) + "|" + (b.surname || ""); if (seen.has(k)) return false; seen.add(k); return true; });
}
// "What should I read next?" (her choice, 1 Nov): a button, not a section, beside Just Finished on the home page and the
// Reading page, on All Shelves (any shelf, or pick one) and on each shelf (that shelf); it opens a small pop-up
let pickFixed = false;
const pickButton = shelf => `<button class="btn pick pick-open" type="button" data-pick-shelf="${shelf || ""}">${ic("sparkle")}${shelf ? "Pick a book from this shelf" : "What should I read next?"}</button>`;
function pickPanel(){
  const pool = pickPool(), b = picked && pool.includes(picked) ? picked : null;
  return `<div class="pick-pop" role="dialog" aria-label="What should I read next?">
    ${b ? `<a class="pick-book" href="${href(b)}">${cover(b)}</a>` : ""}
    <div class="pick-body">
      ${b ? `<span class="label">How about…</span><a class="pick-title" href="${href(b)}"><h3>${esc(b.t)}</h3></a>
        <div class="by">${esc(b.by)}${shelfIndex[b.shelf] ? ` · ${esc(shelfIndex[b.shelf].name)}` : ""}</div>
        ${b.description ? `<p>${esc(b.description.slice(0, 220))}${b.description.length > 220 ? "…" : ""}</p>` : ""}`
        : `<p class="empty">${pool.length ? "" : "Nothing unread there."}</p>`}
      <div class="pick-opts">
        ${pickFixed ? "" : `<select id="pickShelf" aria-label="Shelf"><option value="">Any shelf</option>${SHELVES.filter(s => s.books.length).map(s => `<option value="${s.id}"${pickShelf === s.id ? " selected" : ""}>${esc(s.name)}</option>`).join("")}</select>`}
        <button class="btn pick" type="button" id="pickOne">${ic("sparkle")}Pick another</button>
        <button class="btn" type="button" id="pickClose">${ic("x")}Close</button>
      </div>
    </div></div>`;
}
function pickNew(){
  const all = pickPool(), pool = all.filter(b => b !== picked);   // with only one book there, it stays (it showed an empty box)
  picked = pool.length ? pool[Math.floor(Math.random() * pool.length)] : all[0] || null;
}
function pickShow(){
  let box = document.getElementById("pickPanel");
  if (!box) { box = document.createElement("div"); box.id = "pickPanel"; box.className = "pick-panel"; document.body.appendChild(box); }
  box.innerHTML = pickPanel();
  box.querySelectorAll("img").forEach(i => i.loading = "eager");   // shown at once, not when scrolled to
}
const pickHide = () => document.getElementById("pickPanel")?.remove();

const wishItems = l => `<div class="wish">${l.map(w => `<div class="wish-item">${cover(w)}<div><h3${w.t.length > 40 ? ' class="long"' : ""}>${esc(w.t)}</h3>${w.sub && !(w.old && /^old$/i.test(w.sub)) ? `<div class="by">${esc(w.sub)}</div>` : ""}<div class="by">${esc(w.by)}</div>
        ${w.maybeOwned ? `<a class="flag" href="#b-${w.maybeOwned[0]}">${ic("info")}Already on a shelf?</a>` : ""}</div>
        <a class="btn got-it" href="#add" data-add-from="${w.id}">${ic("check")}Got it</a></div>`).join("")}</div>`;
function pageToBuy(){
  // found one? "Got it" adds it to a shelf, and it comes off this list by itself (her ask, 18 Oct); old printings to
  // find second-hand are a list of their own below (her ask, 5 Nov)
  const list = [...WISH].sort((a, b) => a.sortAuthor.localeCompare(b.sortAuthor) || a.sortTitle.localeCompare(b.sortTitle));
  const items = wishItems;
  const now = list.filter(w => !w.old), old = list.filter(w => w.old);
  return hero({kicker: "On the lookout", title: "To <em>buy</em>", text: "Books to look out for. When you find one, press Got it to put it on a shelf; it comes off this list.",
      figures: [[num(now.length), "to buy"], [num(old.length), "old books to find"]]})
    + sectionHead("To <em>buy</em>", `<span class="more">${plural(now.length, "book")}</span>`) + items(now)
    + (old.length ? sectionHead("Old books <em>to find</em>", `<span class="more">${plural(old.length, "book")}</span>`) + items(old) : "");
}

// ---------- add a book ----------
// Typed or scanned ISBN -> details from Open Library (through the little server, tools/serve.py) -> a shelf -> saved in
// data/added.json and the site rebuilt. Only works in her app window (served from the server), not from the folder.
let addFromWish = false;   // the Add page opened from "Got it" keeps its to-buy book; opened any other way it starts empty
let addForm = {isbn: "", title: "", authors: "", publisher: "", published: "", pages: "", cover: "", shelf: "", note: "", busy: false};
const api = (path, opts = {}) => fetch(path, {...opts, headers: {"X-Library": "1", "Content-Type": "application/json", ...(opts.headers || {})}})
  .then(r => r.json().catch(() => { throw new Error(`the library server answered ${r.status}`); }));
function pageAdd(){
  const f = addForm, served = location.protocol.startsWith("http");
  const field = (k, label, extra = "") => `<label><span>${label}</span><input id="add-${k}" value="${escRaw(f[k] || "")}" ${extra}></label>`;
  return hero({kicker: "Your shelves", title: "Add a <em>book</em>", text: "Type or scan its ISBN (the barcode number, usually on the back), check the details, pick a shelf."})
    + (!served ? `<div class="note">${ic("info")}<div><b>Open the library from its desktop shortcut to add books.</b> Opened straight from the folder, it can’t save anything.</div></div>` : "")
    + `<div id="scannedBox">${scannedBox()}</div>`
    + `<div class="add-form" id="addForm">
        <div class="isbn-row">${field("isbn", "ISBN", 'inputmode="numeric" autocomplete="off" placeholder="9780000000000"')}
          <button class="btn pick" type="button" id="addLookup"${served ? "" : " disabled"}>${ic("search")}Look it up</button>
          <button class="btn" type="button" id="camOpen"${served ? "" : " disabled"}>${ic("scan-barcode")}Scan with camera</button></div>
        ${f.note ? `<p class="add-note">${esc(f.note)}</p>` : ""}
        <div class="add-main"><div class="add-cover">${f.cover ? `<div class="cover"><img src="${escRaw(f.cover)}" alt=""></div>` : `<div class="cover gap"></div>`}
          ${f.title ? `<button type="button" class="btn find-cover" id="findCover">${ic("image")}${f.cover ? "Find another cover" : "Find a cover"}</button>` : ""}
          ${f.coverOriginal ? `<div class="trim-row"><button type="button" class="btn find-cover" data-trim="6"${f.straightening ? " disabled" : ""}>Trim less</button><button type="button" class="btn find-cover" data-trim="-6"${f.straightening ? " disabled" : ""}>Trim more</button></div>` : ""}
          ${f.cover && !f.coverWrong ? `<button type="button" class="btn find-cover${f.coverOriginal ? " on" : ""}" id="fixCover"${f.straightening ? " disabled" : ""}>${ic("crop")}${f.straightening ? "Straightening…" : f.coverOriginal ? "Undo straightening" : "Cropped or at an angle"}</button>` : ""}
          ${f.cover && !f.coverWrong ? `<button type="button" class="btn find-cover${f.corners ? " on" : ""}" id="cornersOpen">${ic("grid")}Set the corners</button>` : ""}
          ${f.coverWrong ? `<p class="cover-wrong">${ic("camera")}Marked for a photo of your copy</p>` : ""}</div>
          <div class="add-fields">${field("title", "Title")}${field("authors", "Author(s), with commas between")}
            <div class="two">${field("publisher", "Publisher")}${field("published", "Published")}</div>
            <div class="two">${field("pages", "Pages", 'inputmode="numeric"')}
              <label><span>Shelf${!f.suggest ? "" : f.suggest.shelf !== f.shelf ? ` <button type="button" class="suggest" data-suggest="${f.suggest.shelf}">Suggested: ${esc(shelfIndex[f.suggest.shelf].name)} (${esc(f.suggest.why)}) · Use it</button>`
                : ` <span class="suggest">Suggested: ${esc(shelfIndex[f.suggest.shelf].name)} (${esc(f.suggest.why)}) ✓</span>`}</span><select id="add-shelf"><option value="">Choose a shelf…</option>${SHELVES.filter(s => s.libib).map(s => `<option value="${s.id}"${f.shelf === s.id ? " selected" : ""}>${esc(s.name)}</option>`).join("")}</select></label></div>
            <div class="two"><label><span>Signed</span><select id="add-signed">${[["", "Not signed"], ["signed", "Signed"], ["to-you", "Signed to you"]].map(([v, t]) => `<option value="${v}"${(f.signed || "") === v ? " selected" : ""}>${t}</option>`).join("")}</select></label>
              ${field("special", "Special edition (empty if not)", `list="add-editions" autocomplete="off" placeholder="e.g. Illumicrate Edition"`)}
              <datalist id="add-editions">${SPECIAL_EDITIONS().map(x => `<option value="${escRaw(x)}">`).join("")}</datalist></div>
            <button class="btn pick" type="button" id="addSave"${served && !f.busy ? "" : " disabled"}>${ic("plus")}${f.busy ? "Adding…" : "Add to the shelf"}</button>
          </div></div>${f.coverChoices ? coverPicker(f) : ""}${f.corners ? cornerEditor(f) : ""}</div>`
    + (served ? `<details class="scan-setup" id="scanSetup"><summary>Set up phone scanning</summary><ol>
        <li>Install <b>Binary Eye</b> on your phone (Google Play).</li>
        <li>In Binary Eye: Settings → Forwarding → turn on <b>Forward scans</b>.</li>
        <li><b>URL to forward to</b>: type <code id="scanUrl">…</code></li>
        <li><b>Request type</b>: “GET and simply add content”. Then tap <b>Test URL</b>.</li>
        <li>Scan a book: it shows up at the top of this page.</li></ol>
        <p>The phone and this laptop need to be on the home Wi-Fi.</p></details>` : "");
}
// a suggested shelf for a book just looked up (her ask, 1 Nov): where she already keeps that author, or else from the
// shop's or Goodreads' category; she chooses, it's never set for her
const SHELF_WORDS = [["dystopia", /dystop/], ["science-fiction", /science fiction|sci-?fi|space opera|steampunk|cyberpunk|time travel|robot|alien/],
  ["fantasy", /fantasy|magic|dragon|witch|wizard|fairy|myth/], ["travel", /travel|guide ?book|railway journeys/],
  ["childrens", /picture book|children|juvenile|ages? \d/], ["young-adult", /young adult|teen/],
  ["non-fiction", /biograph|memoir|history|essay|self-help|science(?! fiction)|cookery|popular|true crime|nature|politic/],
  ["adult-fiction", /fiction|novel|romance|crime|thriller|mystery|literary/]];
function suggestShelf(d){
  const mine = {};
  (d.authors || []).forEach(a => (authorIndex[slug(a)] || {books: []}).books.forEach(({book}) => { if (book.shelf && !book.notOwned) mine[book.shelf] = (mine[book.shelf] || 0) + 1; }));
  const top = Object.entries(mine).sort((a, b) => b[1] - a[1])[0];
  if (top && shelfIndex[top[0]]) return {shelf: top[0], why: "where your other books by them are"};
  // the shelf most of its categories point to (one stray category doesn't win); a tie goes to the first in SHELF_WORDS,
  // and Adult Fiction ("fiction") only when nothing else fits
  const cats = (d.categories || []).map(c => c.toLowerCase());
  const votes = SHELF_WORDS.map(([id, re], i) => ({id, re, i, n: cats.filter(c => re.test(c)).length})).filter(v => v.n && shelfIndex[v.id]);
  const hit = votes.filter(v => v.id !== "adult-fiction").sort((a, b) => b.n - a.n || a.i - b.i)[0] || votes[0];
  const cat = hit && (d.categories || []).find(c => hit.re.test(c.toLowerCase()));
  return hit ? {shelf: hit.id, why: !cat || cat.toLowerCase() === shelfIndex[hit.id].name.toLowerCase() ? "its category" : cat} : null;
}
document.addEventListener("click", e => {
  const s = e.target.closest("[data-suggest]"); if (!s) return;
  e.preventDefault(); readAdd(); addForm.shelf = s.dataset.suggest; redrawAdd();
});

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
  if (fresh.length && !addForm.title && !addForm.busy && !addForm.looking) useScan(fresh[fresh.length - 1].isbn);
}
// any way of typing an ISBN (hyphens, spaces, the old 10-figure kind) as its 13 figures, or ""
const isbn13Of = s => { s = String(s || "").replace(/[^0-9Xx]/g, "").toUpperCase();
  if (/^\d{13}$/.test(s)) return s;
  if (!/^\d{9}[\dX]$/.test(s)) return "";
  const core = "978" + s.slice(0, 9); return core + (10 - [...core].reduce((t, d, i) => t + (i % 2 ? 3 : 1) * +d, 0) % 10) % 10; };
function useScan(isbn){ const el = document.getElementById("add-isbn"); if (!el) return; el.value = isbn; document.getElementById("addLookup")?.click(); }

// scanning with the laptop's own camera (her ask, 1 Nov: no app on her phone). The barcode reader (ZXing, MIT licence,
// js/zxing.min.js) is loaded the first time. The camera panel sits outside #view, so redrawing the form doesn't stop it.
// Only a real book number is taken (978/979, 13 digits, right check digit); the rest of a barcode's noise is ignored.
let camReader = null, camStillFor = null, camChecked = false;
const isBookNumber = s => /^97[89]\d{10}$/.test(s) && [...s].reduce((t, d, i) => t + d * (i % 2 ? 3 : 1), 0) % 10 === 0;
// a Waterstones price sticker (13 digits starting 2, her yes 1 Nov): the server finds that exact edition on their site
const isShopCode = s => /^2\d{12}$/.test(s) && [...s].reduce((t, d, i) => t + d * (i % 2 ? 3 : 1), 0) % 10 === 0;
const loadZxing = () => window.ZXing ? Promise.resolve() : new Promise((ok, fail) => {
  const s = document.createElement("script"); s.src = "js/zxing.min.js"; s.onload = ok; s.onerror = fail; document.head.appendChild(s); });
function camClose(){
  if (camReader) { camReader.reset(); camReader = null; }
  camStillFor = null;
  document.getElementById("camPanel")?.remove();
}
async function camOpen(){
  camClose();
  const me = {reset(){}}, mine = () => camReader === me;   // this opening's own (review, 2 Nov: old loops ran on into a new one)
  camReader = me;
  const panel = document.createElement("div"); panel.id = "camPanel"; panel.className = "cam-panel";
  panel.innerHTML = `<div class="cam-box"><div class="cam-view"><video id="camVideo" muted playsinline></video><div class="cam-aim"></div></div>
    <div class="cam-zoom"><canvas id="camZoom" width="640" height="200"></canvas><span>What the reader sees in the box, close up</span></div>
    <p id="camMsg">Starting the camera…</p>
    <div class="cam-buttons"><button class="btn pick" type="button" id="camStill">${ic("scan-barcode")}Take a picture in 3…</button>
    <button class="btn" type="button" id="camStop">${ic("x")}Stop</button></div></div>`;
  document.body.appendChild(panel);
  const msg = t => { const m = document.getElementById("camMsg"); if (m) m.textContent = t; };
  try { await loadZxing(); }
  catch { return mine() && msg("The barcode reader didn’t load. Type the ISBN instead."); }
  if (!mine()) return;   // closed while the reader was loading
  const hints = new Map([[ZXing.DecodeHintType.POSSIBLE_FORMATS, [ZXing.BarcodeFormat.EAN_13]], [ZXing.DecodeHintType.TRY_HARDER, true]]);
  // the camera is asked for here, not by the reader, so each step can say what's happening (a black box on 1 Nov said nothing)
  msg("Asking for the camera… If a box asks to use it, press Allow (in the app window it’s at the top left).");
  let stream;   // asked for the sharpest picture the camera has
  try { stream = await navigator.mediaDevices.getUserMedia({video: {width: {ideal: 1920}, height: {ideal: 1080}}}); }
  catch (e) {
    return msg({NotAllowedError: "The camera isn’t allowed for the library. Click the camera sign at the top left of the window, choose Allow, then press Scan with camera again.",
      NotReadableError: "The camera is busy: another app may be using it. Close that app, then try again.",
      NotFoundError: "No camera found. Type the ISBN instead."}[e && e.name] || `The camera didn’t start (${e && e.name}). Type the ISBN instead.`);
  }
  if (!mine()) { stream.getTracks().forEach(t => t.stop()); return; }   // closed while the box was asking
  const video = document.getElementById("camVideo");
  video.srcObject = stream; video.play().catch(() => {});
  msg("Hold the back of the book so the barcode sits inside the gold box. Then move it slowly nearer or further until the numbers in the close-up look sharp, and hold still. Good light helps.");
  setTimeout(() => { if (mine() && !video.videoWidth) msg("The camera is on but sending no picture. Close any other app using it and try again."); }, 5000);
  // a laptop webcam gives soft pictures close up, so each frame is read three ways: the middle strip (where the gold line is)
  // and the whole picture with the method made for blurry one-line barcodes, then the middle strip the usual way
  const reader = new ZXing.MultiFormatReader(); reader.setHints(hints);
  const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d", {willReadFrequently: true});
  const tries = [[ZXing.GlobalHistogramBinarizer, .3], [ZXing.GlobalHistogramBinarizer, 0], [ZXing.HybridBinarizer, .3]];
  let n = 0;
  const look = () => {
    if (!mine()) { stream.getTracks().forEach(t => t.stop()); return; }
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
  const showZoom = () => { if (!mine()) return; const w = video.videoWidth, h = video.videoHeight;
    if (w) zctx.drawImage(video, w * .2, h * .3, w * .6, h * .4, 0, 0, zoom.width, zoom.height);
    requestAnimationFrame(showZoom); };
  showZoom();
  let ocr = null;
  me.reset = () => { stream.getTracks().forEach(t => t.stop()); ocr?.then(w => w.terminate()).catch(() => {}); };
  look();
  readPrinted(video, () => mine() && me, w => ocr = w);
  camStillFor = () => stillRead(video, () => mine() && me, ocr, msg);
}

// deblurring (Richardson-Lucy, Gaussian focus blur), for a webcam that is a little out of focus at book distance
// (1 Nov: on her own test picture the number was unreadable as taken and read correctly, twice, after this)
function deblur(src, [sx, sy, sw, sh], sigma, rounds = 20){
  const sc = Math.min(1, 900 / sw), w = Math.round(sw * sc), h = Math.round(sh * sc), c = document.createElement("canvas"); c.width = w; c.height = h;
  sigma *= sc;   // at most 900 wide: the same sharpening, a fraction of the work (review, 15 Nov: seconds of frozen page)
  const g = c.getContext("2d", {willReadFrequently: true}); g.drawImage(src, sx, sy, sw, sh, 0, 0, w, h);
  const px = g.getImageData(0, 0, w, h), n = w * h, img = new Float32Array(n);
  for (let i = 0; i < n; i++) img[i] = (px.data[i * 4] * .3 + px.data[i * 4 + 1] * .59 + px.data[i * 4 + 2] * .11) / 255 + 1e-3;
  const r = Math.ceil(sigma * 3), k = []; let ks = 0;
  for (let i = -r; i <= r; i++) { const v = Math.exp(-i * i / (2 * sigma * sigma)); k.push(v); ks += v; }
  for (let i = 0; i < k.length; i++) k[i] /= ks;
  const tmp = new Float32Array(n);
  const blur = (a, out) => {   // separable: rows, then columns, edges held
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let t = 0; for (let j = -r; j <= r; j++) t += a[y * w + Math.min(w - 1, Math.max(0, x + j))] * k[j + r]; tmp[y * w + x] = t; }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let t = 0; for (let j = -r; j <= r; j++) t += tmp[Math.min(h - 1, Math.max(0, y + j)) * w + x] * k[j + r]; out[y * w + x] = t; }
  };
  let est = new Float32Array(n).fill(img.reduce((a, b) => a + b, 0) / n);
  const conv = new Float32Array(n), rel = new Float32Array(n);
  for (let it = 0; it < rounds; it++) {
    blur(est, conv);
    for (let i = 0; i < n; i++) rel[i] = img[i] / Math.max(conv[i], 1e-6);
    blur(rel, conv);
    for (let i = 0; i < n; i++) est[i] *= conv[i];
  }
  const sample = Array.from({length: 4000}, () => est[Math.floor(Math.random() * n)]).sort((a, b) => a - b);
  const lo = sample[40], hi = sample[3960] || 1;
  for (let i = 0; i < n; i++) { const v = Math.max(0, Math.min(255, (est[i] - lo) / (hi - lo + 1e-6) * 255)); px.data[i * 4] = px.data[i * 4 + 1] = px.data[i * 4 + 2] = v; px.data[i * 4 + 3] = 255; }
  g.putImageData(px, 0, 0);
  return c;
}
// where the barcode is: the patch with the most side-to-side stripes; the area returned takes in the digits under it and
// the lone 9 to its left (1 Nov: read tightly like this her number came out right; the whole box drowned it in cover text)
function findBarcode(src){
  const W = src.width, H = src.height, sw = 240, sh = Math.round(H * sw / W), c = document.createElement("canvas"); c.width = sw; c.height = sh;
  const g = c.getContext("2d", {willReadFrequently: true}); g.drawImage(src, 0, 0, sw, sh);
  const d = g.getImageData(0, 0, sw, sh).data, lum = i => d[i * 4] * .3 + d[i * 4 + 1] * .59 + d[i * 4 + 2] * .11;
  const e = new Float32Array(sw * sh);
  for (let y = 1; y < sh - 1; y++) for (let x = 1; x < sw - 1; x++) {
    const i = y * sw + x, gx = Math.abs(lum(i + 1) - lum(i - 1)), gy = Math.abs(lum(i + sw) - lum(i - sw));
    e[i] = Math.max(0, gx - gy);   // stripes standing up: strong left-right change, little up-down change
  }
  const R = 6, s2 = new Float32Array(sw * sh); let best = 0, bx = 0, by = 0;
  for (let y = R; y < sh - R; y++) for (let x = R; x < sw - R; x++) {
    let t = 0; for (let j = -R; j <= R; j++) for (let k = -R; k <= R; k += 2) t += e[(y + j) * sw + x + k];
    s2[y * sw + x] = t; if (t > best) { best = t; bx = x; by = y; }
  }
  if (!best) return null;
  let x0 = bx, x1 = bx, y0 = by, y1 = by; const th = best * .35;
  while (x0 > R && s2[by * sw + x0 - 1] > th) x0--; while (x1 < sw - R - 1 && s2[by * sw + x1 + 1] > th) x1++;
  while (y0 > R && s2[(y0 - 1) * sw + bx] > th) y0--; while (y1 < sh - R - 1 && s2[(y1 + 1) * sw + bx] > th) y1++;
  // the white label the barcode is printed on: grow the box while the row or column beside it is still mostly light
  const light = (x, y) => lum(y * sw + x) > 150;
  const share = (xa, xb, ya, yb) => { let n = 0, t = 0; for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) { t++; if (light(x, y)) n++; } return t ? n / t : 0; };
  let lx0 = x0, lx1 = x1, ly0 = y0, ly1 = y1;
  for (let i = 0; i < 40 && lx0 > 0 && share(lx0 - 1, lx0 - 1, ly0, ly1) > .6; i++) lx0--;
  for (let i = 0; i < 40 && lx1 < sw - 1 && share(lx1 + 1, lx1 + 1, ly0, ly1) > .6; i++) lx1++;
  for (let i = 0; i < 40 && ly0 > 0 && share(lx0, lx1, ly0 - 1, ly0 - 1) > .6; i++) ly0--;
  for (let i = 0; i < 40 && ly1 < sh - 1 && share(lx0, lx1, ly1 + 1, ly1 + 1) > .6; i++) ly1++;
  const f = W / sw, pad = 1;
  const X0 = Math.max(0, (lx0 - pad) * f), X1 = Math.min(W, (lx1 + pad) * f), Y0 = Math.max(0, (ly0 - pad) * f), Y1 = Math.min(H, (ly1 + pad) * f);
  return [X0, Y0, X1 - X0, Y1 - Y0];
}
// a book number in text read off a picture: spaces and dashes go, and the lone 9 printed left of the bars may be missed
function numbersIn(text){
  const t = text.replace(/[\s-]+/g, ""), out = new Set(t.match(/97[89]\d{10}/g) || []);
  for (const m of t.match(/7[89]\d{10}/g) || []) out.add("9" + m);
  return [...out].filter(isBookNumber);
}

// a still picture after a 3-2-1 countdown, so she can hold the book steady with both hands (her ask, 1 Nov): five
// frames are taken and each is read much harder than the live picture allows - the barcode at several sizes, and the
// printed number in the gold box, enlarged and sharpened. A number found here is used at once (the lookup then shows
// the book, which she checks before adding).
async function stillRead(video, open, ocr, msg){
  const btn = document.getElementById("camStill"); if (btn) btn.disabled = true;
  for (const n of ["3", "2", "1"]) { if (!open()) return; msg(`Hold still… ${n}`); await new Promise(r => setTimeout(r, 800)); }
  const frames = [];
  for (let i = 0; i < 5 && video.videoWidth; i++) {
    const c = document.createElement("canvas"); c.width = video.videoWidth; c.height = video.videoHeight; c.getContext("2d").drawImage(video, 0, 0);
    frames.push(c); await new Promise(r => setTimeout(r, 120));
  }
  msg("Reading the picture…");
  const hints = new Map([[ZXing.DecodeHintType.POSSIBLE_FORMATS, [ZXing.BarcodeFormat.EAN_13]], [ZXing.DecodeHintType.TRY_HARDER, true]]);
  const part = (src, [sx, sy, sw, sh], sc, filter, sharp) => {
    const c = document.createElement("canvas"); c.width = Math.round(sw * sc); c.height = Math.round(sh * sc);
    const g = c.getContext("2d", {willReadFrequently: true}); g.filter = filter; g.drawImage(src, sx, sy, sw, sh, 0, 0, c.width, c.height);
    if (sharp) {   // a light sharpen (unsharp 3x3) for a slightly soft picture
      const d = g.getImageData(0, 0, c.width, c.height), o = new Uint8ClampedArray(d.data), w = c.width;
      for (let y = 1; y < c.height - 1; y++) for (let x = 1; x < w - 1; x++) for (let k = 0; k < 3; k++) {
        const i = (y * w + x) * 4 + k;
        d.data[i] = 5 * o[i] - o[i - 4] - o[i + 4] - o[i - w * 4] - o[i + w * 4];
      }
      g.putImageData(d, 0, 0);
    }
    return c;
  };
  // a soft picture can still be misread into another real number (1 Nov: Hollywood, Ending's 858813 as 888438, twice), so
  // the page asks her to check the number against the book
  const done = n => { if (open()) { camClose(); camChecked = true; useScan(n); } return true; };
  for (const f of frames) {
    const W = f.width, H = f.height, box = [W * .2, H * .3, W * .6, H * .4];
    for (const [area, sc] of [[box, 1], [box, .6], [[0, 0, W, H], .5], [box, .4], [[0, 0, W, H], 1]])
      for (const sharp of [false, true]) for (const Bin of [ZXing.GlobalHistogramBinarizer, ZXing.HybridBinarizer]) {
        if (!open()) return;
        const r = new ZXing.MultiFormatReader(); r.setHints(hints);
        try { const t = r.decodeWithState(new ZXing.BinaryBitmap(new Bin(new ZXing.HTMLCanvasElementLuminanceSource(part(f, area, sc, "grayscale(1)", sharp))))).getText();
          if (isBookNumber(t) || isShopCode(t)) return done(t); } catch {}
      }
  }
  // the printed number: a soft picture can be misread into another valid number (1 Nov test: 858813 read as 888438),
  // so a number only counts when two separate readings agree; deblurred pictures are read first
  const w = ocr && await ocr.catch(() => null), seen = {};
  const count = text => { for (const n of numbersIn(text)) if ((seen[n] = (seen[n] || 0) + 1) >= 2) return n; return ""; };
  if (w) for (const f of frames.slice(0, 2)) for (const sigma of [2, 2.5]) {
    if (!open()) return;
    msg("Sharpening the picture…");
    const W = f.width, H = f.height, d = deblur(f, findBarcode(f) || [W * .2, H * .3, W * .6, H * .4], sigma);
    for (const Bin of [ZXing.GlobalHistogramBinarizer, ZXing.HybridBinarizer]) {
      const r = new ZXing.MultiFormatReader(); r.setHints(hints);
      try { const t = r.decodeWithState(new ZXing.BinaryBitmap(new Bin(new ZXing.HTMLCanvasElementLuminanceSource(d)))).getText(); if (isBookNumber(t) || isShopCode(t)) return done(t); } catch {}
    }
    try { await w.setParameters({tessedit_pageseg_mode: "6"}); const n = count((await w.recognize(d)).data.text); if (n) return done(n); } catch {}
  }
  if (w) for (const f of frames.slice(0, 3)) {
    const W = f.width, H = f.height, box = [W * .2, H * .3, W * .6, H * .4];
    for (const [sc, psm, sharp] of [[2, "6", true], [1.5, "6", false], [2, "11", true], [1, "6", false]]) {
      if (!open()) return;
      try { await w.setParameters({tessedit_pageseg_mode: psm});
        const text = (await w.recognize(part(f, box, sc, "grayscale(1) contrast(160%)", sharp))).data.text;
        const n = count(text); if (n) return done(n);
      } catch {}
    }
  }
  if (open()) msg("Couldn’t read that picture. Try again a little nearer or further, or type the number.");
  if (btn) btn.disabled = false;
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
  let last = "", n = 0;
  // what she sees in the close-up (the gold box), enlarged twice, is what gets read (1 Nov: she could read the numbers
  // there, but read across the whole picture they were too small); every other look takes the whole picture too
  const round = async w => {
    if (!open()) return;
    const vw = video.videoWidth, vh = video.videoHeight;
    if (vw) {
      const box = n++ % 3 < 2, [sx, sy, sw, sh] = box ? [vw * .2, vh * .3, vw * .6, vh * .4] : [0, 0, vw, vh];
      const sc = box ? 2 : Math.min(1, 1600 / vw);
      canvas.width = sw * sc; canvas.height = sh * sc;
      ctx.filter = "grayscale(1) contrast(170%)"; ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      try {
        const text = (await w.recognize(canvas)).data.text;
        // the number may be printed "ISBN 978-1-83821-775-4" or, under the bars, "9 781838 217754": spaces and dashes go
        const found = (text.replace(/[\s-]+/g, "").match(/97[89]\d{10}/g) || []).find(isBookNumber) || "";
        if (found && found === last && open()) { camClose(); camChecked = true; return useScan(found); }
        if (found) last = found;
      } catch {}
    }
    setTimeout(() => round(w), 150);
  };
  worker.then(round).catch(() => {});   // if the text reader can't load, the barcode reader carries on alone
}
document.addEventListener("click", e => {
  if (e.target.closest("#camOpen")) camOpen();
  if (e.target.closest("#camStop") || e.target.id === "camPanel") camClose();
  if (e.target.closest("#camStill") && camStillFor) camStillFor();

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
    const box = document.getElementById("scannedBox"); if (box) box.innerHTML = scannedBox(); }
});
// her special editions so far, offered as she types (1 Nov: the Add page had no way to say a copy is special)
const SPECIAL_EDITIONS = () => [...new Set(BOOKS.map(b => b.special).filter(Boolean))].sort();
const readAdd = () => ["isbn", "title", "authors", "publisher", "published", "pages", "shelf", "signed", "special"].forEach(k => { const el = document.getElementById("add-" + k); if (el) addForm[k] = el.value.trim(); });
// "Find another cover" (her ask, 1 Nov): other editions' covers, each shown whole at its own shape (a trimmed or oddly
// cropped one shows as it is) with its size; she clicks one, or says none is hers and it's marked for a photo of her copy
function coverPicker(f){
  if (f.coverChoices === "busy") return `<div class="cover-pick"><p class="add-note">Looking for other covers…</p></div>`;
  return `<div class="cover-pick"><div class="cover-pick-head"><b>Pick the cover that matches your copy</b>
      <button type="button" class="btn quiet" data-cover-none>${ic("camera")}None of these: I’ll photograph mine</button>
      <button type="button" class="btn quiet" data-cover-close>${ic("x")}Close</button></div>
    ${f.coverChoices.length ? `<div class="cover-grid">${f.coverChoices.map((c, i) => `<button type="button" class="cover-choice${c.src === f.cover ? " on" : ""}" data-cover-pick="${i}" hidden>
      <img src="${escRaw(c.src)}" alt=""><span>${esc(c.label)}${c.uk ? " · UK" : ""}</span><span class="size"></span></button>`).join("")}</div>`
      : `<p class="add-note">No other covers found.</p>`}</div>`;
}
// a picture that doesn't load, or is a tiny placeholder (Amazon's blank 1×1), isn't offered; the rest show their size
document.addEventListener("load", e => {
  const img = e.target; if (!(img instanceof HTMLImageElement) || !img.closest(".cover-choice")) return;
  const b = img.closest(".cover-choice");
  if (img.naturalWidth < 120) return b.remove();
  b.querySelector(".size").textContent = `${img.naturalWidth} × ${img.naturalHeight}`; b.hidden = false;
}, true);
document.addEventListener("error", e => { const b = e.target.closest && e.target.closest(".cover-choice"); if (b) b.remove(); }, true);
document.addEventListener("click", async e => {
  if (e.target.closest("#findCover")) {
    readAdd(); addForm.coverChoices = "busy"; redrawAdd();
    const mine = addForm;
    let found = [];
    try { const r = await api("api/covers?" + new URLSearchParams({isbn: addForm.isbn, title: addForm.title, author: addForm.authors.split(",")[0].trim()}));
      found = r.covers || []; } catch {}
    if (addForm !== mine || mine.coverChoices !== "busy") return;   // closed, or another book, meanwhile
    readAdd(); addForm.coverChoices = found;
    return redrawAdd();
  }
  // the right cover, but photographed at an angle or with the background round it (her ask, 1 Nov): the server cuts it
  // out along the book's edges and pulls it square, and it shows here at once; a second click puts the original back
  // Trim less / Trim more: straightened again from the original with every edge moved out or in a little
  const trim = e.target.closest("[data-trim]");
  if (e.target.closest("#fixCover") || trim) {
    readAdd();
    if (!trim && addForm.coverOriginal) { addForm.cover = addForm.coverOriginal; addForm.coverOriginal = null; addForm.cornersUsed = null; addForm.trimEdge = 0; return redrawAdd(); }
    const src = addForm.coverOriginal || addForm.cover, edge = trim ? Math.max(-96, Math.min(96, (addForm.trimEdge || 0) + +trim.dataset.trim)) : 0;
    const hers = trim ? addForm.cornersUsed : null, mine = addForm, before = addForm.cover;
    addForm.straightening = true; addForm.note = ""; redrawAdd();
    let r;
    try { r = await api("api/straighten?" + new URLSearchParams(hers ? {src, edge, corners: hers} : {src, edge})); }
    catch { r = {ok: false, error: "Couldn’t straighten this cover."}; }
    if (addForm !== mine || mine.cover !== before) return;   // another book, or another cover, meanwhile
    readAdd();
    if (r.ok) Object.assign(addForm, {coverOriginal: src, cover: r.cover, trimEdge: edge, cornersUsed: hers});
    else addForm.note = r.error;
    addForm.straightening = false; return redrawAdd();
  }
  const pick = e.target.closest("[data-cover-pick]");
  if (pick) { readAdd(); addForm.cover = addForm.coverChoices[+pick.dataset.coverPick].src; addForm.coverWrong = false; addForm.coverOriginal = null; addForm.coverChoices = null; addForm.corners = null; addForm.cornersUsed = null; addForm.trimEdge = 0; return redrawAdd(); }
  if (e.target.closest("[data-cover-none]")) { readAdd(); addForm.coverWrong = true; addForm.coverOriginal = null; addForm.coverChoices = null; addForm.corners = null; addForm.cornersUsed = null; addForm.trimEdge = 0; return redrawAdd(); }
  if (e.target.closest("[data-cover-close]")) { readAdd(); addForm.coverChoices = null; return redrawAdd(); }
});
const redrawAdd = () => { const y = scrollY; document.getElementById("view").innerHTML = pageAdd(); scrollTo(0, y); };

// "Set the corners" (her ask, 2 Nov: Child of the Grove had no picture the automatic straightening could do): the picture
// with four dots she drags onto the cover's corners. Each moves on its own, so any four-sided shape at any angle can be
// followed; the server then pulls it square in perspective. The dots start on the book's corners if they can be found.
// While a dot is held, a magnifier shows the spot close up; a click on the picture brings the nearest dot there.
function cornerEditor(f){
  const c = f.corners;
  if (c === "busy") return `<div class="corner-edit"><p class="add-note">Opening the picture…</p></div>`;
  return `<div class="corner-edit"><div class="cover-pick-head"><b>Drag the four dots onto the corners of the cover</b>
      <button type="button" class="btn pick" data-corners-use${f.straightening ? " disabled" : ""}>${ic("crop")}${f.straightening ? "Squaring it up…" : "Use these corners"}</button>
      <button type="button" class="btn quiet" data-corners-close>${ic("x")}Cancel</button></div>
    <div class="corner-stage" id="cornerStage"><img id="cornerImg" src="${escRaw(c.src)}" alt="" draggable="false">
      <svg class="corner-lines" aria-hidden="true"><polygon></polygon></svg>
      ${[0, 1, 2, 3].map(i => `<span class="corner-dot" data-dot="${i}" aria-label="${["Top left", "Top right", "Bottom right", "Bottom left"][i]} corner"></span>`).join("")}
      <div class="corner-loupe" id="cornerLoupe" hidden></div></div></div>`;
}
function placeCorners(){
  const c = addForm.corners, img = document.getElementById("cornerImg"), stage = document.getElementById("cornerStage");
  if (!c || c === "busy" || !img || !img.clientWidth) return;
  const k = img.clientWidth / c.width, pts = c.pts.map(([x, y]) => [x * k, y * k]);
  stage.querySelectorAll(".corner-dot").forEach((d, i) => { d.style.left = pts[i][0] + "px"; d.style.top = pts[i][1] + "px"; });
  stage.querySelector("polygon").setAttribute("points", pts.map(p => p.join(",")).join(" "));
}
document.addEventListener("load", e => { if (e.target.id === "cornerImg") placeCorners(); }, true);
addEventListener("resize", placeCorners);
let cornerDrag = null;
document.addEventListener("pointerdown", e => {
  const stage = e.target.closest("#cornerStage"); if (!stage || !addForm.corners || addForm.corners === "busy") return;
  e.preventDefault();
  const img = document.getElementById("cornerImg"); if (!img || !img.clientWidth) return;   // not loaded yet
  const r = img.getBoundingClientRect(), k = img.clientWidth / addForm.corners.width;
  const dot = e.target.closest(".corner-dot");
  let i = dot ? +dot.dataset.dot : -1;
  if (i < 0) {   // a click on the picture: the nearest dot comes to it
    const x = (e.clientX - r.left) / k, y = (e.clientY - r.top) / k;
    i = addForm.corners.pts.map(([px, py], n) => [Math.hypot(px - x, py - y), n]).sort((a, b) => a[0] - b[0])[0][1];
  }
  cornerDrag = i; try { stage.setPointerCapture(e.pointerId); } catch {}
  stage.querySelector(`[data-dot="${i}"]`).classList.add("on");
  cornerMove(e);
});
function cornerMove(e){
  if (cornerDrag === null) return;
  const c = addForm.corners, img = document.getElementById("cornerImg"); if (!img || !img.clientWidth || !c || c === "busy") return;
  const r = img.getBoundingClientRect(), k = img.clientWidth / c.width;
  const x = Math.min(Math.max(e.clientX - r.left, 0), img.clientWidth), y = Math.min(Math.max(e.clientY - r.top, 0), img.clientHeight);
  c.pts[cornerDrag] = [x / k, y / k];
  placeCorners();
  const loupe = document.getElementById("cornerLoupe"), Z = 4, L = 150;   // four times closer, on the side away from the dot
  loupe.hidden = false;
  loupe.style.backgroundImage = `url("${c.src.replace(/"/g, "%22")}")`;
  loupe.style.backgroundSize = `${img.clientWidth * Z}px ${img.clientHeight * Z}px`;
  loupe.style.backgroundPosition = `${-(x * Z - L / 2)}px ${-(y * Z - L / 2)}px`;
  loupe.style.left = (x < img.clientWidth / 2 ? img.clientWidth - L - 8 : 8) + "px";
}
document.addEventListener("pointermove", cornerMove);
document.addEventListener("pointerup", () => {
  if (cornerDrag === null) return;
  cornerDrag = null;
  document.querySelectorAll(".corner-dot.on").forEach(d => d.classList.remove("on"));
  const loupe = document.getElementById("cornerLoupe"); if (loupe) loupe.hidden = true;
});
document.addEventListener("click", async e => {
  if (e.target.closest("#cornersOpen")) {
    readAdd();
    if (addForm.corners) { addForm.corners = null; return redrawAdd(); }
    const src = addForm.coverOriginal || addForm.cover, mine = addForm;
    addForm.corners = "busy"; addForm.coverChoices = null; addForm.note = ""; redrawAdd();
    let r;
    try { r = await api("api/outline?" + new URLSearchParams({src})); } catch { r = {ok: false, error: "Couldn’t open this picture."}; }
    if (addForm !== mine || mine.corners !== "busy" || (mine.coverOriginal || mine.cover) !== src) return;   // cancelled, or another cover, meanwhile
    readAdd();
    if (r.ok) addForm.corners = {src, width: r.width, height: r.height, pts: r.corners};
    else { addForm.corners = null; addForm.note = r.error; }
    redrawAdd();
    return document.getElementById("cornerStage")?.scrollIntoView({block: "center", behavior: "smooth"});
  }
  if (e.target.closest("[data-corners-close]")) { readAdd(); addForm.corners = null; return redrawAdd(); }
  if (e.target.closest("[data-corners-use]")) {
    readAdd();
    const c = addForm.corners, mine = addForm; if (!c || c === "busy") return;
    const used = c.pts.flat().map(v => v.toFixed(1)).join(","); if (!/^[\d.,]+$/.test(used)) return;
    addForm.straightening = true; redrawAdd();
    let r;
    try { r = await api("api/straighten?" + new URLSearchParams({src: c.src, corners: used})); } catch { r = {ok: false, error: "Couldn’t square it up."}; }
    if (addForm !== mine || mine.corners !== c) return;   // cancelled, or another book, meanwhile
    readAdd();
    if (r.ok) Object.assign(addForm, {coverOriginal: c.src, cover: r.cover, trimEdge: 0, cornersUsed: used, corners: null, coverWrong: false});
    else addForm.note = r.error;
    addForm.straightening = false; redrawAdd(); scrollTo({top: 0, behavior: "smooth"});
  }
});
document.addEventListener("click", async e => {
  const from = e.target.closest("[data-add-from]");
  if (from) { const w = WISH.find(x => x.id === from.dataset.addFrom); addFromWish = true; addForm = {isbn: w.isbn13 || "", title: w.title.replace(/\s*\((old|original paperback)\)$/i, ""), authors: (w.authors || []).filter(a => !a.role).map(a => a.name).join(", "), publisher: "", published: "", pages: "", cover: "", shelf: "", busy: false, fromWish: w.id,
    note: "From your to-buy list: type the ISBN of the copy you got and look it up, or just pick a shelf. It comes off the list when you add it."}; return; }
  if (e.target.closest("#addLookup")) {
    readAdd(); if (!addForm.isbn) { addForm.note = "Type the ISBN first."; return redrawAdd(); }
    if (addForm.looking) return;
    const mine = addForm, isbn = addForm.isbn;
    addForm.looking = true; addForm.note = "Looking it up…"; redrawAdd();
    let d = null;
    try { d = await api("api/lookup?isbn=" + encodeURIComponent(isbn)); } catch {}
    mine.looking = false;
    if (addForm !== mine) return;   // another book meanwhile (review, 9 Nov)
    readAdd();
    if (addForm.isbn !== isbn) { addForm.note = ""; return redrawAdd(); }   // she changed the number while it looked: that one wins
    try { if (!d) throw 0;
      if (d.found) Object.assign(addForm, {title: d.title, authors: d.authors.join(", "), publisher: d.publisher, published: d.published, pages: d.pages || "", cover: d.cover, coverWrong: false, coverOriginal: null, coverChoices: null, corners: null, cornersUsed: null, trimEdge: 0, shelf: "", note: "Found it. Check the details and pick a shelf.",
        suggest: suggestShelf(d)});
      else if (d.error) addForm.note = "The lookup didn’t work this time (the shops may be slow). Try again, or fill in the details yourself.";
      else Object.assign(addForm, {title: addForm.fromWish ? addForm.title : "", authors: addForm.fromWish ? addForm.authors : "", publisher: "", published: "", pages: "", cover: "", shelf: "", suggest: null, coverWrong: false, coverOriginal: null, coverChoices: null, corners: null, cornersUsed: null, trimEdge: 0,
        note: "Open Library, Waterstones and Goodreads don’t know that number yet (new or special editions can take a while). Try the Waterstones price sticker if it has one, or fill in the details yourself."}); }
    catch { addForm.note = "Couldn’t reach Open Library. Fill in the details yourself."; }
    if (camChecked) { camChecked = false; addForm.note = `Read from a picture: check ${addForm.isbn} matches the book. ` + addForm.note; }
    const typed = isbn13Of(addForm.isbn), have = BOOKS.find(b => (typed && b.isbn13 === typed) || (b.shopCode && b.shopCode === addForm.isbn));
    if (have) addForm.note = `You already have this one: ${have.t}. Add it again only if it’s a second copy.`;
    return redrawAdd();
  }
  if (e.target.closest("#addSave")) {
    readAdd();
    if (!addForm.title || !addForm.shelf) { addForm.note = !addForm.title ? "It needs a title." : "Pick a shelf for it."; return redrawAdd(); }
    addForm.busy = true; addForm.note = ""; redrawAdd();
    try { const r = await api("api/books", {method: "POST", body: JSON.stringify({...addForm, authors: addForm.authors.split(",").map(a => a.trim()).filter(Boolean)})});
      if (r.ok) {
        try { sessionStorage.setItem("library-just-added", JSON.stringify({id: r.id, warning: r.warning || ""})); } catch {}
        addForm = {isbn: "", title: "", authors: "", publisher: "", published: "", pages: "", cover: "", shelf: "", note: "", busy: false};
        location.href = location.pathname + "?v=" + Date.now() + "#add"; return; }
      addForm.note = r.error || (r.saved ? "It’s saved, but something went wrong after. Don’t add it again." : "That didn’t save."); }
    catch { addForm.note = "That didn’t save: is the library open from its shortcut?"; }
    addForm.busy = false; redrawAdd();
  }
});
document.addEventListener("change", async e => {   // an old book's condition, from its page (her ask, 5 Nov): saved, then the page reloads
  const pick = e.target.closest("[data-cond-id]"); if (!pick) return;
  pick.disabled = true;
  try { const r = await api("api/condition", {method: "POST", body: JSON.stringify({id: pick.dataset.condId, condition: pick.value})});
    if (r.ok) return location.reload();
    if (r.saved) { alert("Saved, but the site couldn’t be rebuilt, so the page doesn’t show it yet. Don’t change it again; close and reopen the library."); return location.reload(); } } catch {}
  pick.disabled = false; alert("That didn’t save: is the library open from its shortcut?");
});
document.addEventListener("change", async e => {   // an old book's inscription, typed on its page (her ask, 5 Nov): saved when she clicks away, then the page reloads
  const box = e.target.closest("[data-inscr-id]"); if (!box) return;
  box.disabled = true;
  try { const r = await api("api/inscription", {method: "POST", body: JSON.stringify({id: box.dataset.inscrId, inscription: box.value})});
    if (r.ok) return location.reload();
    if (r.saved) { alert("Saved, but the site couldn’t be rebuilt, so the page doesn’t show it yet. Don’t change it again; close and reopen the library."); return location.reload(); } } catch {}
  box.disabled = false; alert("That didn’t save: is the library open from its shortcut?");
});
document.addEventListener("change", async e => {   // signed or not, from a book's page: saved by the server, then the page reloads
  const pick = e.target.closest("[data-sign-id]"); if (!pick) return;
  pick.disabled = true;
  try { const r = await api("api/signed", {method: "POST", body: JSON.stringify({id: pick.dataset.signId, signed: pick.value})});
    if (r.ok) return location.reload();
    if (r.saved) { alert("Saved, but the site couldn’t be rebuilt, so the page doesn’t show it yet. Don’t change it again; close and reopen the library."); return location.reload(); } } catch {}
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
  const bars = (rows, max) => `<div class="bars">${rows.map(r => `<${r.href ? `a href="${r.href}"` : "div"} class="bar-row" style="--c:${r.color || "var(--deep-2)"}"><b title="${esc(r.label)}">${esc(r.label)}</b><div class="track"><i style="width:${(r.n / max * 100).toFixed(1)}%"></i></div><span>${r.text || num(r.n)}</span></${r.href ? "a" : "div"}>`).join("")}</div>`;
  const shelves = SHELVES.filter(s => s.books.length).map(s => ({label: s.name, n: s.books.length, color: s.color, href: "#shelf-" + s.id,
    text: `${num(s.books.length)} · ${Math.round(s.books.length / BOOKS.length * 100)}%`})).sort((a, b) => b.n - a.n);
  const top = AUTHORS.map(a => ({label: a.name, n: a.books.filter(x => !x.role).length, href: "#a-" + a.id})).sort((a, b) => b.n - a.n).slice(0, 12);
  const pubs = {}; BOOKS.forEach(b => { if (b.publisher) { const p = b.publisher.replace(/\s+(Ltd|Limited|PLC|Plc|plc|Inc|LLC|Publishing|Publishers|Books)\.?$/g, "").replace(/,$/, "").trim(); pubs[p] = (pubs[p] || 0) + 1; } });
  const topPubs = Object.entries(pubs).map(([label, n]) => ({label, n})).sort((a, b) => b.n - a.n).slice(0, 10);
  const dec = {}; BOOKS.forEach(b => { const y = +year(b.published); if (y) { const d = Math.floor(y / 10) * 10; dec[d] = (dec[d] || 0) + 1; } });
  const dk = Object.keys(dec).map(Number), decs = dk.length ? Array.from({length: (Math.max(...dk) - Math.min(...dk)) / 10 + 1}, (_, i) => Math.min(...dk) + i * 10) : [];
  decs.forEach(d => dec[d] ||= 0); const dmax = Math.max(1, ...Object.values(dec));
  const readN = booksRead(BOOKS), titles = new Set(BOOKS.map(bookKey)).size, perYear = {};
  readingLog().filter(isRead).flatMap(finishes).forEach(d => { const y = year(d); if (y) perYear[y] = (perYear[y] || 0) + 1; });
  const readYears = Object.keys(perYear).sort().reverse().map(y => ({label: y, n: perYear[y], href: "#history"}));
  return hero({kicker: "The numbers", title: "<em>Stats</em>", text: "How the library adds up.", covers: mixed([...BOOKS].reverse())})
    + `<div class="ledger"><div class="ledger-grid">
        <div class="meter"><b>${num(BOOKS.length)}</b><span>books on the shelves</span></div>
        <div class="meter"><b>${num(pages)}</b><span>pages (${num(withPages.length)} books with a page count)</span></div>
        <div class="meter"><b>${num(Math.round(pages / (withPages.length || 1)))}</b><span>pages in an average book</span></div>
        <div class="meter"><b>${Math.round(readN / titles * 100)}%</b><span>read (${plural(readN, "book")})</span></div>
      </div></div>`
    + sectionHead("By <em>shelf</em>") + bars(shelves, shelves[0]?.n || 1)
    + readingStats(bars, readYears)
    + sectionHead("Most <em>books</em> by", `<span class="more">Written, not illustrated or translated</span>`) + bars(top, top[0]?.n || 1)
    + sectionHead("When they were <em>published</em>") + `<div class="decades${decs.length > 12 ? " many" : ""}">${decs.map(d => `<div><b>${dec[d]}</b><i style="height:${(dec[d] / dmax * 100).toFixed(1)}%"></i><span>${d}s</span></div>`).join("")}</div>`
    + sectionHead("Top <em>publishers</em>") + bars(topPubs, topPubs[0]?.n || 1);
}

// ---------- search ----------
const q = document.getElementById("q");
document.getElementById("searchIco").innerHTML = ic("search");
function pageSearch(term){
  const plain = s => String(s || "").toLowerCase().replace(/[’‘]/g, "'").replace(/st\.\s*/g, "st ");
  const t = plain(term).trim(), tn = t.replace(/[^0-9x]/g, "");
  const hit = b => plain(b.title).includes(t) || plain(b.t).includes(t) || plain(b.sub).includes(t) || b.by.toLowerCase().includes(t) || (b.authors || []).some(a => a.name.toLowerCase().includes(t))
    || (tn.length >= 6 && ((b.isbn13 || "").includes(tn) || (b.isbn10 || "").toLowerCase().includes(tn)));
  const books = BOOKS.filter(hit).sort(SORTS.title[1]), authors = AUTHORS.filter(a => a.name.toLowerCase().includes(t)), wish = WISH.filter(hit);
  const away = ELSEWHERE.filter(hit).sort(SORTS.title[1]);
  return `<div class="section-head" style="margin-top:56px"><h2>Results for <em class="keep">‘${esc(term)}’</em></h2><span class="more">${plural(books.length, "book")}</span></div>`
    + (authors.length ? `<div class="chips" style="margin-bottom:28px">${authors.slice(0, 20).map(a => `<a class="btn" href="#a-${a.id}">${ic("user")}<span class="keep">${esc(a.name)}</span> · ${a.books.length}</a>`).join("")}</div>` : "")
    + (books.length ? grid(books) : `<p class="empty">No books match.</p>`)
    + (away.length ? sectionHead("Read or to read, <em>not on your shelves</em>") + grid(away) : "")
    + (wish.length ? sectionHead("On the <em>to-buy list</em>") + `<div class="books">${wish.map(w => `<a class="bk" ${cardShape(w)} href="#to-buy"><div class="slot">${cover(w)}</div><h3>${esc(w.t)}</h3><div class="by">${esc(w.by)}</div></a>`).join("")}</div>` : "");
}
q.addEventListener("input", () => { const v = q.value.trim(); if (location.hash === "#add") readAdd();
  if (v.length >= 2) { document.getElementById("view").innerHTML = pageSearch(v); scrollTo(0, 0); } else { addFromWish = !!addForm.fromWish; route(); } });
q.addEventListener("keydown", e => { if (e.key === "Escape") { q.value = ""; addFromWish = !!addForm.fromWish; route(); } });
document.addEventListener("click", e => {   // a sidebar link or the title: the search goes; on the same page it's redrawn (review, 9 Nov)
  const a = e.target.closest("#nav a, a.brand"); if (!a || !q.value) return;
  q.value = "";
  if ((a.getAttribute("href") || "") === (location.hash || "#home")) route();
});

// ---------- trial covers: every proposed cover next to the one shown now ----------
function pageTrialCovers(){
  const pic = (src, b) => `<div class="cover${src ? "" : " blank"}">${src ? `<img src="${escRaw(src)}" alt="" loading="lazy">` : ""}<span class="t">${esc(b.t)}</span><span class="a">${esc(b.by)}</span></div>`;
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
// the suggested covers are all for the Old Book Collection now, so the switch shows only there (her ask, 1 Nov)
const trialShown = () => { trialSwitch.hidden = !(["#shelf-old-book-collection", "#trial-covers"].includes(location.hash) || /^#old-/.test(location.hash)); };
addEventListener("hashchange", trialShown); trialShown();

// ---------- phones and narrow windows: the sidebar as a drawer (21 Nov, her ask; like Sim World's) ----------
// it opens from the top bar's button and closes on a link chosen, Escape, a tap outside it, or Enter in the search
const menuBtn = document.getElementById("menuBtn");
document.getElementById("menuIco").innerHTML = ic("menu");
function setMenu(open, focusBack){
  document.body.classList.toggle("nav-open", open);
  menuBtn.setAttribute("aria-expanded", open);
  if (open) setTimeout(() => document.querySelector("#side .nav a.on, #side .nav a")?.focus({preventScroll: true}), 30);
  else if (focusBack) menuBtn.focus();
}
const menuOpen = () => document.body.classList.contains("nav-open");
menuBtn.addEventListener("click", () => setMenu(!menuOpen()));
document.getElementById("scrim").addEventListener("click", () => setMenu(false));
document.addEventListener("keydown", e => { if (e.key === "Escape" && menuOpen()) setMenu(false, true); });
document.getElementById("side").addEventListener("click", e => { if (e.target.closest("a")) setMenu(false); });
q.addEventListener("keydown", e => { if (e.key === "Enter" && menuOpen()) { q.blur(); setMenu(false); } });   // a phone's Go key shows the results
matchMedia("(min-width: 901px)").addEventListener("change", e => { if (e.matches) setMenu(false); });

// ---------- the foot of every page: Back to top and Dark mode (21 Nov, her ask for all her sites; as on Jemma's Journals) ----------
// Light by default, whatever the device prefers; dark only when she presses the button, and remembered (index.html applies it
// before the page shows, so it never flashes light first).
const MODE_KEY = "jemmas-library-mode", modeBtn = document.getElementById("modeBtn"), toTop = document.getElementById("toTop");
toTop.innerHTML = `${ic("arrow-up")}Back to top`;
function showMode(){
  const dark = document.documentElement.getAttribute("data-mode") === "dark";
  modeBtn.innerHTML = `${ic(dark ? "sun" : "moon")}${dark ? "Light mode" : "Dark mode"}`;
  modeBtn.setAttribute("aria-pressed", dark);
}
modeBtn.addEventListener("click", () => {
  const mode = document.documentElement.getAttribute("data-mode") === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-mode", mode);
  try { localStorage.setItem(MODE_KEY, mode); } catch {}
  showMode();
});
showMode();
toTop.addEventListener("click", () => {
  scrollTo({top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"});
  document.getElementById("view").focus({preventScroll: true});
});

// ---------- routing ----------
function route(page){   // page: only the tests pass one (they open a thousand pages; the browser limits address changes)
  const key = page || location.hash.slice(1) || "home", view = document.getElementById("view");
  let html, active = "#" + key, title = "Jemma’s Library";
  if (key === "add" && !addFromWish && addForm.fromWish) addForm = {isbn: "", title: "", authors: "", publisher: "", published: "", pages: "", cover: "", shelf: "", note: "", busy: false};
  addFromWish = false;
  if (key.startsWith("shelf-") && shelfIndex[key.slice(6)]) { shelfView = {...SHELF_VIEW}; const s = shelfIndex[key.slice(6)]; html = pageShelf(s); title = s.name; }
  else if (key === "shelves") { shelfView = {...SHELF_VIEW}; html = pageAllShelves(); title = "All shelves"; }
  else if (key.startsWith("b-") && bookIndex[key.slice(2)]) { const b = bookIndex[key.slice(2)]; html = pageBook(b); active = b.shelf === COLLECTION ? "#old-" + ((DATA.oldKinds || {})[b.id] || "childrens") : "#shelf-" + b.shelf; title = b.t; }
  else if (key.startsWith("r-") && SG.books[+key.slice(2)] && !SG.books[+key.slice(2)].books && ELSEWHERE.includes(SG.books[+key.slice(2)])) { const e = SG.books[+key.slice(2)]; html = pageSgBook(e); active = e.shelf ? "#shelf-" + e.shelf : "#reading"; title = e.t; }
  else if (key === "old-to-find") { html = pageOldToFind(); title = "Old books to find"; }
  else if (key.startsWith("old-") && OLD_KINDS.some(k => k[0] === key.slice(4))) { const k = OLD_KINDS.find(k => k[0] === key.slice(4)); html = pageOldKind(k); title = "Old books · " + k[1]; }
  else if (key.startsWith("a-") && authorIndex[key.slice(2)]) { const a = authorIndex[key.slice(2)]; html = pageAuthor(a); active = "#authors"; title = a.name; }
  else { html = {authors: pageAuthors, reading: pageReading, history: pageHistory, add: pageAdd, "to-buy": pageToBuy, stats: pageStats, "trial-covers": pageTrialCovers}[key]?.() || (active = "#home", pageHome());
    title = {authors: "Authors", reading: "Reading", history: "History", add: "Add a book", "to-buy": "To buy", stats: "Stats", "trial-covers": "New covers"}[key] || title; }
  view.innerHTML = html; renderNav(active); fitRows();
  document.title = title === "Jemma’s Library" ? title : `${curly(title)} · Jemma’s Library`;
  scrollTo(0, 0);
  if (menuOpen()) setMenu(false);
}
addEventListener("hashchange", () => { q.value = ""; route(); });
// a home row shows only the books that fit whole (review, 2 Nov: a wide cover or a narrow window cut the last one in half)
function fitRows(){
  document.querySelectorAll(".books.row").forEach(row => {
    [...row.children].forEach(c => c.hidden = false);
    [...row.children].forEach(c => c.hidden = c.offsetLeft - row.offsetLeft + c.offsetWidth > row.clientWidth + 1);
  });
}
addEventListener("resize", fitRows);

// ---------- interactions ----------
document.addEventListener("click", e => {
  const t = e.target.closest("button, a[data-jump]"); if (!t) return;
  if (t.dataset.filter || t.dataset.view) {
    if (t.dataset.filter) shelfView.filter = t.dataset.filter; else store.set(VIEW_KEY, t.dataset.view);
    document.getElementById("shelfBooks").innerHTML = shelfBooks(currentList);
  } else if (t.dataset.jump) { e.preventDefault(); document.getElementById(t.dataset.jump).scrollIntoView({behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"}); }
});
document.addEventListener("click", e => { const s = e.target.closest(".spoiler"); if (s) s.classList.toggle("shown"); });
document.addEventListener("click", e => {
  const open = e.target.closest(".pick-open");
  if (open) { pickShelf = open.dataset.pickShelf; pickFixed = !!pickShelf; picked = null; pickNew(); return pickShow(); }
  if (e.target.closest("#pickOne")) { pickNew(); return pickShow(); }
  if (e.target.closest("#pickClose") || e.target.id === "pickPanel" || e.target.closest(".pick-book, .pick-title")) pickHide();
});
document.addEventListener("keydown", e => { if (e.key === "Escape") pickHide(); });
addEventListener("hashchange", pickHide);
document.addEventListener("change", e => {
  const t = e.target;
  if (t.id === "sort") { shelfView.sort = t.value; document.getElementById("shelfBooks").innerHTML = shelfBooks(currentList); }
  else if (t.id === "pickShelf") { pickShelf = t.value; picked = null; pickNew(); pickShow(); }
});

// installed as a Chrome app from the local server (sharp taskbar icon); opened straight from the folder it's an ordinary page
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});
// no "Install as app" offer: her shortcut window already has its own sharp taskbar icon (18 Oct)
addEventListener("beforeinstallprompt", e => e.preventDefault());

// back on Add a Book after adding (she adds in bulk, 1 Nov): the one just added shows in a small note for a few seconds,
// with a link to it; the shelf starts empty for each book (her ask, 1 Nov)
(function justAdded(){
  let a = null;
  try { a = JSON.parse(sessionStorage.getItem("library-just-added") || "null"); sessionStorage.removeItem("library-just-added"); } catch {}
  if (!a) return;
  const b = bookIndex[a.id]; if (!b) return;
  const note = document.createElement("div"); note.className = "added-note"; note.setAttribute("role", "status");
  note.innerHTML = `<a href="${href(b)}">${cover(b)}</a><div><span class="label">${ic("check")}Added to ${esc((shelfIndex[b.shelf] || {}).name || "the shelves")}</span>
    <a class="t" href="${href(b)}">${esc(b.t)}</a><div class="by">${esc(b.by)}</div>${a.warning ? `<div class="by">${esc(a.warning)}</div>` : ""}</div><button type="button" class="btn quiet" aria-label="Close">${ic("x")}</button>`;
  note.querySelector("button").onclick = () => note.remove();
  document.body.appendChild(note);
  setTimeout(() => note.classList.add("going"), 6500); setTimeout(() => note.remove(), 7000);
})();
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
    const WORD = /(?<![\p{L}\p{N}’'-])\p{L}[\p{L}’'-]*/gu;
    const total = list.reduce((t, n) => t + (n.textContent.match(WORD) || []).length, 0);
    let i = 0;
    list.forEach(n => {
      const keep = n.parentElement.closest(".keep");   // a name or her search term: counted, never changed
      const text = n.textContent.replace(WORD, w => {
        const k = i++, low = w.toLowerCase();
        if (keep) return w;
        if (k > 0 && k < total - 1 && SMALL_WORDS.has(low)) return low;
        return w.split("-").map(p => p ? p[0].toUpperCase() + p.slice(1) : p).join("-");
      });
      if (text !== n.textContent) n.textContent = text;
    });
  });
}
new MutationObserver(ms => { if (ms.some(m => [...m.addedNodes].some(n => n.nodeType === 1))) capitalise(document); }).observe(document.body, {childList: true, subtree: true});
capitalise(document);
