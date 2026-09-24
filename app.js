const CONFIG={
  homeXml:'https://xml.malimarcdn.net/roku/xml/Grid/HomeGrid.xml',
  homeXmlFallback:'https://malimartv.s3-accelerate.amazonaws.com/roku/xml/Grid/HomeGrid.xml',
  showXmlBase:'https://malimartv.s3-accelerate.amazonaws.com/roku/xml/Home/',
  episodePage:'https://www.malimar.tv/episodes/'
};
const DEMO=[
 {title:'Treasure Lovers',show:'TreasureLovers26',image:'https://i.malimarcdn.com/ThaiDrama26/TreasureLovers26HDF.jpg'},
 {title:'Naktop Ban Khokpang 2',show:'NaktopBanKhokpang226',image:'https://i.malimarcdn.com/ThaiDrama26/NaktopBanKhokpang226HDF.jpg'}
];
let rows=[],focus={row:0,col:0},mode='home',episodeFocus=0,lastCard=null;
const app=document.querySelector('#app'),modal=document.querySelector('#modal'),detail=document.querySelector('#detail'),status=document.querySelector('#status'),closeBtn=document.querySelector('#close');
const text=(el,names)=>{for(const n of names){const x=el.querySelector(n);if(x?.textContent?.trim())return x.textContent.trim()}return''};
const attr=(el,names)=>{for(const n of names){const x=el.querySelector(n);if(x?.textContent?.trim())return x.textContent.trim();const a=el.getAttribute?.(n);if(a)return a}return''};
async function getXml(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);return new DOMParser().parseFromString(await r.text(),'text/xml')}
function normalizeHome(xml){
 const candidates=[...xml.querySelectorAll('item,Item,show,Show,thumbnail,Thumbnail,content,Content')];
 const seen=new Set(),items=[];
 for(const n of candidates){let title=text(n,['title','Title','name','Name','description','Description']);let image=text(n,['hdposterurl','HDPosterUrl','sdposterurl','SDPosterUrl','image','Image','poster','Poster','thumbnail','Thumbnail']);let show=text(n,['show','Show','id','ID','contentId','ContentId','key','Key']);let feed=text(n,['xml','Xml','feed','Feed','url','Url']);
  if(!title)title=n.getAttribute('title')||n.getAttribute('name')||''; if(!image)image=n.getAttribute('image')||n.getAttribute('poster')||''; if(!show)show=n.getAttribute('id')||'';
  if(feed&&!show){const m=feed.match(/\/([^/]+)\.xml(?:\?|$)/i);if(m)show=m[1]}
  if(title&&(show||feed||image)){const k=title+'|'+show;if(!seen.has(k)){seen.add(k);items.push({title,show,image,feed})}}
 }
 return items;
}
function group(items){return [{title:'Featured',items:items.slice(0,12)},{title:'Malimar Shows',items:items.slice(12,36).length?items.slice(12,36):items}].filter(r=>r.items.length)}
async function boot(){let items=[];for(const u of [CONFIG.homeXml,CONFIG.homeXmlFallback]){try{items=normalizeHome(await getXml(u));if(items.length)break}catch(e){}}
 if(!items.length){items=DEMO;status.textContent='Demo catalog • live XML blocked by browser/CORS'}else status.textContent=items.length+' titles';rows=group(items);renderHome();focusCard(0,0)}
function renderHome(){app.innerHTML=`<section class="hero"><div><h1>Malimar TV</h1><p>A TV-first browser interface. Use the remote D-pad to move, OK/Enter to select, and Back/Escape to return.</p></div></section>`+rows.map((r,ri)=>`<section class="row"><h2>${esc(r.title)}</h2><div class="rail" data-row="${ri}">${r.items.map((x,ci)=>`<div class="card" tabindex="-1" data-row="${ri}" data-col="${ci}">${x.image?`<img src="${esc(x.image)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'placeholder',textContent:'M'}))">`:`<div class="placeholder">M</div>`}<div class="meta"><div class="title">${esc(x.title)}</div><div class="sub">Press OK</div></div></div>`).join('')}</div></section>`).join('')}
function focusCard(r,c){if(!rows.length)return;r=Math.max(0,Math.min(rows.length-1,r));c=Math.max(0,Math.min(rows[r].items.length-1,c));document.querySelector('.focused')?.classList.remove('focused');focus={row:r,col:c};const el=document.querySelector(`.card[data-row="${r}"][data-col="${c}"]`);el?.classList.add('focused');el?.scrollIntoView({block:'nearest',inline:'center',behavior:'smooth'})}
async function openShow(item){lastCard={...focus};mode='detail';modal.classList.remove('hidden');detail.innerHTML=`<div class="showhead">${item.image?`<img src="${esc(item.image)}">`:`<div class="placeholder">M</div>`}<div><h1>${esc(item.title)}</h1><p>Loading episodes…</p></div></div>`;let eps=[];
 const url=item.feed|| (item.show?CONFIG.showXmlBase+item.show+'.xml':''); if(url){try{eps=normalizeEpisodes(await getXml(url),item.show)}catch(e){}}
 if(!eps.length&&item.show==='TreasureLovers26')eps=Array.from({length:9},(_,i)=>({id:'EP'+(284041+i),title:'Episode '+(i+1),date:'',show:item.show}));
 renderDetail(item,eps);episodeFocus=eps.length?0:-1;focusDetail()}
