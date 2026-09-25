const CONFIG={
  homeGrid:'https://xml.malimarcdn.net/roku/xml/Grid/HomeGrid.xml',
  homeGridFallback:'https://malimartv.s3-accelerate.amazonaws.com/roku/xml/Grid/HomeGrid.xml',
  episodePage:'https://www.malimar.tv/episodes/'
};

let rows=[];
let xmlMirror={};
let focus={row:0,col:0};
let mode='home';
let episodeFocus=0;
let activeShow=null;
let lastCard=null;

const app=document.querySelector('#app');
const modal=document.querySelector('#modal');
const detail=document.querySelector('#detail');
const status=document.querySelector('#status');
const closeBtn=document.querySelector('#close');

const q=(el,name)=>el.querySelector(name)?.textContent?.trim()||'';
const cleanTitle=s=>String(s||'').replace(/^ROW\s*\d+\s*/i,'').trim();
const showKeyFromFeed=url=>{const m=String(url||'').match(/\/([^/?]+)\.xml(?:\?|$)/i);return m?m[1]:''};
const esc=(s='')=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function getXml(url){
  const source=xmlMirror[url]||url;
  const r=await fetch(source,{cache:'no-store',mode:xmlMirror[url]?'same-origin':'cors'});
  if(!r.ok)throw Error(`HTTP ${r.status} ${source}`);
  const xml=new DOMParser().parseFromString(await r.text(),'text/xml');
  const pe=xml.querySelector('parsererror');
  if(pe)throw Error('Invalid XML: '+url);
  return xml;
}

function parseHomeGrid(xml){
  return [...xml.querySelectorAll(':scope > item, feed > item')].map((n,i)=>({
    title:cleanTitle(q(n,'title'))||`Row ${i+1}`,
    feed:q(n,'feed'),
    image:n.getAttribute('hdImg')||n.getAttribute('sdImg')||'',
    type:q(n,'feed')?((n.querySelector('feed')?.getAttribute('type'))||'feed'):'feed'
  })).filter(x=>x.feed);
}

function parseCatalog(xml){
  return [...xml.querySelectorAll(':scope > item, feed > item')].map(n=>{
    const feedEl=n.querySelector('feed');
    const feed=feedEl?.textContent?.trim()||'';
    return {
      title:q(n,'title')||q(n,'titlel')||'Untitled',
      localTitle:q(n,'titlel'),
      description:q(n,'description'),
      image:n.getAttribute('hdImg')||n.getAttribute('sdImg')||'',
      feed,
      feedType:feedEl?.getAttribute('type')||'',
      show:showKeyFromFeed(feed),
      mweb:q(n,'Mweb'),
      msub:q(n,'MSUB'),
      mtoken:q(n,'MTOKEN'),
      id:q(n,'id'),
      streamUrl:q(n,'streamUrl')
    };
  }).filter(x=>x.title);
}

function parseEpisodes(xml,show){
  return [...xml.querySelectorAll(':scope > item, feed > item')].map(n=>({
    id:q(n,'id'),
    title:q(n,'title')||`Episode ${q(n,'episodeNumber')}`,
    localTitle:q(n,'titlel'),
    number:q(n,'episodeNumber'),
    date:q(n,'releaseDate'),
    length:q(n,'length'),
    show,
    image:n.getAttribute('hdImg')||n.getAttribute('sdImg')||'',
    streamUrl:q(n,'streamUrl'),
    msub:q(n,'MSUB'),
    mtoken:q(n,'MTOKEN')
  })).filter(x=>x.id);
}

async function boot(){
  status.textContent='Loading Malimar…';
  try{
    const mr=await fetch('xml-cache/manifest.json',{cache:'no-store'});
    if(mr.ok)xmlMirror=await mr.json();
  }catch(e){console.warn('XML mirror unavailable',e)}
  let grid;
  try{grid=await getXml(CONFIG.homeGrid)}catch(e){
    try{grid=await getXml(CONFIG.homeGridFallback)}catch(e2){return fatal('Malimar XML could not be loaded in this browser. '+e2.message)}
  }
  const rowDefs=parseHomeGrid(grid);
  if(!rowDefs.length)return fatal('HomeGrid loaded but contained no rows.');

  const loaded=await Promise.all(rowDefs.map(async r=>{
    try{
      const items=parseCatalog(await getXml(r.feed));
      return {...r,items};
    }catch(e){return {...r,items:[],error:e.message}}
  }));

  rows=loaded.filter(r=>r.items.length);
  if(!rows.length)return fatal('HomeGrid loaded, but no cached row feeds were available. Check the GitHub Pages sync workflow.');
  status.textContent=`${rows.length} rows • ${rows.reduce((n,r)=>n+r.items.length,0)} items`;
  renderHome();
  focusCard(0,0);
}

