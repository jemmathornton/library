"""Assemble the research results into ready-to-apply proposal files (reads HomeLibrary, writes only to research/ready)."""
import json, os, re, shutil
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont

SP = r'C:\Users\Jemma\AppData\Local\Temp\claude\C--Users-Jemma-Documents-SimTracker--claude-worktrees-libib-data-extraction-6386aa\685a58b9-e30d-4ad0-8d37-bec5690d9700\scratchpad'
R = os.path.join(SP, 'research')
OUT = os.path.join(R, 'ready')
HL = r'C:\Users\Jemma\Documents\HomeLibrary'
H = os.path.join(HL, 'data')
SITE_COVERS = os.path.join(HL, 'site', 'covers')
os.makedirs(os.path.join(OUT, 'covers'), exist_ok=True)
for f in os.listdir(os.path.join(OUT, 'covers')):
    os.remove(os.path.join(OUT, 'covers', f))


def load(p):
    return json.load(open(p, encoding='utf-8'))


def dump(name, obj):
    with open(os.path.join(OUT, name), 'w', encoding='utf-8', newline='\n') as fh:
        json.dump(obj, fh, ensure_ascii=False, indent=1)
        fh.write('\n')


books = load(os.path.join(H, 'books.json')) + load(os.path.join(H, 'added.json'))
TFIX = load(os.path.join(H, 'name-fixes.json')).get('titles', {})
for b in books:
    b['title'] = TFIX.get(b['title'], b['title'])
byid = {b['id']: b for b in books}
wish = load(os.path.join(H, 'to-buy.json'))
wishid = {w['id']: w for w in wish}
covers_json = load(os.path.join(H, 'covers.json'))
no_cover = {x['id'] for x in load(os.path.join(H, 'no-cover.json'))['books']}
readme = {}   # section -> list of lines


def line(section, text):
    readme.setdefault(section, []).append(text)


def cover_key(b):
    """The key tools/build.py uses for a book's cover."""
    isbn = b.get('isbn13') or ''
    if isbn and (covers_json.get(isbn) or os.path.exists(os.path.join(SITE_COVERS, isbn + '.jpg'))):
        return isbn
    return 'id-' + str(b['id'])


def clean(t):
    t = re.sub(r'\*\*?', '', t).strip()
    return t


# ---------------------------------------------------------------- descriptions
SKIP = {'Carpe Jugulum', 'Wintersmith', 'Harry Potter and the Goblet of Fire', 'Secret Seven Mystery', 'Secret Seven Fireworks'}
desc = {'_about': 'Descriptions that replace Libib\'s (seller notes, empty or wrong ones): book id -> text, word for word from the source named in research/ready/README.txt. To be applied by tools/build.py over books.json.'}
for x in load(os.path.join(R, 'blurbs.json')):
    if not x['found']:
        continue
    src, text = x['found'][0][0], x['found'][0][1]
    if any(s.lower() in x['title'].lower() for s in SKIP):
        line('Descriptions skipped', f"{x['title']}: Open Library text is an encyclopaedia-style summary, not a blurb")
        continue
    if x['id'] == 'badmwepcho':
        line('Descriptions skipped', "The Call (Zangwill): Open Library text describes a different (scholarly) edition, not her Persephone copy")
        continue
    desc[x['id']] = clean(text)
    now = (x['now'] or '').strip()
    why = 'was empty' if not now else f'was “{now[:50]}{"…" if len(now) > 50 else ""}”'
    line('Descriptions', f"{byid.get(x['id'], {}).get('title', x['title'])[:60]} ({why}) <- {src}")
for x in load(os.path.join(R, 'blurbs-deep', 'blurbs-deep.json')):
    if not x.get('blurb') or x.get('confidence') not in ('high', 'medium'):
        if x.get('confidence') == 'low' or x.get('blurb'):
            line('Descriptions skipped', f"{x['title']}: low confidence ({x.get('source_url')})")
        else:
            line('Descriptions skipped', f"{x['title']}: no blurb found")
        continue
    if x['id'] in desc:
        continue
    desc[x['id']] = clean(x['blurb'])
    b = byid.get(x['id'], {})
    now = (b.get('description') or '').strip()
    why = 'was empty' if not now else f'was “{now[:50]}{"…" if len(now) > 50 else ""}”'
    line('Descriptions', f"{b.get('title', x['title'])[:60]} ({why}) <- {x['source_url']} [{x['confidence']}]")
