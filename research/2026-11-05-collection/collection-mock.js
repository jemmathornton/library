// TEMPORARY mock-ups for her to choose from (overnight 5-6 Nov); removed before committing. Each function fills the page.
(function(){
  const C = "old-book-collection", S = shelfIndex[C], ALL = S.books;
  const yr = b => year(b.published) || "";
  const note = b => (b.description || "").length < 90 ? (b.description || "") : "";
  const first = b => /first edition/i.test(note(b)) && !/reprint|\?/i.test(note(b));
  const ser = new Map();
  SERIES.forEach(se => se.entries.forEach((e, n) => e.owned.forEach(b => { if (b.shelf === C && !ser.has(b)) ser.set(b, {s: se, n}); })));
  const series = SERIES.filter(se => se.entries.some(e => e.owned.some(b => b.shelf === C))).map(se => {
    const mine = se.entries.map(e => e.owned.filter(b => b.shelf === C));
    const authors = new Set(mine.flat().map(b => b.by)), byOf = e => (e.owned[0] || e.wish[0] || {}).by;
    const slots = se.entries.map((e, i) => ({e, n: i + 1, have: mine[i], want: e.wish.some(w => w.old)})).filter(x => x.have.length || !byOf(x.e) || authors.has(byOf(x.e)));
    return {se, slots, have: slots.filter(x => x.have.length).length};
  }).sort((a, b) => a.se.name.localeCompare(b.se.name));
  const loose = ALL.filter(b => !ser.has(b)).sort(SORTS.author[1]);
  const wanted = series.flatMap(x => x.slots.filter(s => !s.have.length).map(s => ({...s, series: x.se.name})));
  const spine = (b, h = 150) => `<div class="mk-sp" title="${esc(b.t)}" style="height:${h}px;background:${b.cloth || "#7a6650"}"><span>${esc(b.t)}</span></div>`;
  const ghost = (t, h = 150) => `<div class="mk-sp ghost" title="${esc(t)}" style="height:${h}px"><span>${esc(t)}</span></div>`;
  const css = `<style>
  .mk-tabs{display:flex;gap:6px;margin:26px 0 8px;border-bottom:1px solid var(--line)}.mk-tabs a{padding:10px 16px;font-weight:700;font-size:14px;color:var(--muted);text-decoration:none;border-bottom:3px solid transparent;margin-bottom:-1px}.mk-tabs a.on{color:var(--ink);border-color:var(--brass)}
  .mk-sp{width:30px;border-radius:2px 3px 2px 2px;box-shadow:inset 4px 0 0 rgba(0,0,0,.22),inset -2px 0 0 rgba(255,255,255,.12),0 2px 3px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;flex:none;position:relative;overflow:hidden}
  .mk-sp span{writing-mode:vertical-rl;text-orientation:sideways;transform:rotate(180deg);font:400 12.5px/1 var(--display);color:#fff8ea;text-shadow:0 1px 2px rgba(0,0,0,.6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-height:92%}
  .mk-sp.ghost{background:repeating-linear-gradient(45deg,transparent 0 6px,rgba(140,106,63,.12) 6px 7px);border:1.5px dashed rgba(140,106,63,.55);box-shadow:none}.mk-sp.ghost span{color:var(--muted);text-shadow:none}
  .mk-shelf{display:flex;align-items:flex-end;gap:3px;padding:18px 18px 0;border-bottom:14px solid #6b4a2b;border-radius:2px;box-shadow:0 10px 12px -8px rgba(0,0,0,.4);background:linear-gradient(#efe5d1,#e6d8bd);flex-wrap:wrap;row-gap:0}
  .mk-gap{width:14px}
  .mk-h{font:700 11px var(--body);letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin:26px 0 10px}
  .mk-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}
  .mk-card{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:18px}
  .mk-card h3{font:400 24px/1.1 var(--display);margin:0 0 4px}.mk-card .by{font-size:13px;color:var(--muted)}
  .mk-bar{height:8px;border-radius:9px;background:var(--soft);overflow:hidden;margin:12px 0 6px}.mk-bar i{display:block;height:100%;background:var(--brass)}
  .mk-mini{display:flex;flex-wrap:wrap;gap:3px 2px;align-items:flex-end;margin-top:12px}.mk-mini .mk-sp{width:20px}.mk-mini .mk-sp span{font-size:10px}
  .mk-figs{display:flex;gap:34px;margin:6px 0 4px}.mk-figs b{display:block;font:400 40px/1 var(--display)}.mk-figs span{font-size:13px;color:var(--muted)}
  .mk-check{columns:2;column-gap:40px;font-size:14px}.mk-check section{break-inside:avoid;margin-bottom:18px}.mk-check h4{font:400 20px var(--display);margin:0 0 6px;padding-bottom:4px;border-bottom:1px solid var(--line)}
  .mk-check div{display:grid;grid-template-columns:22px 1fr auto;gap:8px;padding:3px 0;align-items:baseline}.mk-check .y{color:var(--done);font-weight:700}.mk-check .n{color:#a05040;font-weight:700}.mk-check em{font-style:normal;color:var(--muted);font-size:12.5px}
  .mk-search{width:100%;padding:14px 18px;font-size:17px;border:1px solid var(--line);border-radius:14px;background:var(--surface);margin:8px 0 20px}
  .mk-entry{display:grid;grid-template-columns:300px minmax(0,1fr);gap:40px;margin-top:20px}.mk-entry p{font-size:16px;line-height:1.7;margin:0 0 14px}
  .mk-dl{display:grid;grid-template-columns:170px 1fr;gap:10px 18px;font-size:14.5px;margin-top:10px}.mk-dl dt{color:var(--muted);font-weight:700}.mk-dl dd{margin:0}.mk-dl .empty{color:var(--muted);font-style:italic}
  .mk-photos{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}.mk-photos div{aspect-ratio:3/4;border:1.5px dashed var(--line);border-radius:8px;display:grid;place-items:center;font-size:12px;color:var(--muted);text-align:center;padding:6px}
  .mk-tl{display:grid;grid-template-columns:90px 1fr;gap:0 16px;align-items:end}.mk-tl .dec{font:400 22px var(--display);color:var(--muted);padding-bottom:18px;border-bottom:14px solid transparent}
  .mk-pill{display:inline-block;padding:2px 9px;border-radius:99px;font-size:11.5px;font-weight:700;background:color-mix(in srgb,var(--brass) 25%,transparent);color:var(--done);margin-left:6px;vertical-align:middle}
  </style>`;
  const tabs = on => `<div class="mk-tabs">${["Overview", "Shelf", "Ledger", "Series", "To find", "Checklist"].map(t => `<a href="javascript:void 0" class="${t === on ? "on" : ""}">${t}</a>`).join("")}</div>`;
  const hero = (k, t, txt) => `<header class="hero" style="--c:#8C6A3F"><div class="kicker"><i></i>${k}</div><h1>${t}</h1>${txt ? `<p>${txt}</p>` : ""}
    <div class="mk-figs" style="margin-top:22px;color:var(--on-deep)"><div><b>${ALL.length}</b><span style="color:var(--on-deep-mute)">old books</span></div><div><b>${series.length}</b><span style="color:var(--on-deep-mute)">series</span></div>
    <div><b>${Math.min(...ALL.map(b => +yr(b) || 9999))}</b><span style="color:var(--on-deep-mute)">oldest dated</span></div><div><b>${ALL.filter(first).length}</b><span style="color:var(--on-deep-mute)">first editions</span></div><div><b>${wanted.filter(w => w.want).length}</b><span style="color:var(--on-deep-mute)">on your list to find</span></div></div></header>`;
  const page = html => { document.getElementById("view").innerHTML = css + html; scrollTo(0, 0); };
  window.MK = {
    overview(){ page(hero("Collection", "Old <em>books</em>", "") + tabs("Overview")
      + `<div class="mk-h">Series</div><div class="mk-grid">${series.map(x => `<div class="mk-card"><h3>${esc(x.se.name)}</h3><div class="by">${x.have} of ${x.slots.length} in old copies</div>
        <div class="mk-mini">${x.slots.map(s => s.have.length ? spine(s.have[0], 70) : ghost(s.e.title, 70)).join("")}</div></div>`).join("")}</div>
      <div class="mk-h">Not in a series</div><div class="mk-shelf">${loose.map(b => spine(b, 130)).join("")}</div>`); },
    shelf(){ page(hero("Collection", "Old <em>books</em>", "") + tabs("Shelf")
      + series.map(x => `<div class="mk-h">${esc(x.se.name)}</div><div class="mk-shelf">${x.slots.map(s => s.have.length ? s.have.map(b => spine(b)).join("") : ghost(s.e.title)).join("")}</div>`).join("")
      + `<div class="mk-h">Not in a series</div><div class="mk-shelf">${loose.map(b => spine(b)).join("")}</div>`); },
    series(name){ const x = series.find(s => s.se.name === name) || series[0];
      page(hero("Collection · Series", esc(x.se.name), "") + tabs("Series")
      + `<div class="mk-figs" style="margin:18px 0"><div><b>${x.have}</b><span>in old copies</span></div><div><b>${x.slots.length - x.have}</b><span>still to find</span></div></div>
        <table class="oldbooks"><tr><th>No.</th><th></th><th>Title</th><th>Your copy</th><th>Edition (your notes)</th><th>Condition</th></tr>
        ${x.slots.map(s => s.have.length ? s.have.map(b => `<tr><td>${s.n}</td><td>${b.cloth ? `<span class="chip" style="background:${b.cloth}"></span>` : `<span class="chip none"></span>`}</td><td class="t">${esc(b.t)}${first(b) ? `<span class="mk-pill">First edition</span>` : ""}</td><td>${yr(b) || "Undated"}</td><td class="m">${esc(note(b)) || "—"}</td><td class="m">${esc(b.condition || "") || "—"}</td></tr>`).join("")
          : `<tr class="gone"><td>${s.n}</td><td><span class="chip none"></span></td><td class="t">${esc(s.e.title)}</td><td></td><td class="m">${s.want ? "On your list to find" : ""}</td><td></td></tr>`).join("")}</table>`); },
    tofind(){ page(hero("Collection", "Old books <em>to find</em>", "") + tabs("To find")
      + series.filter(x => x.slots.some(s => !s.have.length)).map(x => `<div class="mk-h">${esc(x.se.name)} · ${x.slots.length - x.have} to find</div>
        <div class="mk-shelf">${x.slots.map(s => s.have.length ? s.have.slice(0, 1).map(b => spine(b, 110)).join("") : ghost(s.e.title, 110)).join("")}</div>`).join("")); },
    checklist(){ page(`<div style="margin-top:40px"><h1 style="font:400 44px var(--display);margin:0">Old books · <em>shop checklist</em></h1><p style="color:var(--muted)">Ticks you have (with your copy's year and notes, so you can spot an earlier printing); crosses still to find.</p></div>`
      + `<input class="mk-search" placeholder="Type a title to see if you have it…">`
      + `<div class="mk-check">${series.map(x => `<section><h4>${esc(x.se.name)}</h4>${x.slots.map(s => s.have.length ? `<div><span class="y">✓</span><span>${s.n}. ${esc(s.have[0].t)}</span><em>${yr(s.have[0]) || "undated"}${note(s.have[0]) && !/^undated$/i.test(note(s.have[0])) ? ", " + esc(note(s.have[0])).toLowerCase() : ""}</em></div>`
          : `<div><span class="n">✗</span><span>${s.n}. ${esc(s.e.title)}</span><em>${s.want ? "on your list" : ""}</em></div>`).join("")}</section>`).join("")}</div>`); },
    entry(id){ const b = bookIndex[id] || ALL.find(first);
      page(`<header class="hero book-hero" style="--c:#8C6A3F"><div class="book-top">${cover(b, "", true)}<div><div class="kicker"><i></i><span class="label">Collection</span></div><h1>${esc(b.t)}</h1><div class="by" style="font-size:18px">${esc(b.by)}</div></div></div></header>`
      + `<div class="mk-entry"><div><div class="mk-h" style="margin-top:0">Photos of your copy</div><div class="mk-photos"><div>Cover</div><div>Spine</div><div>Inscription</div></div></div>
        <div><div class="mk-h" style="margin-top:0">Catalogue entry</div>
        <p><b>${esc(b.t)}</b>. ${esc(b.by)}. ${b.publisher ? esc(b.publisher) + ", " : ""}${yr(b) || "n.d."}. ${esc(note(b))}</p>
        <dl class="mk-dl"><dt>Year</dt><dd>${yr(b) || "Undated"}</dd><dt>Edition / impression</dt><dd>${esc(note(b)) || "—"}</dd>
        <dt>Publisher</dt><dd class="empty">not set</dd><dt>Binding</dt><dd class="empty">not set (e.g. red cloth, gilt lettering)</dd>
        <dt>Dust jacket</dt><dd class="empty">not set (none, or its own condition)</dd><dt>Condition</dt><dd>${esc(b.condition || "") || `<span class="empty">not set</span>`}</dd>
        <dt>Inscription</dt><dd class="empty">not set (gift note, owner's name, school prize label, bookplate)</dd>
        <dt>Series</dt><dd>${ser.get(b) ? esc(ser.get(b).s.name) + ", book " + (ser.get(b).n + 1) : "—"}</dd></dl></div></div>`); },
    timeline(){ const dated = ALL.filter(b => yr(b)).sort((a, b) => yr(a) - yr(b));
      let last = 0, html = "";
      dated.forEach(b => { const d = Math.floor(yr(b) / 10) * 10; if (d !== last) { html += `<div class="mk-dec"><span>${d}s</span></div>`; last = d; } html += spine(b, 150); });
      page(hero("Collection", "Old <em>books</em>", "") + tabs("Shelf") + `<style>.mk-dec{width:34px;height:170px;display:flex;align-items:flex-end;justify-content:center;border-left:1px solid rgba(107,74,43,.35);margin-left:8px}.mk-dec span{writing-mode:vertical-rl;transform:rotate(180deg);font:400 20px var(--display);color:var(--done);padding-bottom:8px}</style>
        <div class="mk-h">In the order they were printed</div><div class="mk-shelf">${html}</div>
        <div class="mk-h">Undated</div><div class="mk-shelf">${ALL.filter(b => !yr(b)).map(b => spine(b, 150)).join("")}</div>`); },
  };
})();
