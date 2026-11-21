"""Makes for-jemma/blurbs-to-check/index.html from proposals.json: each book's cover, the blurb the site shows now, and the
blurb found (cuts struck through), so she can say which to use. Opens straight from the folder."""
import html, json, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
s = open(os.path.join(ROOT, 'site', 'js', 'data.js'), encoding='utf-8').read()
data = json.loads(s[s.index('{'):s.rindex('}') + 1])
books = {b['id']: b for b in data['books']}
prop = json.load(open(os.path.join(HERE, 'proposals.json'), encoding='utf-8'))


def show(text):
    out = []
    for i, part in enumerate(re.split(r'⟦|⟧', text)):
        part = html.escape(part).replace('\n', '<br>')
        out.append(f'<del>{part}</del>' if i % 2 else part)
    return ''.join(out)


cards = []
for n, p in enumerate(prop['books'], 1):
    b = books[p['id']]
    cover = f'<img src="../../site/{html.escape(b["cover"])}" alt="">' if b.get('cover', '').startswith('covers/') else ''
    opts = ''.join(f'''<div class="opt"><h3>{"Found" if len(p["options"]) == 1 else "Option " + o["label"]}</h3>
      <p class="src">{html.escape(o["source"])} · <a href="{html.escape(o["url"])}">source</a></p><div class="txt">{show(o["text"])}</div></div>'''
                   for o in p['options'])
    cards.append(f'''<section><div class="head">{cover}<div><span class="n">{n}</span><h2>{html.escape(b["title"])}</h2>
      <p class="by">{html.escape(b.get("by") or "")}</p></div></div>
      <div class="cols"><div class="opt now"><h3>On the site now</h3><div class="txt">{html.escape(b.get("description") or "(none)").replace(chr(10), "<br>")}</div></div>{opts}</div></section>''')

page = f'''<!doctype html><html lang="en-GB"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Blurbs to check</title>
<style>
body{{margin:0;background:#F3EAD5;color:#2B2017;font:16px/1.55 Georgia,serif}}
main{{max-width:1300px;margin:0 auto;padding:30px 24px 80px}}
h1{{font-weight:400;font-size:40px;margin:0 0 6px}} .intro{{color:#6F5F48;max-width:70ch}}
section{{background:#FAF4E6;border:1px solid #D9C9A6;margin:26px 0;padding:18px 20px}}
.head{{display:flex;gap:16px;align-items:center}} .head img{{width:70px;box-shadow:0 2px 6px rgba(0,0,0,.25)}}
.n{{font:700 13px sans-serif;color:#7A5418}} h2{{margin:2px 0;font-weight:400;font-size:26px}} .by{{margin:0;color:#6F5F48;font-style:italic}}
.cols{{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;margin-top:14px}}
.opt{{border-top:3px double #D9C9A6;padding-top:8px}} .opt h3{{margin:0;font:700 13px sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#7A5418}}
.now h3{{color:#6F5F48}} .now .txt{{color:#6F5F48}}
.src{{margin:2px 0 8px;font:13px sans-serif;color:#6F5F48}} .src a{{color:#7A5418}}
del{{color:#A33;text-decoration:line-through}}
</style><main><h1>Blurbs to check</h1>
<p class="intro">The real blurb found for each book, word for word from the source named. Struck-through words are cuts (praise and
prize lines); nothing else is changed. Where two were found, say A or B. Tell me in chat: “all fine”, or the numbers to change or leave.</p>
{"".join(cards)}</main></html>'''
open(os.path.join(HERE, 'index.html'), 'w', encoding='utf-8').write(page)
print('written', len(cards))
