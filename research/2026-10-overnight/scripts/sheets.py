import json,sys,os
from PIL import Image,ImageDraw,ImageFont
OUT=sys.argv[1]
rows=json.load(open(os.path.join(OUT,'metrics.json'),encoding='utf8'))
for r in rows:
    if 'lstd' in r:
        r['issues']=[i for i in r['issues'] if i!='low-contrast']
        if r['lstd']<28 or r['lmean']<38 or r['lmean']>228: r['issues'].append('low-contrast')
fl=[r for r in rows if r['issues']]
def key(r):
    i=r['issues']
    return (0 if 'differs' in i else 1 if 'differs-mild' in i else 2, -(r.get('dhash') or 0))
fl.sort(key=key)
for n,r in enumerate(fl,1): r['n']=n
json.dump(fl,open(os.path.join(OUT,'flagged.json'),'w',encoding='utf8'),ensure_ascii=False,indent=1)
f=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',13); fb=ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf',14)
CW,CH=150,225; PW=CW*2+10; COLS,ROWS=5,6; LH=50
def thumb(p):
    if not p or not os.path.exists(p):
        im=Image.new('RGB',(CW,CH),(200,200,200)); ImageDraw.Draw(im).text((10,100),'none',fill=0,font=f); return im
    im=Image.open(p).convert('RGB'); w,h=im.size; s=min(CW/w,CH/h)
    t=im.resize((max(1,int(w*s)),max(1,int(h*s)))); c=Image.new('RGB',(CW,CH),(255,0,255)); c.paste(t,((CW-t.width)//2,(CH-t.height)//2)); return c
for s in range(0,len(fl),30):
    sh=Image.new('RGB',(COLS*(PW+16),ROWS*(CH+LH+10)),(255,255,255)); d=ImageDraw.Draw(sh)
    for k,r in enumerate(fl[s:s+30]):
        x=(k%COLS)*(PW+16)+8; y=(k//COLS)*(CH+LH+10)+5
        sh.paste(thumb(r['site_file']),(x,y)); sh.paste(thumb(r['isbn_file']),(x+CW+10,y))
        d.text((x,y+CH+2),f"#{r['n']} {r['title'][:34]}",fill=0,font=fb)
        d.text((x,y+CH+18),f"{r['isbn13']} {r.get('w')}px d{r.get('dhash')} h{r.get('histd')}",fill=(60,60,60),font=f)
        d.text((x,y+CH+32),','.join(r['issues'])+(' ['+r['edition']+']' if r.get('edition') else ''),fill=(170,0,0),font=f)
    sh.save(os.path.join(OUT,'sheets',f'sheet-{s//30+1:02d}.jpg'),quality=88)
print(len(fl))
