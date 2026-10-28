import json, os
R = r'C:\Users\Jemma\AppData\Local\Temp\claude\C--Users-Jemma-Documents-SimTracker--claude-worktrees-libib-data-extraction-6386aa\685a58b9-e30d-4ad0-8d37-bec5690d9700\scratchpad\research'
H = r'C:\Users\Jemma\Documents\HomeLibrary\data'
books = json.load(open(os.path.join(H, 'books.json'), encoding='utf8')) + json.load(open(os.path.join(H, 'added.json'), encoding='utf8'))
by_isbn = {}
for b in books:
    if b.get('isbn13'):
        by_isbn.setdefault(b['isbn13'], []).append(b)
byid = {b['id']: b for b in books}
det = json.load(open(os.path.join(H, 'details.json'), encoding='utf8'))
pages = json.load(open(os.path.join(R, 'pages.json'), encoding='utf8'))
for k, v in pages.items():
    bs = by_isbn.get(k, [])
    print(k, v, '| libib:', [(b['id'], b['title'][:40], b.get('pages'), b.get('publisher'), det.get(b['id'], {}).get('pages')) for b in bs])
print()
for x in json.load(open(os.path.join(R, 'details.json'), encoding='utf8')):
    b = byid.get(x['id'], {})
    if x['found']:
        print(x['id'], x['title'][:40], x['found'], x['missing'], '| now:', b.get('published'), b.get('pages'), b.get('publisher'))
print('no found:', sum(1 for x in json.load(open(os.path.join(R, 'details.json'), encoding='utf8')) if not x['found']))
print(byid.get('badmwepcho'))
nc = json.load(open(os.path.join(H, 'no-cover.json'), encoding='utf8'))
print(list(nc.keys()), nc['books'][:2], len(nc['books']))
