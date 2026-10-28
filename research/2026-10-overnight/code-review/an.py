import json,sys,os,collections
sys.path.insert(0,r'C:\Users\Jemma\Documents\HomeLibrary\tools')
sys.dont_write_bytecode=True
import import_storygraph as s
D=r'C:\Users\Jemma\Documents\HomeLibrary\data'
books=json.load(open(D+r'\books.json',encoding='utf-8'))+json.load(open(D+r'\added.json',encoding='utf-8'))
by=collections.defaultdict(list)
for b in books:
    by[s.short_title(b.get('displayTitle') or b['title'])+'|'+s.norm(b.get('surname',''))].append(b['title'])
for k,v in by.items():
    if len(set(v))>1 and len(v)>1: print(k, '=>', v[:6], len(v))
sg=json.load(open(D+r'\storygraph.json',encoding='utf-8'))
ids={b['id']:b['title'] for b in books}
print('---- SG entries matching many differently-titled books')
for e in sg['books']:
    if len(e.get('books',[]))>1:
        ts={ids.get(i,'?') for i in e['books']}
        if len({s.norm(t) for t in ts})>1: print(e['title'],'->',list(ts)[:5])
print('display', sum(1 for b in books if 'displayTitle' in b))
print('ids sample', [b['id'] for b in books[:3]], [b['id'] for b in books if b['id'].startswith('add')])
