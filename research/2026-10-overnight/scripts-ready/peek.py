import json, os, sys
R = r'C:\Users\Jemma\AppData\Local\Temp\claude\C--Users-Jemma-Documents-SimTracker--claude-worktrees-libib-data-extraction-6386aa\685a58b9-e30d-4ad0-8d37-bec5690d9700\scratchpad\research'
d = json.load(open(os.path.join(R, 'cover-audit', 'cover-audit.json'), encoding='utf8'))
for x in d:
    t = x['title']
    if any(s in t for s in ['Heartstopper Volume 5', 'Midnight Garden', 'Christmas Cottage', 'You Are Here', 'Teddy Bear', 'Beedle']) or x['verdict'] in ('poor quality', 'wrong book'):
        print(json.dumps({k: v for k, v in x.items() if k in ('id', 'title', 'isbn13', 'issue', 'verdict', 'note')}, ensure_ascii=False))
        print('   site:', x.get('site_file'), '| isbn:', os.path.basename(x.get('isbn_file', '').replace('\\', '/')), os.path.exists(x.get('isbn_file', '')))
