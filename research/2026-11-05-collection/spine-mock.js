// TEMPORARY mock-up (6 Nov): improvements to the old books' shelves, applied to the page as it is. Removed after.
window.SPINE_MOCK = async function(opts){
  const list = [...document.querySelectorAll('.bookshelf a.spine')];
  // the series number and first editions, from the page's own data
  const num = new Map(), firsts = new Set();
  SERIES.forEach(s => s.entries.forEach((e, i) => e.owned.forEach(b => { if (!num.has(b.id)) num.set(b.id, i + 1); })));
  BOOKS.forEach(b => { if (/first edition/i.test(b.description || "") && !/reprint|\?/i.test(b.description || "")) firsts.add(b.id); });
  const css = document.createElement('style');
  css.textContent = `
    .spine{position:relative}
    .spine .no{position:absolute;bottom:6px;left:0;right:0;text-align:center;font:700 10px var(--body);color:rgba(255,240,200,.9);writing-mode:horizontal-tb;transform:none}
    .spine .ed{position:absolute;top:5px;left:0;right:0;text-align:center;font-size:11px;color:#F2CF6B;writing-mode:horizontal-tb;transform:none;text-shadow:0 0 3px rgba(0,0,0,.6)}
    .spine.gilt span:first-child{color:#EFD38A;letter-spacing:.02em}
    .spine span:first-child{max-height:68%}
    .spine.gap .no{color:var(--muted)}
    .bookshelf.rows{display:block;padding:0;border:0;box-shadow:none;background:none}
    .bookshelf.rows .row{display:flex;align-items:flex-end;gap:3px;padding:18px 18px 0;border-bottom:14px solid #6B4A2B;box-shadow:0 10px 12px -8px rgba(0,0,0,.4);background:linear-gradient(#EFE5D1,#E6D8BD);margin-bottom:6px}
    .spine-card{position:fixed;z-index:50;width:290px;display:grid;grid-template-columns:76px 1fr;gap:12px;padding:12px;border-radius:12px;background:var(--surface);border:1px solid var(--line);box-shadow:0 12px 30px rgba(0,0,0,.25);pointer-events:none;font-size:13px}
    .spine-card img{width:76px;border-radius:2px;box-shadow:0 1px 3px rgba(0,0,0,.3)}.spine-card b{display:block;font:400 18px/1.15 var(--display)}.spine-card dl{margin:6px 0 0;display:grid;grid-template-columns:auto 1fr;gap:1px 8px}.spine-card dt{color:var(--muted);font-weight:700}.spine-card dd{margin:0}`;
  document.head.appendChild(css);
  // main colour: the commonest colour family of the cover, skipping paper-white and deep shadow
  const main = src => new Promise(ok => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = 40; c.height = 60; const g = c.getContext('2d');
    g.drawImage(im, im.width * .06, im.height * .06, im.width * .88, im.height * .88, 0, 0, 40, 60); const d = g.getImageData(0, 0, 40, 60).data, bins = new Map();
    for (let i = 0; i < d.length; i += 4) { const r = d[i], gg = d[i + 1], b = d[i + 2], m = (r + gg + b) / 3; if (m > 225 || Math.max(r, gg, b) < 28) continue;
      const k = (r >> 5) * 64 + (gg >> 5) * 8 + (b >> 5), v = bins.get(k) || [0, 0, 0, 0]; v[0]++; v[1] += r; v[2] += gg; v[3] += b; bins.set(k, v); }
    const best = [...bins.values()].sort((a, b) => b[0] - a[0])[0]; ok(best ? `rgb(${best[1] / best[0] | 0},${best[2] / best[0] | 0},${best[3] / best[0] | 0})` : ""); }; im.onerror = () => ok(""); im.src = src; });
  for (const a of list) {
    const b = bookIndex[a.getAttribute('href').slice(3)]; if (!b) continue;
    if (opts.main && b.cover) { const c = await main(b.cover); if (c) a.style.background = c; }
    if (opts.details) {
      if (num.has(b.id) && a.closest('.bookshelf') !== document.querySelectorAll('.bookshelf')[document.querySelectorAll('.bookshelf').length - 1]) a.insertAdjacentHTML('beforeend', `<span class="no">${num.get(b.id)}</span>`);
      if (firsts.has(b.id)) a.insertAdjacentHTML('beforeend', `<span class="ed">★</span>`);
      a.classList.add('gilt');
    }
  }
  if (opts.details) document.querySelectorAll('.spine.gap').forEach(g => { const t = g.title.split(' · ')[0]; let n = 0;
    SERIES.forEach(s => s.entries.forEach((e, i) => { if (e.title === t) n = i + 1; })); if (n) g.insertAdjacentHTML('beforeend', `<span class="no">${n}</span>`); });
  if (opts.rows) document.querySelectorAll('.bookshelf').forEach(sh => { const kids = [...sh.children], per = Math.floor((sh.clientWidth - 36) / 33);
    if (kids.length <= per) return; sh.classList.add('rows'); sh.innerHTML = '';
    for (let i = 0; i < kids.length; i += per) { const r = document.createElement('div'); r.className = 'row'; kids.slice(i, i + per).forEach(k => r.appendChild(k)); sh.appendChild(r); } });
  if (opts.card) {
    const show = (a, x, y) => { const b = bookIndex[a.getAttribute('href').slice(3)]; let c = document.querySelector('.spine-card');
      if (!c) { c = document.createElement('div'); c.className = 'spine-card'; document.body.appendChild(c); }
      const note = (b.description || "").length < 90 ? b.description || "" : "";
      c.innerHTML = `${b.cover ? `<img src="${b.cover}">` : "<div></div>"}<div><b>${esc(b.t)}</b><div style="color:var(--muted)">${esc(b.by)}</div><dl><dt>Year</dt><dd>${year(b.published) || "Undated"}</dd><dt>Edition</dt><dd>${esc(note) || "—"}</dd><dt>Condition</dt><dd>${esc(b.condition || "") || "—"}</dd></dl></div>`;
      c.style.left = (x + 18) + 'px'; c.style.top = Math.max(10, y - 60) + 'px'; };
    window.SPINE_SHOW = show;
    document.addEventListener('mouseover', e => { const a = e.target.closest('a.spine'); if (a) show(a, e.clientX, e.clientY); else document.querySelector('.spine-card')?.remove(); });
  }
  return list.length;
};
