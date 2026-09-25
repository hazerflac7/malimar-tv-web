#!/usr/bin/env python3
from pathlib import Path
p=Path("app.js")
s=p.read_text()
s=s.replace("streamUrl:q(n,'streamUrl')||''", "streamUrl:q(n,'streamUrl')||'',id:q(n,'id')||'',show:q(n,'show')||''")
marker="\nasync function openShow("
pos=s.find(marker)
if pos < 0:
    raise SystemExit("openShow marker not found")
before=s[:pos]
after=s[pos:]
close=before.rfind("\n}")
if close < 0:
    raise SystemExit("openItem closing brace not found")
leaf='''\n  // v6: activate leaf/live entries that have no child XML feed.\n  if(!item.feed){\n    if(item.id){\n      location.href=CONFIG.episodePage+encodeURIComponent(item.id)+(item.show?'?show='+encodeURIComponent(item.show):'');\n      return;\n    }\n    if(item.streamUrl){\n      location.href=item.streamUrl;\n      return;\n    }\n  }\n'''
if "// v6: activate leaf/live entries" not in s:
    before=before[:close]+leaf+before[close:]
s=before+after
p.write_text(s)
print("Applied v6 app.js leaf routing patch")