function fatal(msg){
  status.textContent='Load error';
  app.innerHTML=`<section class="hero"><div><h1>Malimar TV</h1><p>${esc(msg)}</p></div></section>`;
}

function renderHome(){
  app.innerHTML=`<section class="hero"><div><h1>Malimar TV</h1><p>TV-first navigation for Malimar. D-pad moves, OK opens, Back returns.</p></div></section>`+
    rows.map((r,ri)=>`<section class="row"><h2>${esc(r.title)}</h2><div class="rail" data-row="${ri}">${r.items.map((x,ci)=>cardHtml(x,ri,ci)).join('')}</div></section>`).join('');
}

function cardHtml(x,ri,ci){
  const badge=x.msub==='PR'?'Premium':(x.feedType==='episodes'?'Episodes':'Open');
  return `<div class="card" tabindex="-1" data-row="${ri}" data-col="${ci}">${x.image?`<img src="${esc(x.image)}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'placeholder',textContent:'M'}))">`:`<div class="placeholder">M</div>`}<div class="meta"><div class="title">${esc(x.title)}</div><div class="sub">${esc(badge)}</div></div></div>`;
}

function focusCard(r,c){
  if(!rows.length)return;
  r=Math.max(0,Math.min(rows.length-1,r));
  c=Math.max(0,Math.min(rows[r].items.length-1,c));
  document.querySelector('.focused')?.classList.remove('focused');
  focus={row:r,col:c};
  const el=document.querySelector(`.card[data-row="${r}"][data-col="${c}"]`);
  el?.classList.add('focused');
  el?.focus({preventScroll:true});
  el?.scrollIntoView({block:'nearest',inline:'center',behavior:'smooth'});
}

async function openItem(item){
  // The show feeds we discovered are explicitly type="episodes". Use those as the native episode screen.
  if(item.feed && (item.feedType==='episodes' || item.show)) return openShow(item);
  // Some HomeGrid rows contain another catalog layer.
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
  // v6: activate leaf/live entries that have no child XML feed.
  if(!item.feed){
    if(item.id){
      location.href=CONFIG.episodePage+encodeURIComponent(item.id)+(item.show?'?show='+encodeURIComponent(item.show):'');
      return;
    }
    if(item.streamUrl){
      location.href=item.streamUrl;
      return;
    }
  }

}

async function openShow(item){
  lastCard={...focus};
  activeShow=item;
  mode='detail';
  modal.classList.remove('hidden');
  detail.innerHTML=`<div class="showhead">${poster(item)}<div><h1>${esc(item.title)}</h1><p>${esc(item.description||'')}</p><p>Loading episodes…</p></div></div>`;
  let eps=[];
  try{eps=parseEpisodes(await getXml(item.feed),item.show)}catch(e){
    detail.innerHTML=`<div class="showhead">${poster(item)}<div><h1>${esc(item.title)}</h1><p>Episode feed failed: ${esc(e.message)}</p></div></div>`;
    episodeFocus=-1;focusDetail();return;
  }
  renderDetail(item,eps);
  episodeFocus=eps.length?0:-1;
  focusDetail();
}

function poster(item){return item.image?`<img src="${esc(item.image)}" alt="">`:`<div class="placeholder">M</div>`}

