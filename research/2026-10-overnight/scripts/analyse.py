import json,sys,os
import numpy as np
from PIL import Image, ImageOps
OUT=sys.argv[1]; H='C:/Users/Jemma/Documents/HomeLibrary/'
t=open(H+'site/js/data.js',encoding='utf8').read()
d=json.loads(t[t.index('{'):t.rindex('}')+1])
eds=json.load(open(H+'data/editions.json',encoding='utf8'))
books=[b for b in d['books'] if b['shelf']!='old-book-collection']
def trim(im):
    a=np.asarray(im.convert('L'),dtype=float)
    def bad(v): return v.std()<6 and (v.mean()>235 or v.mean()<20)
    t,b,l,r=0,a.shape[0],0,a.shape[1]
    while t<b-10 and bad(a[t]): t+=1
    while b>t+10 and bad(a[b-1]): b-=1
    while l<r-10 and bad(a[t:b,l]): l+=1
    while r>l+10 and bad(a[t:b,r-1]): r-=1
    return im.crop((l,t,r,b)), (t+(a.shape[0]-b))/a.shape[0]+(l+(a.shape[1]-r))/a.shape[1]
def feats(p):
    im=Image.open(p).convert('RGB'); W,Hh=im.size
    c,border=trim(im)
    g=np.asarray(c.convert('L').resize((17,16),Image.LANCZOS),dtype=float)
    dh=(g[:,1:]>g[:,:-1]).flatten()
    g2=np.asarray(c.convert('L').resize((16,16),Image.LANCZOS),dtype=float)
    ah=(g2>g2.mean()).flatten()
    hsv=np.asarray(c.convert('HSV').resize((64,96)),dtype=int)
    h,_=np.histogramdd(hsv.reshape(-1,3)//np.array([32,86,86]),bins=(8,3,3),range=((0,8),(0,3),(0,3)))
    h=h.flatten()/h.sum()
    L=np.asarray(c.convert('L'),dtype=float)
    # corner patches of full image
    A=np.asarray(im,dtype=float); k=max(4,min(W,Hh)//12)
    cs=[A[:k,:k],A[:k,-k:],A[-k:,:k],A[-k:,-k:]]
    cstd=np.mean([x.std() for x in cs]); cmean=np.array([x.reshape(-1,3).mean(0) for x in cs])
    cspread=np.abs(cmean-cmean.mean(0)).max()
    return dict(w=W,h=Hh,dh=dh,ah=ah,hist=h,border=border,lstd=L.std(),lmean=L.mean(),cstd=cstd,cspread=cspread)
rows=[]
for b in books:
    sc=H+'site/'+b['cover'].split('?')[0] if b.get('cover') else None
    isf=os.path.join(OUT,'isbn',(b.get('isbn13') or 'x')+'.jpg')
    r=dict(id=b['id'],title=b['title'],isbn13=b.get('isbn13'),shelf=b['shelf'],edition=eds.get(b['id']),site_file=sc,isbn_file=isf if os.path.exists(isf) else None)
    if not sc or not os.path.exists(sc): r['issues']=['no site cover']; rows.append(r); continue
    f=feats(sc); r.update(w=f['w'],h=f['h'],border=round(f['border'],3),lstd=round(f['lstd'],1),lmean=round(f['lmean'],1),cstd=round(f['cstd'],1),cspread=round(f['cspread'],1))
    iss=[]
    if f['w']<250: iss.append('low-res')
    if f['border']>0.08: iss.append('border')
    ar=f['w']/f['h']
    if 0.9<ar<1.1: iss.append('square')
    elif ar>1.1: iss.append('landscape')
    if f['lstd']<35 or f['lmean']<45 or f['lmean']>225: iss.append('low-contrast')
    if r['isbn_file']:
        g=feats(r['isbn_file'])
        dd=int((f['dh']!=g['dh']).sum()); ad=int((f['ah']!=g['ah']).sum())
        hd=float(0.5*np.abs(f['hist']-g['hist']).sum())
        r.update(dhash=dd,ahash=ad,histd=round(hd,3),isbn_w=g['w'],isbn_h=g['h'])
        if (dd>95 and ad>80) or (hd>0.55 and (dd>80 or ad>70)): iss.append('differs')
        elif dd>80 or ad>70 or hd>0.5: iss.append('differs-mild')
    else: r['isbn_file']=None; iss.append('no isbn cover') if b.get('isbn13') else None
    r['issues']=iss; rows.append(r)
json.dump(rows,open(os.path.join(OUT,'metrics.json'),'w',encoding='utf8'),ensure_ascii=False,indent=1)
from collections import Counter
print(Counter(i for r in rows for i in r['issues']))
print(sum(1 for r in rows if r['issues']))