dump('description-fixes.json', desc)

# ---------------------------------------------------------------- details
det = {'_about': 'Libib values that are wrong or missing, put right: book id -> {pages, publisher, published}. To be applied by tools/build.py over books.json (unlike data/details.json, which only fills gaps).'}
by_isbn = {}
for b in books:
    if b.get('isbn13'):
        by_isbn.setdefault(b['isbn13'], []).append(b)
for isbn, v in load(os.path.join(R, 'pages.json')).items():
    for b in by_isbn.get(isbn, []):
        ol, now = v.get('openlibrary'), b.get('pages')
        if not ol:
            line('Page counts skipped', f"{b['title'][:50]}: Libib {now}, Open Library has no number")
            continue
        if now and now >= 50 and 0.75 <= ol / now <= 1.33:
            line('Page counts skipped', f"{b['title'][:50]}: Libib {now} is plausible (Open Library {ol})")
            continue
        det.setdefault(b['id'], {})['pages'] = ol
        line('Page counts', f"{b['title'][:50]}: {now} -> {ol} (Open Library)")
MONTHS = {m: i for i, m in enumerate(['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'], 1)}


def iso(d):
    d = d.strip()
    if re.fullmatch(r'\d{4}(-\d\d-\d\d)?', d):
        return d
    m = re.fullmatch(r'([A-Za-z]+)\.? (\d{1,2}),? (\d{4})', d)
    if m and m.group(1)[:3].lower() in MONTHS:
        return f"{m.group(3)}-{MONTHS[m.group(1)[:3].lower()]:02d}-{int(m.group(2)):02d}"
    raise ValueError(d)


for x in load(os.path.join(R, 'details.json')):
    for f, v in x['found'].items():
        val = iso(v) if f == 'published' else v
        det.setdefault(x['id'], {})[f] = val
        line('Published dates (were missing)' if f == 'published' else 'Other details', f"{byid.get(x['id'], {}).get('title', x['title'])[:50]}: {f} {val} (Open Library)")
dump('detail-fixes.json', det)

# ---------------------------------------------------------------- covers
cmap = {}
sheet = []   # (key, title, current path or None, proposed path, label)


def add_cover(key, title, src, frm, reason, section):
    img = Image.open(src)
    img = img.convert('RGB')
    if img.height > 600:
        img = img.resize((round(img.width * 600 / img.height), 600), Image.LANCZOS)
    out = os.path.join(OUT, 'covers', key + '.jpg')
    img.save(out, 'JPEG', quality=86, optimize=True, progressive=True)
    cmap[key] = {'title': title, 'from': frm, 'reason': reason}
    cur = os.path.join(SITE_COVERS, key + '.jpg')
    sheet.append((key, title, cur if os.path.exists(cur) else None, out, section))
    line('Covers: ' + section, f"{key}.jpg  {title[:55]}: {reason}")


ca = {x['isbn13']: x for x in load(os.path.join(R, 'cover-audit', 'cover-audit.json')) if x.get('isbn13')}
for isbn, why in [('9781444979978', None), ('9780140364545', None), ('9781848459229', None), ('9781444715460', None), ('9780216926615', None), ('9780747599876', None)]:
    x = ca[isbn]
    b = byid[x['id']]
    key = cover_key(b)
    add_cover(key, b['title'], os.path.join(R, 'cover-audit', 'isbn', isbn + '.jpg'), 'cover by ISBN ' + isbn + ' (cover-audit)',
              f"current is {x['verdict']}: {x['note']}", 'wrong or poor')
fixc = load(os.path.join(R, 'fixc.json'))
for code, f, label in [('dor', 'dor-1.jpg', 'Doreen'), ('gold', 'gold-2.jpg', 'Goldenhand (hardback)'), ('kill', 'kill-0.jpg', 'How to Kill Men')]:
    key = os.path.splitext(os.path.basename(fixc[code]['ref']))[0]
    n = int(f.split('-')[1][0])
    url = fixc[code]['urls'][n] if n < len(fixc[code]['urls']) else ''
    title = byid.get(key, {}).get('title') or next((b['title'] for b in books if b.get('isbn13') == key), None) or (wishid.get(key[3:], {}).get('title')) or label
    reasons = {'dor': 'current is a square endpaper pattern, not the Persephone grey jacket',
               'gold': 'to-buy hardback: UK hardback jacket instead of an Open Library title-search match',
               'kill': 'better copy of the cover'}
    add_cover(key, title, os.path.join(SP, 'fixc', f), url, reasons[code], 'wrong or poor')

