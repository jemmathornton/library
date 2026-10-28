from common import *
TODAY = '2026-10-23'
out = {}
ser = L('series.json')['series']
tobuy = L('to-buy.json')
fixes = {k: v for k, v in L('reading-fixes.json').items() if not k.startswith('_')}
for e in sg:
    if e['title'] in fixes:
        e['status'] = fixes[e['title']]


def bsurs(b):
    return {norm(a['name'].split()[-1]) for a in b.get('authors', []) if a.get('name') and not a.get('role')} | {bsur(b)}


def esurs(e):
    return {norm(a.strip().split()[-1]) for a in re.split(r',\s*', e['authors']) if a.strip()}


def akey(name):
    w = norm(name).split()
    return (w[0][0] + w[-1]) if w else ''


def bkeys(b):
    return {akey(a['name']) for a in b.get('authors', []) if a.get('name') and not a.get('role')}


def ekeys(e):
    return {akey(a) for a in re.split(r',\s*', e['authors']) if a.strip()}


def tmatch(a, b):
    return short(a) == short(b) or difflib.SequenceMatcher(None, short(a), short(b)).ratio() > 0.9


rank = {'read': 5, 'reading': 4, 'paused': 3, 'stopped': 2, 'to-read': 1}
status_of = {}
for e in sg:
    for x in e.get('books', []):
        if rank[e['status']] > rank.get(status_of.get(x), 0):
            status_of[x] = e['status']

# ---- series map
series_rows = []
for s in ser:
    sa = {norm(x.split()[-1]) for x in s['author'].split('|')}
    for pos, t in enumerate(s['books'], 1):
        alts = t.split('|')
        own = [b for b in owned if any(tmatch(a, b['title']) for a in alts) and (bsurs(b) & sa)]
        oid = {b['id'] for b in own}
        ents = [e for e in sg if (any(tmatch(a, e['title']) for a in alts) and esurs(e) & sa) or any(x in oid for x in e.get('books', []))]
        st = max([e['status'] for e in ents], key=lambda z: rank[z], default=None)
        series_rows.append(dict(series=s['name'], pos=pos, title=alts[0], owned=sorted(oid), status=st, sg=[e['title'] for e in ents]))
by_series = collections.defaultdict(list)
for r in series_rows:
    by_series[r['series']].append(r)
out['series_map'] = series_rows

# ---- 1. unlinked SG -> possible owned
c1 = [dict(storygraph='Harry Potter Series Box Set (J.K. Rowling)', status='read',
           owned='her Harry Potter 1-7 copies (already linked through their single-book entries)', confidence='high',
           note='Box-set entry for the same reads; duplicates the single-book entries rather than a missing link.')]
for e in sg:
    if e.get('books'):
        continue
    st = short(e['title']); su = esurs(e)
    for b in owned:
        if b['id'] in linked:
            continue
        r = difflib.SequenceMatcher(None, st, short(b['title'])).ratio()
        if (bsurs(b) & su and r > 0.6) or r > 0.85:
            c1.append(dict(storygraph=f"{e['title']} ({e['authors']})", status=e['status'], owned=f"{b['title']} [{b['id']}]",
                           confidence='high' if r > 0.85 and bsurs(b) & su else 'medium', note=f'title similarity {r:.2f}'))
out['1_unlinked_possible_matches'] = c1
out['1_unlinked_counts'] = collections.Counter(e['status'] for e in sg if not e.get('books'))

# ---- 2. to-read not owned
auth_owned = collections.Counter()
for b in owned:
    for s in bkeys(b):
        auth_owned[s] += 1
auth_read = collections.Counter(s for e in sg if e['status'] == 'read' for s in ekeys(e))
auth_rate = collections.defaultdict(list)
for e in sg:
    if e.get('rating') and e['status'] == 'read':
        for s in ekeys(e):
            auth_rate[s].append(e['rating'])


def tb_hit(e):
    for t in tobuy:
        tt = t['title']
        if akey(t['authors'][0]['name']) not in ekeys(e):
            continue
        a, b = short(e['title']), short(tt)
        b0 = re.sub(r'\s*series.*$', '', b)
        if difflib.SequenceMatcher(None, a, b).ratio() > 0.7 or a in norm(tt) or (b0 and b0 in a):
            return tt


