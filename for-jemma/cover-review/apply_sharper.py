"""Put approved sharper scans in place (same cover, better picture), then rebuild.
    python -X utf8 for-jemma/cover-review/apply_sharper.py <board> <numbers|all>
    board: sharper (pass 1, boards 1-4), same, check (pass 2)
"""
import json, os, shutil, subprocess, sys
R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) + '/'
t = open(R + 'site/js/data.js', encoding='utf-8').read(); B = {b['id']: b for b in json.loads(t[t.index('{'):t.rstrip().rindex(';')])['books']}
board, pick = sys.argv[1], sys.argv[2]
if board == 'sharper':
    folder = R + 'for-jemma/cover-review/sharper/'; L = json.load(open(folder + 'found.json'))
else:
    folder = R + 'for-jemma/cover-review/sharper2/'; g = json.load(open(folder + 'groups.json')); L = g[board]
nums = range(1, len(L) + 1) if pick == 'all' else [int(n) for n in pick.split(',')]
if board == 'same' and pick == 'all':
    nums = [n for n in nums if n not in g['same_skip']]
covers = json.load(open(R + 'data/covers.json', encoding='utf-8'))
for n in nums:
    x = L[n - 1]; key = B[x['id']]['cover'].split('/')[1].split('.jpg')[0]
    shutil.copy(folder + x['id'] + '.jpg', R + 'site/covers/' + key + '.jpg')
    covers[key] = {'src': x['url'], 'from': 'her pick, Nov: same cover, sharper scan'}
    print(n, x['title'])
json.dump(dict(sorted(covers.items())), open(R + 'data/covers.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
subprocess.run([sys.executable, '-X', 'utf8', R + 'tools/build.py'], check=True)