ob_noc = []
for x in load(os.path.join(R, 'old-books', 'old-books.json')):
    if x['confidence'] != 'high' or not x['candidate_files']:
        continue
    b = byid[x['id']]
    key = cover_key(b)
    flags = []
    if x['id'] in no_cover:
        flags.append('needs taking off no-cover.json')
        ob_noc.append(x['id'])
    if x['id'] == '8u1tiscohq':
        flags.append('seller photo at an angle, not a flat scan')
    if 'Malory Towers' in b['title']:
        flags.append('her Malory Towers series rule may say otherwise')
    reason = f"period cover: {x['likely_edition']}" + (f" ({'; '.join(flags)})" if flags else '')
    add_cover(key, b['title'], os.path.join(R, 'old-books', x['candidate_files'][0]), (x['source_urls'] or [''])[0] or 'Enid Blyton Society / AbeBooks (old-books research)', reason, 'old books (period)')

# ---------------------------------------------------------------- to-buy
SERIES_AUTHORS = {'Discworld': ['Terry Pratchett'], 'Alex Rider': ['Anthony Horowitz'], 'Artemis Fowl': ['Eoin Colfer'], 'Bartimaeus': ['Jonathan Stroud'],
                  'Edge Chronicles': ['Paul Stewart', 'Chris Riddell'], 'Pure Dead': ['Debi Gliori'], 'Murderbot': ['Martha Wells'], 'Theodore Boone': ['John Grisham'],
                  'Saga of Larten Crepsley': ['Darren Shan'], 'Traitor Spy': ['Trudi Canavan'], 'Fever Crumb': ['Philip Reeve'], 'Foundation': ['Isaac Asimov'],
                  'Seasonal Quartet': ['Ali Smith'], 'Mortal Engines': ['Philip Reeve'], 'The Old Kingdom': ['Garth Nix'], 'Inheritance Cycle': ['Christopher Paolini'],
                  'Castaways of the Flying Dutchman': ['Brian Jacques'], 'Noughts & Crosses': ['Malorie Blackman']}
TODAY = '2026-10-23'


def slug(t):
    return re.sub(r'[^a-z0-9]+', '-', t.lower().replace('’', '').replace("'", '')).strip('-')


def item(title, authors, isbn=None, note=None, split=None):
    w = {'id': 'buy-' + slug(title), 'title': title, 'authors': [{'name': a} for a in authors],
         'surname': authors[0].split()[-1], 'added': TODAY, 'copies': 1}
    if isbn:
        w['isbn13'] = isbn
    if split:
        w['splitFrom'] = split
    if note:
        w['note'] = note
    return w


adds, updates = [], {}
SPLITS = [('6dwjpg48dt', 'Famous Five', ["Five on Kirrin Island Again", "Five Go Off to Camp", "Five Have a Wonderful Time", "Five Go Down to the Sea", "Five Have Plenty of Fun",
                                          "Five on Finniston Farm", "Five Go to Demon's Rocks", "Five Are Together Again"]),
          ('um17riignz', 'Secret Seven', ["The Secret Seven", "Secret Seven Adventure", "Secret Seven on the Trail", "Good Work Secret Seven", "Three Cheers Secret Seven",
                                           "Secret Seven Mystery", "Puzzle for the Secret Seven", "Shock for the Secret Seven"]),
          ('q7u0vdywe4', 'Adventure', ["The Castle of Adventure", "The Valley of Adventure", "The Sea of Adventure", "The Ship of Adventure", "The Circus of Adventure",
                                        "The River of Adventure"])]
for old, series, titles in SPLITS:
    for t in titles:
        t2 = t.replace("'", '’')
        adds.append(item(f"{t2} (old)", ['Enid Blyton'], split=old))
        line('To buy: split notes', f"{t2} (old)  [from “{wishid[old]['title'][:40]}…”]")
    line('To buy: notes to remove once split', f"{old} “{wishid[old]['title'][:70]}”")

