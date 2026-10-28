import json, os
R = r'C:\Users\Jemma\AppData\Local\Temp\claude\C--Users-Jemma-Documents-SimTracker--claude-worktrees-libib-data-extraction-6386aa\685a58b9-e30d-4ad0-8d37-bec5690d9700\scratchpad\research'
bl = json.load(open(os.path.join(R, 'blurbs.json'), encoding='utf8'))
for x in bl:
    if x['found']:
        print('##', x['id'], x['title'], '| NOW:', (x['now'] or '')[:90])
        print('   ', x['found'][0][0][:40], '|', x['found'][0][1][:260].replace('\n', ' '))