function normalizeEpisodes(xml,show){const out=[];for(const n of xml.querySelectorAll('item,Item,episode,Episode,content,Content')){const id=text(n,['id','ID','episodeId','EpisodeId','contentId','ContentId'])||n.getAttribute('id')||'';const title=text(n,['title','Title','name','Name'])||'Episode';const date=text(n,['releaseDate','ReleaseDate','date','Date']);const num=text(n,['episodeNumber','EpisodeNumber']);if(id||num)out.push({id,title:num&&!/episode/i.test(title)?`${title} • Episode ${num}`:title,date,show})}return out}
function renderDetail(item,eps){detail.innerHTML=`<div class="showhead">${item.image?`<img src="${esc(item.image)}">`:`<div class="placeholder">M</div>`}<div><h1>${esc(item.title)}</h1><p>${eps.length?eps.length+' episodes':'No episode list could be loaded in this browser.'}</p><p class="notice">Playback opens Malimar's episode webpage rather than the raw HLS URL, matching the working path discovered during testing.</p></div></div><div class="episodes">${eps.map((e,i)=>`<div class="episode" data-i="${i}" data-id="${esc(e.id)}" data-show="${esc(e.show||item.show||'')}"><strong>${esc(e.title)}</strong><span>${esc(e.date||'Press OK to play')}</span></div>`).join('')}</div>`}
function focusDetail(){document.querySelector('.focused')?.classList.remove('focused');if(episodeFocus<0){closeBtn.classList.add('focused');return}const e=document.querySelector(`.episode[data-i="${episodeFocus}"]`);e?.classList.add('focused');e?.scrollIntoView({block:'nearest',behavior:'smooth'})}
function playEpisode(el){const id=el.dataset.id,show=el.dataset.show;if(!id)return;location.href=CONFIG.episodePage+encodeURIComponent(id)+(show?'?show='+encodeURIComponent(show):'')}
function goBack(){if(mode==='detail'){modal.classList.add('hidden');mode='home';focusCard(lastCard?.row||0,lastCard?.col||0)}else history.back()}
document.addEventListener('keydown',e=>{const k=e.key,code=e.keyCode;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter','Escape','Backspace'].includes(k)||[4,13,19,20,21,22,23,37,38,39,40].includes(code))e.preventDefault();if(k==='Escape'||k==='Backspace'||code===4)return goBack();if(mode==='home'){if(k==='ArrowLeft'||code===21||code===37)focusCard(focus.row,focus.col-1);else if(k==='ArrowRight'||code===22||code===39)focusCard(focus.row,focus.col+1);else if(k==='ArrowUp'||code===19||code===38)focusCard(focus.row-1,focus.col);else if(k==='ArrowDown'||code===20||code===40)focusCard(focus.row+1,focus.col);else if(k==='Enter'||code===13||code===23)openShow(rows[focus.row].items[focus.col]);}else{const es=[...document.querySelectorAll('.episode')];if(k==='ArrowLeft'||code===21||code===37)episodeFocus=Math.max(0,episodeFocus-1);else if(k==='ArrowRight'||code===22||code===39)episodeFocus=Math.min(es.length-1,episodeFocus+1);else if(k==='ArrowUp'||code===19||code===38)episodeFocus=Math.max(0,episodeFocus-4);else if(k==='ArrowDown'||code===20||code===40)episodeFocus=Math.min(es.length-1,episodeFocus+4);else if(k==='Enter'||code===13||code===23){if(episodeFocus>=0)playEpisode(es[episodeFocus]);}focusDetail();}});
closeBtn.addEventListener('click',goBack);document.addEventListener('click',e=>{const c=e.target.closest('.card');if(c){focusCard(+c.dataset.row,+c.dataset.col);openShow(rows[+c.dataset.row].items[+c.dataset.col])}const ep=e.target.closest('.episode');if(ep)playEpisode(ep)});
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}boot();