OVERLAP = {'Guards! Guards!': 'akvei6dpsz', 'Men at Arms': '59y4gluv9x', 'Soul Music': 'cpfzj81mmk', 'Feet of Clay': 'tojrmsq93y', 'The Wee Free Men': 'ay4ig65psz',
           'Snuff': '3knwu6warj', 'Raising Steam': '7fz9j4dhd6', "The Shepherd's Crown": '2o6cslhtqt', 'A Darkling Plain': '0b7i4x0dcu',
           'Mortal Engines': 'g3zhrqsbt4', 'Sabriel': '8uiqpq6ohq'}
HARDBACK_ONLY = {'g3zhrqsbt4', '8uiqpq6ohq'}   # her entries say hardback; the gap research found paperbacks
for g in load(os.path.join(R, 'series-gaps', 'gaps.json')):
    if not g.get('isbn13'):
        line('To buy: skipped', f"{g['series']} {g['n']} {g['title']}: {g['note'][:90]}")
        continue
    title = g['title'].replace("'", '’')
    src = os.path.join(R, 'series-gaps', g['cover_file']) if g.get('cover_file') else None
    design = {'yes': 'matches her set', 'partly': 'close to her set', 'no': 'no edition in her set’s design'}[g['matches_design']]
    note = f"{g['publisher']} {g['year']}, {design}. {g['note']}".strip()
    if g['title'] in OVERLAP:
        wid = OVERLAP[g['title']]
        if wid in HARDBACK_ONLY:
            line('To buy: skipped', f"{g['title']}: her entry “{wishid[wid]['title']}” wants a hardback; research found the {g['publisher']} paperback {g['isbn13']}")
            continue
        updates[wid] = {'title': wishid[wid]['title'], 'isbn13': g['isbn13'], 'note': note}
        line('To buy: ISBN for an existing entry', f"{wishid[wid]['title']} <- {g['isbn13']} ({g['publisher']} {g['year']}, {design})")
        if src and os.path.exists(src):
            add_cover('id-' + wid, wishid[wid]['title'], src, g.get('cover_url') or '', f"to-buy: {g['publisher']} {g['year']} edition ({design})", 'to buy')
        continue
    w = item(title, SERIES_AUTHORS[g['series']], g['isbn13'], note)
    w['series'] = f"{g['series']} {g['n']}"
    adds.append(w)
    line('To buy: new (series gaps)', f"{g['series']} {g['n']}: {title}, {g['isbn13']} ({g['publisher']} {g['year']}, {design})")
    if src and os.path.exists(src):
        add_cover(g['isbn13'], title, src, g.get('cover_url') or '', f"to-buy: {g['series']} {g['n']} ({design})", 'to buy')
assert len({a['id'] for a in adds}) == len(adds)
dump('to-buy-additions.json', adds)
dump('to-buy-updates.json', {'_about': 'Existing to-buy entries: the edition to look for (ISBN of the matching design). Libib re-imports overwrite to-buy.json, so these may belong in a separate file the build applies.', **updates})
dump('covers-map.json', cmap)

# ---------------------------------------------------------------- shelves
SH = {'Adult Fiction': 'adult-fiction', 'Children\'s': 'childrens', 'Science Fiction': 'science-fiction', 'Non-Fiction': 'non-fiction', 'Travel': 'travel',
      'Fantasy': 'fantasy', 'Young Adult': 'young-adult'}
MOVES = [('ob32x9l0an', 'adult-fiction', ['old-book-collection'], 'Adult literary classic (Old Book Collection if it’s an old copy).'),
         ('ls5xdzm7b9', 'childrens', [], 'Children’s legal mystery; no science fiction.'),
         ('u3n6iy8gnz', 'science-fiction', [], 'Classic science fiction.'),
         ('j7z46e4qlq', 'science-fiction', [], 'Science fiction comedy (Hitchhiker’s 2).'),
         ('4jim5zekbx', 'science-fiction', [], 'Gollancz SF; subjects: science fiction, humour.'),
         ('izer0tqlqm', 'science-fiction', [], 'Futuristic city, sci-fi.'),
         ('yw7a2omr71', 'science-fiction', ['childrens', 'fantasy'], 'Space-game story, not Discworld; may be fine kept with Pratchett.'),
         ('9dbekwo6rp', 'non-fiction', [], 'Memoir.'),
         ('4jime59kbx', 'non-fiction', [], 'About bookshop customers (Bythell); not fiction.'),
         ('qhsk608we4', 'non-fiction', ['travel'], 'Memoir of life in Kyoto.'),
         ('yw7av6cr71', 'non-fiction', [], 'Essays about food (its own blurb).'),
         ('3kxu153arj', 'non-fiction', ['travel'], 'Photographs and local history.'),
         ('f2fjo5ve5y', 'travel', [], 'Travel guide; her other Lonely Planet is on Travel.'),
         ('m4rd1x731h', 'childrens', [], 'Children’s book (lower priority).'),
         ('rihpt1exoz', 'childrens', [], 'Children’s book; its own blurb says so (lower priority).'),
         ('kjbvbwiysl', 'childrens', [], 'Middle-grade (lower priority).'),
         ('3kxuzj2arj', 'childrens', [], 'Middle-grade (lower priority).')]
