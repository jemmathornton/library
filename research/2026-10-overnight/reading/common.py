import json, re, os, difflib, collections
D='C:/Users/Jemma/Documents/HomeLibrary/data/'
L=lambda f: json.load(open(D+f,encoding='utf8'))
sg=L('storygraph.json')['books']
gone={x['id'] for x in L('removed.json')}
owned=[b for b in L('books.json')+L('added.json') if b['id'] not in gone]
det=L('details.json')
for b in owned:
    for k,v in det.get(b['id'],{}).items(): b.setdefault(k,v)
byid={b['id']:b for b in owned}
def norm(s): return re.sub(r'[^a-z0-9 ]','',re.sub(r'\(.*?\)|\[.*?\]','',(s or '').lower().replace('&',' and '))).strip()
def short(s):
    s=re.sub(r'^\s*\d+\s*[:.]\s*','',re.sub(r'\(.*?\)','',s or ''))
    s=re.sub(r'^\s*(the|a|an)\s+','',s,flags=re.I)
    return norm(re.split(r':\s',s)[0])
def sgsur(a):
    f=re.split(r',\s*',a or '')[0].strip(); return norm(f.split()[-1]) if f else ''
def bsur(b): return norm(b.get('surname') or (b['authors'][0]['name'].split()[-1] if b.get('authors') else ''))
def bauth(b): return ', '.join(a['name'] for a in b.get('authors',[]) if not a.get('role'))
linked=collections.defaultdict(list)
for i,e in enumerate(sg):
    for x in e.get('books',[]): linked[x].append(i)
