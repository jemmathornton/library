import json, os, collections
R = r'C:\Users\Jemma\AppData\Local\Temp\claude\C--Users-Jemma-Documents-SimTracker--claude-worktrees-libib-data-extraction-6386aa\685a58b9-e30d-4ad0-8d37-bec5690d9700\scratchpad\research'
ob = json.load(open(os.path.join(R, 'old-books', 'old-books.json'), encoding='utf8'))
print(collections.Counter(x['confidence'] for x in ob))
for x in ob:
    if x['confidence'] == 'high' or x['confidence'] == 'medium':
        print(x['confidence'], x['id'], x['title'], x['candidate_files'][:2], '| cur:', str(x['current_cover'])[:70], '| wrong:', x['current_looks_wrong'])
        print('     ', str(x['likely_edition'])[:120], '|', str(x['note'])[:160])
bd = json.load(open(os.path.join(R, 'blurbs-deep', 'blurbs-deep.json'), encoding='utf8'))
print(collections.Counter(x['confidence'] for x in bd))
for x in bd:
    print(x['confidence'], x['id'], x['title'], '|', (x['blurb'] or '')[:80].replace('\n', ' '), '|', x.get('source_url'))
bl = json.load(open(os.path.join(R, 'blurbs.json'), encoding='utf8'))
print(collections.Counter(len(x['found']) for x in bl))
print(collections.Counter(x['found'][0][0] for x in bl if x['found']))
print(set().union(*[x.keys() for x in bl]))
ids_b = {x['id'] for x in bl if x['found']}
print('overlap deep/blurbs', [x['title'] for x in bd if x['id'] in ids_b])
