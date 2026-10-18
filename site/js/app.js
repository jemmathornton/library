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
  t = t.replace(/\s+Paperback$/i, "").trim();
  const c = t.indexOf(": ");
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

// reading marks: hers in this browser win over what Libib had ("In progress" on one book)
const reading = b => ({...(b.status ? {status: b.status} : {}), ...(READ[b.id] || {})});
const isRead = b => reading(b).status === "read", isReading = b => reading(b).status === "reading";

// ---------- pieces ----------
// covers are copied into covers/; one still only linked from Open Library uses its quicker medium size in lists
const coverSrc = (b, big) => big || !/^https:/.test(b.cover) ? b.cover : b.cover.replace(/-L\.jpg$/, "-M.jpg");
function cover(b, extra = "", big = false){
  const s = shelfIndex[b.shelf], st = reading(b).status;
  const badge = st === "read" ? `<span class="badge" title="Read">${ic("check")}</span>` : st === "reading" ? `<span class="badge reading" title="Reading now">${ic("bookmark")}</span>` : "";
  return `<div class="cover${b.cover ? "" : " blank"} ${extra}" style="--c:${s ? s.color : "#2B443A"}">${badge}${b.cover ? `<img src="${esc(coverSrc(b, big))}" alt="" loading="lazy">` : ""}<span class="t">${esc(b.t)}</span><span class="a">${esc(b.by)}</span></div>`;
}
// a cover that won't load becomes a title card
document.addEventListener("error", e => { const img = e.target; if (img.tagName === "IMG" && img.parentNode.classList.contains("cover")) { img.parentNode.classList.add("blank"); img.remove(); } }, true);

const card = (b, note) => `<a class="bk" href="#b-${b.id}">${cover(b)}<h3>${esc(b.t)}</h3><div class="by">${esc(note || b.by)}</div></a>`;
const grid = (list, cls = "") => list.length ? `<div class="books ${cls}">${list.map(b => card(b)).join("")}</div>` : "";
function listView(list){
  return `<div class="blist">${list.map(b => { const st = reading(b).status;
    return `<a href="#b-${b.id}">${cover(b)}<b>${esc(b.t)}</b><span>${esc(b.by)}</span><span>${esc(b.publisher || "")}</span><span>${year(b.published)}</span>`
      + `<span class="st ${st || ""}">${st === "read" ? "Read" : st === "reading" ? "Reading" : ""}</span></a>`; }).join("")}</div>`;
}
const hero = (o) => `<header class="hero" style="--c:${o.color || "var(--brass)"}"><div class="kicker"><i></i><span class="label">${o.kicker}</span></div>
  <h1>${o.title}</h1>${o.text ? `<p>${o.text}</p>` : ""}${o.figures ? `<div class="figures">${o.figures.map(([n, l]) => `<div><b>${n}</b><span>${l}</span></div>`).join("")}</div>` : ""}</header>`;
const sectionHead = (title, more) => `<div class="section-head"><h2>${title}</h2>${more || ""}</div>`;

// ---------- sidebar ----------
function renderNav(active){
  const nReading = BOOKS.filter(isReading).length, left = WISH.filter(w => !GOT[w.id]).length;
  const link = (href, icon, text, n) => `<a href="${href}" class="${active === href ? "on" : ""}">${icon}${text}${n != null ? `<span class="n">${n}</span>` : ""}</a>`;
  document.getElementById("nav").innerHTML = `
    <div class="nav-group"><span class="label">Library</span>
      ${link("#home", ic("home"), "Home")}
      ${link("#reading", ic("bookmark"), "Reading", nReading || null)}
      ${link("#to-buy", ic("shopping-bag"), "To buy", left)}
      ${link("#authors", ic("users"), "Authors", AUTHORS.length)}
      ${link("#stats", ic("chart"), "Stats")}
    </div>
    <div class="nav-group"><span class="label">Shelves</span>
      ${SHELVES.filter(s => s.books.length).map(s => link("#shelf-" + s.id, `<span class="dot" style="--c:${s.color}"></span>`, esc(s.name), s.books.length)).join("")}
    </div>`;
}

