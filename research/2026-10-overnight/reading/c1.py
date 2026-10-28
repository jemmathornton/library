from common import *
for e in sg:
    if e.get('books'): continue
    st=short(e['title']); su=sgsur(e['authors'])
    c=[]
    for b in owned:
        r=difflib.SequenceMatcher(None,st,short(b['title'])).ratio()
        sa = su and su==bsur(b)
        tw=set(st.split())-{'the','of','and','a','to','in'}; bw=set(short(b['title']).split())
        ov=len(tw&bw)/max(1,len(tw))
        if e.get('isbn13') and e['isbn13']==b.get('isbn13'): c.append((9,b))
        elif (sa and (r>0.5 or ov>=0.5)) or r>0.8: c.append((r+(0.5 if sa else 0),b))
    c.sort(key=lambda x:-x[0])
    print(f"[{e['status']}] {e['title']} / {e['authors']} / {e.get('isbn13','')} / owned={e['owned']} fmt={e.get('format')}")
    for s,b in c[:3]: print(f"     {s:.2f} {b['id']} {b['title']} / {bauth(b)} {'(linked)' if b['id'] in linked else ''}")
