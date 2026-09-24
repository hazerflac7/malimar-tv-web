#!/usr/bin/env python3
import hashlib, json, pathlib, urllib.request, xml.etree.ElementTree as ET
from urllib.parse import urlparse
ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'xml-cache'
OUT.mkdir(exist_ok=True)
SEEDS = [
 'https://xml.malimarcdn.net/roku/xml/Grid/HomeGrid.xml',
 'https://malimartv.s3-accelerate.amazonaws.com/roku/xml/Grid/HomeGrid.xml',
]
manifest = {}
seen = set()

def name_for(url):
    base = pathlib.PurePosixPath(urlparse(url).path).name or 'feed.xml'
    stem = base[:-4] if base.lower().endswith('.xml') else base
    return f"{stem}-{hashlib.sha256(url.encode()).hexdigest()[:10]}.xml"

def fetch(url, depth=0):
    if url in seen or depth > 3 or not url.startswith('https://'):
        return
    seen.add(url)
    req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 MalimarTVWeb/3'})
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            data=r.read()
    except Exception as e:
        print('WARN', url, e)
        return
    fn=name_for(url)
    (OUT/fn).write_bytes(data)
    manifest[url]=f'xml-cache/{fn}'
    print('OK', depth, url, '->', fn)
    try:
        root=ET.fromstring(data.decode('utf-8-sig'))
    except Exception as e:
        print('XML WARN', url, e); return
    for el in root.iter('feed'):
        child=(el.text or '').strip()
        if child.startswith('https://') and child.lower().split('?',1)[0].endswith('.xml'):
            fetch(child, depth+1)

for u in SEEDS: fetch(u)
(OUT/'manifest.json').write_text(json.dumps(manifest, indent=2, sort_keys=True), encoding='utf-8')
print(f'Cached {len(manifest)} XML feeds')