sm = {'_about': 'Proposed shelf moves (audit, 23 Oct), for her to choose: book id -> {title, now, to, or, why}. Once she agrees, "id": "to" goes into data/shelf-moves.json.'}
for bid, to, alts, why in MOVES:
    b = byid[bid]
    sm[bid] = {'title': b['title'], 'now': b['shelf'], 'to': to, **({'or': alts} if alts else {}), 'why': why}
    line('Shelf moves (proposed)', f"{b['title'][:50]}: {b['shelf']} -> {to}{' (or ' + ', '.join(alts) + ')' if alts else ''}")
sm['_leave'] = {'6uc5rng8dt': 'Airman', 'ayjgslapsz': 'Half-Moon Investigations', '2ous4mdtqt': 'The Zombie Survival Guide',
                'note': 'Not fantasy, but kept with the author/genre feel; her call, lowest priority.'}
line('Shelf moves (proposed)', 'Airman, Half-Moon Investigations, The Zombie Survival Guide: not fantasy, but suggested to leave (her call)')
dump('shelf-moves-proposed.json', sm)

# ---------------------------------------------------------------- names
cox = [{'name': 'Pamela Cox'}, {'name': 'Enid Blyton'}]
nfp = {'_about': 'Proposed additions to data/name-fixes.json (same keys). "names" and "books" merge into the existing ones; "ask" needs her answer first.',
       'names': {'J. Salinger': 'J. D. Salinger', 'David R. Lab': 'David R. Lamb', 'Sir Arthur C. Clarke CBE': 'Arthur C. Clarke',
                 'Stephen Donaldson': 'Stephen R. Donaldson', 'Cay Horstmann': 'Cay S. Horstmann', 'DK Eyewitness': 'Dorling Kindersley'},
       'books': {'New Term At Malory Towers': cox, 'Summer Term At Malory Towers': cox, 'Winter Term At Malory Towers': cox, 'Secrets at Malory Towers': cox,
                 'Fun and Games at Malory Towers': cox, 'Goodbye, Malory Towers': cox, "Kitty at St Clare's": cox, "Kitty at St. Clare's": cox,
                 'Invisible Cities': [{'name': 'Italo Calvino'}, {'name': 'William Weaver', 'role': 'Translator'}],
                 'Wild Boar (The Emma Press Novels)': [{'name': 'Hannah Lutz'}, {'name': 'Andy Turner', 'role': 'Translator'}],
                 'The Curse Of The Gloamglozer: The Edge Chronicles': [{'name': 'Paul Stewart'}, {'name': 'Chris Riddell'}]},
       'ask': {'Invasion Day Series': 'Libib has "L. M. Morgan" and "L. C. Morgans"; Open Library has L. C. Morgans. One name: check the cover.',
               'The Flying Sorcerers: More Comic Tales of Fantasy': 'An anthology edited by Peter Haining (not listed); add him as Editor?',
               'Book Two / Book Three of the Travelers': 'Walter Sorrells is listed first, so they file under Sorrells while Book One files under MacHale.',
               'DK Eyewitness': 'Two guides say "DK Eyewitness", three "Dorling Kindersley"; the proposal makes them all Dorling Kindersley (which the existing fixes already use).'}}
for k, v in nfp['names'].items():
    line('Author names (proposed)', f"{k} -> {v}")
for k, v in nfp['books'].items():
    line('Author names (proposed)', f"{k}: " + ', '.join(a['name'] + (f" ({a['role']})" if a.get('role') else '') for a in v))