// ---------- pages ----------
function pageHome(){
  const now = BOOKS.filter(isReading), recent = [...BOOKS].sort((a, b) => (b.added || "").localeCompare(a.added || "")).slice(0, 12);
  const fan = s => { const withCover = s.books.filter(b => b.cover), pick = (withCover.length >= 3 ? withCover : s.books).slice(0, 3); return pick.map(b => cover(b)).join(""); };
  return hero({kicker: "Home library", title: "Jemma’s <em>Library</em>",
      text: `Every book on the shelves at home, ${plural(SHELVES.filter(s => s.books.length && s.libib).length, "shelf", "shelves")} of them, brought over from Libib on 18 October 2026.`,
      figures: [[num(BOOKS.length), "books"], [num(AUTHORS.length), "authors"], [num(BOOKS.filter(isRead).length), "read"], [num(WISH.length), "on the to-buy list"]]})
    + (now.length ? sectionHead("Reading <em>now</em>", `<a class="more" href="#reading">All reading</a>`) + grid(now, "row") : "")
    + sectionHead("The <em>shelves</em>")
    + `<div class="shelves">${SHELVES.filter(s => s.books.length).map(s => `<a class="shelf-card" href="#shelf-${s.id}" style="--c:${s.color}"><div class="fan">${fan(s)}</div>
        <div class="txt"><h3>${esc(s.name)}</h3><span>${plural(s.books.length, "book")}</span></div></a>`).join("")}</div>`
    + sectionHead("Recently <em>added</em>") + grid(recent, "row");
}

let shelfView = {filter: "all", sort: "title"};
const SORTS = {
  title: ["Title A–Z", (a, b) => a.sortTitle.localeCompare(b.sortTitle)],
  author: ["Author", (a, b) => a.sortAuthor.localeCompare(b.sortAuthor) || a.sortTitle.localeCompare(b.sortTitle)],
  added: ["Recently added", (a, b) => (b.added || "").localeCompare(a.added || "")],
  old: ["Oldest first", (a, b) => (a.published || "9999").localeCompare(b.published || "9999")],
  new: ["Newest first", (a, b) => (b.published || "").localeCompare(a.published || "")],
};
const FILTERS = {all: ["All", () => true], unread: ["Not read", b => !reading(b).status], reading: ["Reading", isReading], read: ["Read", isRead]};