SERIES_NOTES = {
    'Not Till We Are Lost': 'Bobiverse 5: she owns and has read books 1-4',
    'The Strength of the Few': 'Hierarchy 2: she read The Will of the Many (book 1, not owned)',
    'Compulsory': 'Murderbot short story; she owns Murderbot 1-4',
    'Home: Habitat, Range, Niche, Territory': 'Murderbot novella; she owns Murderbot 1-4',
    'Tales Told in Oz': 'Wicked Years companion; she owns all four Wicked Years',
    'The Mirror of Her Dreams': 'Donaldson; she owns Thomas Covenant',
    'Stone Hunger': 'Jemisin; The Fifth Season is also on her to-read',
}
c2 = []
for e in sg:
    if e['status'] != 'to-read' or e.get('books'):
        continue
    why = []; su = ekeys(e)
    tb = tb_hit(e)
    if tb:
        why.append(f'on to-buy list ("{tb}")')
    if e['title'] in SERIES_NOTES:
        why.append(SERIES_NOTES[e['title']])
    n = max((auth_owned[s] for s in su), default=0); rd = max((auth_read[s] for s in su), default=0)
    rt = [x for s in su for x in auth_rate[s]]
    if n:
        why.append(f'owns {n} by this author')
    if rd:
        why.append(f'has read {rd} by this author' + (f' (avg {sum(rt)/len(rt):.1f} stars)' if rt else ''))
    c2.append(dict(title=e['title'], author=e['authors'], added=e['added'], format=e.get('format'), why=why))
c2.sort(key=lambda x: (-len(x['why']), x['added']))
out['2_to_read_not_owned'] = c2
out['2_owned_to_read'] = [dict(title=e['title'], author=e['authors']) for e in sg if e['status'] == 'to-read' and e.get('books')]

# ---- 3. owned, no reading record, probably read
c3 = []; seen = set()
for name, rows in by_series.items():
    readpos = [r['pos'] for r in rows if r['status'] == 'read']
    if not readpos:
        continue
    for r in rows:
        if r['owned'] and not r['status']:
            later = [p for p in readpos if p > r['pos']]
            c3.append(dict(series=name, pos=r['pos'], title=r['title'], ids=r['owned'],
                           reason=('later books read: ' + ', '.join(map(str, later))) if later else 'earlier books read: ' + ', '.join(map(str, readpos)),
                           strength='strong' if later else 'some'))
            seen.update(r['owned'])
out['3_series_gaps'] = c3
# owned series with nothing read at all
out['3_owned_series_nothing_read'] = [dict(series=n, owned=sum(1 for r in rows if r['owned']), of=len(rows)) for n, rows in by_series.items()
                                      if any(r['owned'] for r in rows) and not any(r['status'] for r in rows)]
child = []
for b in owned:
    if b['id'] in status_of or b['id'] in seen:
        continue
    if b['shelf'] in ('childrens', 'old-book-collection', 'young-adult'):
        child.append(dict(title=b['title'], author=bauth(b), shelf=b['shelf'], id=b['id'],
                          readOthersByAuthor=max((auth_read[s] for s in bkeys(b)), default=0)))
child.sort(key=lambda x: (-x['readOthersByAuthor'], x['shelf'], x['author']))
out['3_childhood_shelves_no_record'] = child
out['3_owned_no_record_total'] = sum(1 for b in owned if b['id'] not in status_of)
out['3_owned_total'] = len(owned)

# ---- 4. oddities
od = collections.defaultdict(list)
unrated = 0
for e in sg:
    t = f"{e['title']} ({e['authors']})"
    for s, f in e.get('dates') or []:
        if s and f and f < s:
            od['finish_before_start'].append(f'{t}: {s} -> {f}')
        for d in (s, f):
            if d and d > TODAY:
                od['date_in_future'].append(f'{t}: {d}')
        if e['status'] == 'read' and s and not f:
            od['read_but_no_finish_date'].append(f'{t}: started {s}')
    if e.get('rating') and e['status'] != 'read':
        od['rating_without_read_status'].append(f"{t}: {e['status']}, {e['rating']} stars")
    if e['status'] == 'read' and not e.get('dates'):
        od['read_no_dates'].append(f"{t} (added {e['added']})")
    if e.get('readCount') and e.get('dates') and e['readCount'] != len(e['dates']):
        od['readcount_vs_date_ranges'].append(f"{t}: read count {e['readCount']}, {len(e['dates'])} date range(s)")
    if e['status'] == 'read' and e.get('dates') and e.get('lastRead'):
        fs = [f for s, f in e['dates'] if f]
        if fs and e['lastRead'] != max(fs):
            od['lastread_mismatch'].append(f"{t}: lastRead {e['lastRead']} vs {e['dates']}")
    if e['status'] == 'to-read' and (e.get('dates') or e.get('readCount')):
        od['to_read_with_reading_data'].append(f"{t}: {e.get('dates')} count {e.get('readCount')}")
    if e['status'] == 'reading' and e.get('dates') and all(f for s, f in e['dates']):
        od['reading_but_all_ranges_finished'].append(f"{t}: {e['dates']}")
    if e['status'] == 'read' and not e.get('rating'):
        unrated += 1
od['read_unrated_count'] = [unrated]
grp = collections.defaultdict(list)
for e in sg:
    grp[short(e['title']) + '|' + sgsur(e['authors'])].append(e)
for k, v in grp.items():
    if len(v) > 1:
        od['duplicate_entries'].append(' / '.join(f"{e['title']} [{e['status']}, {e.get('format')}, {e.get('dates')}, {e.get('rating', '')}]" for e in v))
for x, ix in linked.items():
    if len(ix) > 1:
        od['owned_book_linked_from_several_entries'].append(f"{byid[x]['title']} [{x}] <- " + ' | '.join(f"{sg[i]['title']} ({sg[i]['status']})" for i in ix))
