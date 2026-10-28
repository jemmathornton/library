from common import *
surs=collections.defaultdict(list)
for b in owned: surs[bsur(b)].append(b)
for e in sg:
    if e.get('books'): continue
    su=sgsur(e['authors'])
    if su in surs:
        print(f"[{e['status']}] {e['title']} / {e['authors']}")
        for b in surs[su]: print('    ',b['id'],b['title'],'/',bauth(b),b.get('isbn13',''),'L' if b['id'] in linked else '')
