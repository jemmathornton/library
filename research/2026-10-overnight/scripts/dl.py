import json,sys,os,urllib.request,io
from concurrent.futures import ThreadPoolExecutor
from PIL import Image
OUT=sys.argv[1]
t=open(r'C:/Users/Jemma/Documents/HomeLibrary/site/js/data.js',encoding='utf8').read()
d=json.loads(t[t.index('{'):t.rindex('}')+1])
books=[b for b in d['books'] if b['shelf']!='old-book-collection' and b.get('isbn13')]
def i10(i13):
    if not i13.startswith('978'): return None
    c=i13[3:12]; s=sum((10-k)*int(x) for k,x in enumerate(c)); r=(11-s%11)%11
    return c+('X' if r==10 else str(r))
def get(u):
    try:
        req=urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'})
        data=urllib.request.urlopen(req,timeout=20).read()
        im=Image.open(io.BytesIO(data)); im.load()
        if im.width<60 or im.height<60: return None
        return data
    except Exception: return None
def job(b):
    i=b['isbn13']; p=os.path.join(OUT,i+'.jpg')
    if os.path.exists(p): return i,'cached'
    i10_=b.get('isbn10') or i10(i)
    srcs=[]
    if i10_: srcs.append(('amazon',f'https://images-na.ssl-images-amazon.com/images/P/{i10_}.01.LZZZZZZZ.jpg'))
    srcs.append(('abebooks',f'https://pictures.abebooks.com/isbn/{i}-uk.jpg'))
    for n,u in srcs:
        data=get(u)
        if data:
            open(p,'wb').write(data); return i,n
    return i,'none'
res={}
with ThreadPoolExecutor(12) as ex:
    for i,n in ex.map(job,books): res[i]=n
json.dump(res,open(os.path.join(OUT,'..','sources.json'),'w'),indent=0)
from collections import Counter; print(Counter(res.values()))
