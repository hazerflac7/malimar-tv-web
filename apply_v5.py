#!/usr/bin/env python3
from pathlib import Path
p=Path("app.js")
s=p.read_text()

old="""  // Some HomeGrid rows contain another catalog layer. Load it as a temporary native row instead of guessing playback.
  if(item.feed){
    try{
      const items=parseCatalog(await getXml(item.feed));
      if(items.length){
        lastCard={...focus};
        activeShow={title:item.title,image:item.image,description:item.description,items};
        mode='submenu';
        renderSubmenu(activeShow);
        episodeFocus=0;
        focusSubmenu();
        return;
      }
    }catch(e){}
  }
}"""
new="""  // Some HomeGrid rows contain another catalog layer.
  if(item.feed){
    try{
      const items=parseCatalog(await getXml(item.feed));
      if(items.length){
        lastCard={...focus};
        activeShow={title:item.title,image:item.image,description:item.description,items};
        mode='submenu';
        renderSubmenu(activeShow);
        episodeFocus=0;
        focusSubmenu();
        return;
      }
    }catch(e){ console.warn('Nested feed failed',item.feed,e); }
  }

  // Leaf items (not another XML catalog) need an activation path.
  // Prefer Malimar's own web route when an item id is supplied; otherwise
  // allow a public/free stream URL to be handed to the WebView.
  if(item.id){
    location.href=CONFIG.episodePage+encodeURIComponent(item.id)+(item.show?'?show='+encodeURIComponent(item.show):'');
    return;
  }
  if(item.streamUrl){
    location.href=item.streamUrl;
    return;
  }
}"""
if old not in s:
    raise SystemExit("Expected openItem block not found; app.js was not modified.")
s=s.replace(old,new)
p.write_text(s)
print("Patched app.js for v5 leaf-item activation.")
