"""Test set for the cover straightener: for books whose correct flat cover is already in site/covers (ISBN-named), fetch
AbeBooks UK sellers' photos of the same ISBN (real copies, often at an angle, on tables, cropped). Saved as
testset/<isbn>/true.jpg and testset/<isbn>/photo-<n>.jpg. Polite: one request a second."""
import io, json, os, random, re, sys, time, urllib.parse, urllib.request
from PIL import Image

HL = 'C:/Users/Jemma/Documents/HomeLibrary'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'testset')
UA = {'User-Agent': "Jemma's Home Library (private)"}
want = int(sys.argv[1]) if len(sys.argv) > 1 else 120


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=25) as r:
        return r.read()


isbns = [f[:-4] for f in os.listdir(os.path.join(HL, 'site', 'covers')) if re.fullmatch(r'97[89]\d{10}\.jpg', f)]
random.seed(7); random.shuffle(isbns)
os.makedirs(OUT, exist_ok=True)
done = len([d for d in os.listdir(OUT) if os.path.isdir(os.path.join(OUT, d))])
for i in isbns:
    if done >= want:
        break
    d = os.path.join(OUT, i)
    if os.path.isdir(d):
        continue
    try:
        page = get('https://www.abebooks.co.uk/servlet/SearchResults?' + urllib.parse.urlencode({'isbn': i, 'sortby': 17})).decode('utf-8', 'replace')
    except Exception as e:
        print(i, 'search failed', e); time.sleep(2); continue
    ids = list(dict.fromkeys(re.findall(r'pictures\.abebooks\.com/inventory/(\d+)\._SL300_\.jpg', page)))[:3]
    time.sleep(1)
    if not ids:
        continue
    os.makedirs(d, exist_ok=True)
    Image.open(os.path.join(HL, 'site', 'covers', i + '.jpg')).convert('RGB').save(os.path.join(d, 'true.jpg'), quality=92)
    n = 0
    for k in ids:
        try:
            im = Image.open(io.BytesIO(get(f'https://pictures.abebooks.com/inventory/{k}._SL1000_.jpg'))).convert('RGB')
            im.save(os.path.join(d, f'photo-{n}.jpg'), quality=92); n += 1
        except Exception as e:
            print(i, k, e)
        time.sleep(1)
    if n:
        done += 1
        print(done, i, n, flush=True)
    else:
        os.rmdir(d) if not os.listdir(d) else None
print('done', done)