for b in owned:
    if b.get('status'):
        od['libib_status_vs_storygraph'].append(f"{b['title']}: Libib '{b['status']}', StoryGraph '{status_of.get(b['id'], 'none')}'")
out['4_oddities'] = od

# ---- 5. profile
rd = [e for e in sg if e['status'] == 'read']


def yr(e):
    ds = [f or s for s, f in e.get('dates') or [] if f or s]
    return max(ds)[:4] if ds else 'undated'


prof = {}
prof['counts'] = collections.Counter(e['status'] for e in sg)
prof['read_per_year'] = dict(sorted(collections.Counter(yr(e) for e in rd).items()))
fy = collections.defaultdict(collections.Counter)
for e in rd:
    fy[yr(e)][e.get('format')] += 1
prof['formats_by_year'] = {k: dict(v) for k, v in sorted(fy.items())}
rt = [e['rating'] for e in rd if e.get('rating')]
prof['ratings'] = dict(n=len(rt), avg=round(sum(rt) / len(rt), 2), dist=dict(sorted(collections.Counter(rt).items())))
prof['moods'] = collections.Counter(m.strip() for e in rd for m in (e.get('moods') or '').split(',') if m.strip()).most_common()
prof['mood_tagged_books'] = sum(1 for e in rd if e.get('moods'))
prof['pace'] = collections.Counter(e.get('pace') for e in rd if e.get('pace')).most_common()
mr = collections.defaultdict(list)
for e in rd:
    if e.get('rating'):
        for m in (e.get('moods') or '').split(','):
            if m.strip():
                mr[m.strip()].append(e['rating'])
prof['avg_rating_by_mood'] = {m: (round(sum(v) / len(v), 2), len(v)) for m, v in sorted(mr.items(), key=lambda kv: -sum(kv[1]) / len(kv[1])) if len(v) >= 3}
pr = collections.defaultdict(list)
for e in rd:
    if e.get('rating') and e.get('pace'):
        pr[e['pace']].append(e['rating'])
prof['avg_rating_by_pace'] = {k: (round(sum(v) / len(v), 2), len(v)) for k, v in pr.items()}
els = {k: v for k, v in L('elsewhere-shelves.json').items() if not k.startswith('_')}


def shelf(e):
    if e.get('books'):
        return byid[e['books'][0]]['shelf']
    return els.get(e['title'], 'not placed')


sh = collections.defaultdict(list)
for e in rd:
    sh[shelf(e)].append(e.get('rating'))
prof['read_by_shelf'] = {k: dict(n=len(v), rated=len([x for x in v if x]), avg_rating=round(sum(x for x in v if x) / len([x for x in v if x]), 2) if any(v) else None)
                         for k, v in sorted(sh.items(), key=lambda kv: -len(kv[1]))}
ar = collections.defaultdict(list); an = collections.Counter()
for e in rd:
    a = re.split(r',\s*', e['authors'])[0]
    a = 'Enid Blyton / Pamela Cox' if a in ('Pamela Cox', 'Enid Blyton') else a
    an[a] += 1
    if e.get('rating'):
        ar[a].append(e['rating'])
prof['most_read_authors'] = an.most_common(15)
prof['top_rated_authors'] = sorted([(a, round(sum(v) / len(v), 2), len(v)) for a, v in ar.items() if len(v) >= 2], key=lambda x: (-x[1], -x[2]))[:15]
prof['five_star'] = [f"{e['title']} ({e['authors']})" for e in rd if e.get('rating') == 5]
prof['lowest_rated'] = [f"{e['title']} ({e['authors']}) {e['rating']}" for e in rd if e.get('rating') and e['rating'] <= 2.5]
prof['stopped_paused_reading'] = [f"{e['title']} ({e['authors']}) - {e['status']}" for e in sg if e['status'] in ('stopped', 'paused', 'reading')]
pg = sorted(byid[e['books'][0]].get('pages') for e in rd if e.get('books') and byid[e['books'][0]].get('pages'))
prof['pages_of_read_owned'] = dict(n=len(pg), avg=round(sum(pg) / len(pg)), median=pg[len(pg) // 2])
rec = [e for e in rd if yr(e) >= '2025']
rr = [e['rating'] for e in rec if e.get('rating')]
prof['recent_2025_on'] = dict(n=len(rec), shelves=collections.Counter(shelf(e) for e in rec).most_common(),
                              formats=collections.Counter(e.get('format') for e in rec).most_common(),
                              avg_rating=round(sum(rr) / len(rr), 2) if rr else None,
                              top=[f"{e['title']} ({e['authors']}) {e['rating']}" for e in rec if (e.get('rating') or 0) >= 4.5])
out['5_profile'] = prof
json.dump(out, open('reading.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1, default=str)
import pprint
for k, v in out.items():
    if k == 'series_map':
        continue
    print('=====', k); pprint.pprint(v, width=230, sort_dicts=False)