function shelfBooks(list){
  const f = FILTERS[shelfView.filter][1], shown = list.filter(f).sort(SORTS[shelfView.sort][1]);
  const view = store.get(VIEW_KEY, "covers");
  return `<div class="toolbar" id="toolbar">
      <div class="chips">${Object.entries(FILTERS).map(([k, [l]]) => `<button type="button" data-filter="${k}" class="${shelfView.filter === k ? "on" : ""}">${l}</button>`).join("")}</div>
      <select id="sort" aria-label="Sort by">${Object.entries(SORTS).map(([k, [l]]) => `<option value="${k}"${shelfView.sort === k ? " selected" : ""}>${l}</option>`).join("")}</select>
      <div class="views"><button type="button" data-view="covers" class="${view === "covers" ? "on" : ""}" aria-label="Covers">${ic("grid")}</button><button type="button" data-view="list" class="${view === "list" ? "on" : ""}" aria-label="List">${ic("list")}</button></div>
      <span class="count">${plural(shown.length, "book")}</span>
    </div>` + (shown.length ? (view === "list" ? listView(shown) : grid(shown)) : `<p class="empty">Nothing here yet.</p>`);
}
let currentList = [];
function pageShelf(s){
  currentList = s.books;
  const authors = new Set(s.books.map(b => b.by)).size, pages = s.books.reduce((n, b) => n + (b.pages || 0), 0);
  return hero({kicker: `<a href="#home">Shelf</a>`, title: esc(s.name), color: s.color, text: s.note ? esc(s.note) : "",
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
function pageBook(b){
  const s = shelfIndex[b.shelf], others = (editions[norm(b.title) + "|" + norm(b.surname || "")] || []).filter(x => x !== b);
  const lead = (b.authors || []).find(a => !a.role), au = lead && authorIndex[slug(lead.name)];
  const more = au ? au.books.map(x => x.book).filter(x => x !== b && !others.includes(x)).slice(0, 12) : [];
  const fact = (k, v) => v ? `<dt>${k}</dt><dd>${v}</dd>` : "";
  return `<header class="hero book-hero" style="--c:${s.color}"><div class="book-top">${cover(b, "", true)}<div>
      <div class="kicker"><i></i><a class="label" href="#shelf-${s.id}">${esc(s.name)}</a></div>
      <h1>${esc(b.t)}</h1>${b.sub ? `<div class="sub">${esc(b.sub)}</div>` : ""}
      <div class="authors">${(b.authors || []).map(a => `<span><a href="#a-${slug(a.name)}">${esc(a.name)}</a>${a.role ? ` <small>${esc(a.role)}</small>` : ""}</span>`).join("") || "<span>Unknown author</span>"}</div>
    </div></div></header>
    <div class="book-body"><div>
      <p class="desc${b.description ? "" : " none"}">${b.description ? esc(b.description) : "No description on Libib."}</p>
      ${others.length ? sectionHead(`Other copies <em>you own</em>`) + grid(others) : ""}
      ${more.length ? sectionHead(`More by <em>${esc(au.name)}</em>`, au.books.length > more.length + 1 ? `<a class="more" href="#a-${au.id}">All ${au.books.length}</a>` : "") + grid(more) : ""}
    </div><aside style="display:grid;gap:18px">
      ${readingPanel(b)}
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
  return hero({kicker: "Browse", title: "The <em>authors</em>", text: "Everyone with a name on a book here, illustrators and translators included, by surname.",
      figures: [[num(AUTHORS.length), "people"], [num(AUTHORS.filter(a => a.books.length > 1).length), "with more than one book"]]})
    + `<div class="letters">${letters.map(L => `<a href="#authors" data-jump="az-${L}">${L}</a>`).join("")}</div>`
    + letters.map(L => `<section class="az" id="az-${L}"><h2>${L}</h2><ul>${groups[L].map(a => `<li><a href="#a-${a.id}">${esc(a.name)}</a><span>${a.books.length}</span></li>`).join("")}</ul></section>`).join("");
}
function pageAuthor(a){
  const list = a.books.map(x => x.book).sort((x, y) => (x.published || "9999").localeCompare(y.published || "9999"));
  const roles = [...new Set(a.books.map(x => x.role).filter(Boolean))];
  return hero({kicker: `<a href="#authors">Author</a>`, title: esc(a.name), text: roles.length ? `Also credited as ${esc(roles.join(", ").toLowerCase())}.` : "",
      figures: [[num(list.length), list.length === 1 ? "book" : "books"], [num(list.filter(isRead).length), "read"], [num(new Set(list.map(b => b.shelf)).size), "shelves"]]})
    + sectionHead("Their <em>books</em>", `<span class="more">Oldest first</span>`)
    + `<div class="books">${a.books.slice().sort((x, y) => (x.book.published || "9999").localeCompare(y.book.published || "9999")).map(x => card(x.book, x.role ? x.role : year(x.book.published) || x.book.by)).join("")}</div>`;
}

function pageReading(){
  const now = BOOKS.filter(isReading), done = BOOKS.filter(isRead).sort((a, b) => (reading(b).finished || "").localeCompare(reading(a).finished || ""));
  const thisYear = String(new Date().getFullYear()), yearDone = done.filter(b => year(reading(b).finished) === thisYear);
  return hero({kicker: "Your reading", title: "Reading <em>log</em>", text: "Mark a book as reading or read on its own page; it shows up here.",
      figures: [[num(now.length), "reading now"], [num(done.length), "read"], [num(yearDone.length), `finished in ${thisYear}`], [num(done.reduce((n, b) => n + (b.pages || 0), 0)), "pages read"]]})
    + sectionHead("Reading <em>now</em>") + (now.length ? grid(now) : `<p class="empty">Nothing on the go.</p>`)
    + sectionHead("Finished") + (done.length ? grid(done) : `<p class="empty">Nothing marked as read yet. Libib didn’t have any of this, so it starts here.</p>`)
    + `<div class="note">${ic("info")}<div><b>Your marks are saved in this browser only</b> while this is a prototype. Save a backup now and then so nothing is lost.
        <div class="backup"><button class="btn" type="button" id="saveBackup">${ic("download")}Save a backup</button>
        <label class="btn">${ic("upload")}Load a backup<input type="file" id="loadBackup" accept=".json,application/json" hidden></label></div></div></div>`;
}

function pageToBuy(){
  const got = WISH.filter(w => GOT[w.id]).length;
  const list = [...WISH].sort((a, b) => a.sortAuthor.localeCompare(b.sortAuthor) || a.sortTitle.localeCompare(b.sortTitle));
  return hero({kicker: "On the lookout", title: "To <em>buy</em>", text: "Books to look out for. Tick one off when you find it.",
      figures: [[num(WISH.length - got), "still to find"], [num(got), "found"]]})
    + `<div class="wish">${list.map(w => `<div class="wish-item${GOT[w.id] ? " got" : ""}">${cover(w)}<div><h3>${esc(w.t)}</h3>${w.sub ? `<div class="by">${esc(w.sub)}</div>` : ""}<div class="by">${esc(w.by)}</div>
        ${w.maybeOwned ? `<a class="flag" href="#b-${w.maybeOwned[0]}">${ic("info")}Already on a shelf?</a>` : ""}</div>
        <button type="button" class="tick${GOT[w.id] ? " on" : ""}" data-got="${w.id}" aria-label="Found it" aria-pressed="${!!GOT[w.id]}">${ic("check")}</button></div>`).join("")}</div>`;
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
  const readN = BOOKS.filter(isRead).length;
  return hero({kicker: "The numbers", title: "<em>Stats</em>", text: "How the library adds up."})
    + `<div class="ledger"><div class="ledger-grid">
        <div class="meter"><b>${num(BOOKS.length)}</b><span>books on the shelves</span></div>
        <div class="meter"><b>${num(pages)}</b><span>pages (${num(withPages.length)} books with a page count)</span></div>
        <div class="meter"><b>${num(Math.round(pages / (withPages.length || 1)))}</b><span>pages in an average book</span></div>
        <div class="meter"><b>${Math.round(readN / BOOKS.length * 100)}%</b><span>read (${plural(readN, "book")})</span></div>
      </div></div>`
    + sectionHead("By <em>shelf</em>") + bars(shelves, shelves[0].n)
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
  return `<div class="section-head" style="margin-top:56px"><h2>Results for <em>‘${esc(term)}’</em></h2><span class="more">${plural(books.length, "book")}</span></div>`
    + (authors.length ? `<div class="chips" style="margin-bottom:28px">${authors.slice(0, 20).map(a => `<a class="btn" href="#a-${a.id}">${ic("user")}${esc(a.name)} · ${a.books.length}</a>`).join("")}</div>` : "")
    + (books.length ? grid(books) : `<p class="empty">No books match.</p>`)
    + (wish.length ? sectionHead("On the <em>to-buy list</em>") + `<div class="books">${wish.map(w => `<a class="bk" href="#to-buy">${cover(w)}<h3>${esc(w.t)}</h3><div class="by">${esc(w.by)}</div></a>`).join("")}</div>` : "");
}
q.addEventListener("input", () => { const v = q.value.trim(); if (v.length >= 2) { document.getElementById("view").innerHTML = pageSearch(v); scrollTo(0, 0); } else if (!v) route(); });
q.addEventListener("keydown", e => { if (e.key === "Escape") { q.value = ""; route(); } });
document.getElementById("nav").addEventListener("click", () => { if (q.value) q.value = ""; });

// ---------- routing ----------
function route(){
  const key = location.hash.slice(1) || "home", view = document.getElementById("view");
  let html, active = "#" + key, title = "Jemma’s Library";
  if (key.startsWith("shelf-") && shelfIndex[key.slice(6)]) { shelfView = {filter: "all", sort: "title"}; const s = shelfIndex[key.slice(6)]; html = pageShelf(s); title = s.name; }
  else if (key.startsWith("b-") && bookIndex[key.slice(2)]) { const b = bookIndex[key.slice(2)]; html = pageBook(b); active = "#shelf-" + b.shelf; title = b.t; }
  else if (key.startsWith("a-") && authorIndex[key.slice(2)]) { const a = authorIndex[key.slice(2)]; html = pageAuthor(a); active = "#authors"; title = a.name; }
  else html = {authors: pageAuthors, reading: pageReading, "to-buy": pageToBuy, stats: pageStats}[key]?.() || (active = "#home", pageHome());
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
document.addEventListener("change", e => {
  const t = e.target;
  if (t.id === "sort") { shelfView.sort = t.value; document.getElementById("shelfBooks").innerHTML = shelfBooks(currentList); }
  else if (t.dataset.date) setReading(location.hash.slice(3), {[t.dataset.date]: t.value});
  else if (t.id === "loadBackup" && t.files[0]) t.files[0].text().then(txt => {
    try { const d = JSON.parse(txt); READ = d.reading || {}; GOT = d.found || {}; saveRead(); store.set(GOT_KEY, GOT); route(); }
    catch { alert("That file isn’t a library backup."); }
  });
});

route();
