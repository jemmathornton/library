import json, os, sys, time, hashlib, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor
AUD=sys.argv[1]; C=os.path.join(AUD,'cache'); os.makedirs(C,exist_ok=True)
s=open(r'C:/Users/Jemma/Documents/HomeLibrary/site/js/data.js',encoding='utf8').read()
books=json.loads(s[s.index('{'):s.rindex('}')+1])['books']
UA={'User-Agent':'JemmaHomeLibraryAudit/1.0 (personal catalogue check)'}
def get(url):
    fn=os.path.join(C,hashlib.md5(url.encode()).hexdigest()+'.json')
    if os.path.exists(fn):
        return json.load(open(fn,encoding='utf8'))
    for attempt in range(4):
        try:
            r=urllib.request.urlopen(urllib.request.Request(url,headers=UA),timeout=30)
            data={'status':200,'body':json.loads(r.read().decode('utf8'))}
            break
        except urllib.error.HTTPError as e:
            if e.code in (429,500,502,503): time.sleep(5*(attempt+1)); continue
            data={'status':e.code,'body':None}; break
        except Exception as e:
            time.sleep(3); data={'status':-1,'body':str(e)}
    else:
        data={'status':429,'body':None}
    if data['status'] in (200,404): json.dump(data,open(fn,'w',encoding='utf8'))
    time.sleep(0.2)
    return data
def one(b):
    i=b.get('isbn13')
    if not i:
        import urllib.parse as u
        a=(b.get('authors') or [{}])[0].get('name','')
        get('https://openlibrary.org/search.json?'+u.urlencode({'title':b['title'],'author':a,'fields':'key,title,author_name,subject,first_publish_year,isbn','limit':3}))
        return
    ed=get(f'https://openlibrary.org/isbn/{i}.json')
    if ed['status']==200 and ed['body']:
        for w in ed['body'].get('works',[])[:1]:
            wk=get('https://openlibrary.org'+w['key']+'.json')
            if wk['status']==200:
                for a in (wk['body'].get('authors') or [])[:4]:
                    k=(a.get('author') or {}).get('key')
                    if k: get('https://openlibrary.org'+k+'.json')
        for a in (ed['body'].get('authors') or [])[:4]:
            get('https://openlibrary.org'+a['key']+'.json')
    else:
        get(f'https://openlibrary.org/search.json?isbn={i}&fields=key,title,author_name,subject,first_publish_year,isbn')
with ThreadPoolExecutor(4) as ex: list(ex.map(one,books))
print('done')