function renderDetail(item,eps){
  detail.innerHTML=`<div class="showhead">${poster(item)}<div><h1>${esc(item.title)}</h1>${item.localTitle?`<p class="local-title">${esc(item.localTitle)}</p>`:''}<p>${esc(item.description||'')}</p><p>${eps.length} episodes</p><p class="notice">Premium playback opens Malimar's normal episode webpage so Malimar handles the account/session authorization.</p></div></div><div class="episodes">${eps.map((e,i)=>`<div class="episode" tabindex="-1" data-i="${i}" data-id="${esc(e.id)}" data-show="${esc(e.show||item.show||'')}"><strong>${esc(e.number?`Episode ${e.number}`:e.title)}</strong><span>${esc(e.date||e.title)}</span></div>`).join('')}</div>`;
}

function renderSubmenu(menu){
  modal.classList.remove('hidden');
  detail.innerHTML=`<div class="showhead">${poster(menu)}<div><h1>${esc(menu.title)}</h1><p>${esc(menu.description||'')}</p><p>${menu.items.length} items</p></div></div><div class="episodes submenu">${menu.items.map((x,i)=>`<div class="episode submenu-item" tabindex="-1" data-i="${i}"><strong>${esc(x.title)}</strong><span>${esc(x.description||'Press OK')}</span></div>`).join('')}</div>`;
}

function focusDetail(){
  document.querySelector('.focused')?.classList.remove('focused');
  if(episodeFocus<0){closeBtn.classList.add('focused');closeBtn.focus();return}
  const e=document.querySelector(`.episode[data-i="${episodeFocus}"]`);
  e?.classList.add('focused');e?.focus({preventScroll:true});e?.scrollIntoView({block:'nearest',behavior:'smooth'});
}
function focusSubmenu(){focusDetail()}

function playEpisode(el){
  const id=el.dataset.id,show=el.dataset.show;
  if(!id)return;
  location.href=CONFIG.episodePage+encodeURIComponent(id)+(show?'?show='+encodeURIComponent(show):'');
}

function goBack(){
  if(mode==='detail'||mode==='submenu'){
    modal.classList.add('hidden');
    mode='home';activeShow=null;
    focusCard(lastCard?.row||0,lastCard?.col||0);
  }else history.back();
}

function moveDetail(delta){
  const es=[...document.querySelectorAll('.episode')];
  if(!es.length)return;
  episodeFocus=Math.max(0,Math.min(es.length-1,episodeFocus+delta));
  focusDetail();
}

document.addEventListener('keydown',e=>{
  const k=e.key,code=e.keyCode;
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter','Escape','Backspace'].includes(k)||[4,13,19,20,21,22,23,37,38,39,40].includes(code))e.preventDefault();
  if(k==='Escape'||k==='Backspace'||code===4)return goBack();
  if(mode==='home'){
    if(k==='ArrowLeft'||code===21||code===37)focusCard(focus.row,focus.col-1);
    else if(k==='ArrowRight'||code===22||code===39)focusCard(focus.row,focus.col+1);
    else if(k==='ArrowUp'||code===19||code===38)focusCard(focus.row-1,focus.col);
    else if(k==='ArrowDown'||code===20||code===40)focusCard(focus.row+1,focus.col);
    else if(k==='Enter'||code===13||code===23)openItem(rows[focus.row].items[focus.col]);
  }else{
    const es=[...document.querySelectorAll('.episode')];
    if(k==='ArrowLeft'||code===21||code===37)moveDetail(-1);
    else if(k==='ArrowRight'||code===22||code===39)moveDetail(1);
    else if(k==='ArrowUp'||code===19||code===38)moveDetail(-4);
    else if(k==='ArrowDown'||code===20||code===40)moveDetail(4);
    else if(k==='Enter'||code===13||code===23){
      if(episodeFocus<0)return;
      if(mode==='detail')playEpisode(es[episodeFocus]);
      else if(mode==='submenu')openItem(activeShow.items[episodeFocus]);
    }
  }
});

closeBtn.addEventListener('click',goBack);
document.addEventListener('click',e=>{
  const c=e.target.closest('.card');
  if(c){focusCard(+c.dataset.row,+c.dataset.col);openItem(rows[+c.dataset.row].items[+c.dataset.col]);return}
  const ep=e.target.closest('.episode');
  if(!ep)return;
  episodeFocus=+ep.dataset.i;
  if(mode==='detail')playEpisode(ep);
  else if(mode==='submenu')openItem(activeShow.items[episodeFocus]);
});

boot();