for k, v in nfp['ask'].items():
    line('Author names (her call)', f"{k}: {v}")
dump('name-fixes-proposed.json', nfp)

# ---------------------------------------------------------------- contact sheet
COLS, TH, TW, LBL, PAD = 4, 210, 150, 58, 14
CW = 2 * TW + 30
try:
    font = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 15)
    small = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 13)
except OSError:
    font = small = ImageFont.load_default()
nrows = -(-len(sheet) // COLS)
sh = Image.new('RGB', (PAD + COLS * (CW + PAD), 46 + nrows * (TH + LBL + PAD)), (250, 245, 235))
d = ImageDraw.Draw(sh)
d.text((PAD, 12), 'Each pair: current (left) | proposed (right).  Grey box = no picture now (title card).', font=font, fill=(60, 40, 20))


def thumb(p):
    im = Image.open(p).convert('RGB')
    im.thumbnail((TW, TH))
    return im


for i, (key, title, cur, new, section) in enumerate(sheet):
    x0 = PAD + (i % COLS) * (CW + PAD)
    y0 = 46 + (i // COLS) * (TH + LBL + PAD)
    if cur:
        im = thumb(cur)
        sh.paste(im, (x0 + TW - im.width, y0 + TH - im.height))
    else:
        d.rectangle((x0 + 30, y0 + 20, x0 + TW, y0 + TH), fill=(225, 220, 210), outline=(150, 120, 90))
        d.text((x0 + 50, y0 + TH // 2), 'title card', font=small, fill=(110, 90, 70))
    im = thumb(new)
    sh.paste(im, (x0 + TW + 30, y0 + TH - im.height))
    d.text((x0 + TW + 8, y0 + TH // 2 - 10), '>', font=font, fill=(140, 90, 40))
    d.text((x0, y0 + TH + 4), title[:42], font=font, fill=(40, 25, 10))
    d.text((x0, y0 + TH + 24), f"{section} · {key}", font=small, fill=(130, 90, 50))
sh.save(os.path.join(OUT, 'covers-before-after.jpg'), quality=84, optimize=True)
print('sheet', sh.size)

# ---------------------------------------------------------------- readme
ORDER = ['Descriptions', 'Descriptions skipped', 'Page counts', 'Published dates (were missing)', 'Other details', 'Page counts skipped',
         'Covers: wrong or poor', 'Covers: old books (period)', 'Covers: to buy', 'To buy: new (series gaps)', 'To buy: split notes',
         'To buy: notes to remove once split', 'To buy: ISBN for an existing entry', 'To buy: skipped', 'Shelf moves (proposed)',
         'Author names (proposed)', 'Author names (her call)']
txt = ['Ready-to-apply proposals for Jemma’s Library (made 23 Oct 2026 from the research folders). Nothing in HomeLibrary was changed.',
       '',
       'Files: description-fixes.json (id -> text, applies over Libib), detail-fixes.json (id -> pages/published, applies over Libib),',
       'covers\\<key>.jpg + covers-map.json (key = isbn13 or id-<id>, as tools/build.py looks them up; drop into site\\covers),',
       'covers-before-after.jpg (current | proposed), to-buy-additions.json (new to-buy items, ids "buy-…"; "splitFrom" = the note it replaces;',
       '"note"/"series" are extra fields), to-buy-updates.json (ISBNs for existing to-buy entries), shelf-moves-proposed.json, name-fixes-proposed.json.',
       'Build changes needed: build.py to read description-fixes.json and detail-fixes.json over Libib; old books with a proposed cover must come off',
       f'no-cover.json ({len(ob_noc)} of them: {", ".join(ob_noc)}); to-buy.json is rewritten by a Libib re-import, so additions may belong in their own file.',
       '']
for s in ORDER + [k for k in readme if k not in ORDER]:
    if s in readme:
        txt.append(f'== {s} ({len(readme[s])})')
        txt += ['- ' + l for l in readme[s]]
        txt.append('')
open(os.path.join(OUT, 'README.txt'), 'w', encoding='utf-8', newline='\r\n').write('\n'.join(txt))
print({s: len(v) for s, v in readme.items()})
print('covers', len(cmap), 'adds', len(adds), 'desc', len(desc) - 1, 'det', len(det) - 1)
