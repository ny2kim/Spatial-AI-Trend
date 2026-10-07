const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let TOPICS=[],CORPUS=[],SELECTED=null,LIBRARY_ROWS=[],LIBRARY_FOLDERS=[],MAP_TRACKED_ONLY=false;
const STARTER=[
{name:'VLM / LVLM',status:'established',parent:null,subtopics:['Multimodal ICL','Spatial Reasoning','Visual Memory','Multi-view VLM','Recurrent VLM']},
{name:'Multimodal ICL',status:'established',parent:'VLM / LVLM',subtopics:['Demo selection','Visual usage','Counterfactual ICL','Multi-turn ICL']},
{name:'Spatial Reasoning',status:'established',parent:'VLM / LVLM',subtopics:['Metric reasoning','3D grounding','Geometry tools']},
{name:'Visual Memory',status:'emerging',parent:'VLM / LVLM',subtopics:['Persistent visual state','Episodic memory','Retrieval memory']},
{name:'Multi-view VLM',status:'emerging',parent:'VLM / LVLM',subtopics:['Cross-view consistency','View selection','Patient-level aggregation']},
{name:'Agentic VLM',status:'emerging',parent:'VLM / LVLM',subtopics:['Tool use','Visual search','Memory','Dynamic routing']},
{name:'VLA / Embodied',status:'established',parent:null,subtopics:['Robot policies','Embodied reasoning','Runtime safety']},
{name:'World Models / Physical AI',status:'established',parent:null,subtopics:['World-action models','Video prediction','Dynamics modeling']},
{name:'Geospatial AI',status:'established',parent:null,subtopics:['Remote sensing VLM','Visual search','Spatial grounding']},
{name:'Agentic Models / AI Agents',status:'established',parent:null,subtopics:['Agent runtimes','Tool use','Approval / gating','Control planes']},
{name:'Decision Models / System-One',status:'emerging',parent:'Agentic Models / AI Agents',subtopics:['Typed decisions','Model routing','Skill routing','Approval / gating']},
{name:'Generative Modeling',status:'established',parent:null,subtopics:['Diffusion','Flow matching','Coverage / diversity']},
{name:'Recurrent VLM',status:'candidate',parent:'VLM / LVLM',subtopics:['Model loop','Module loop','Test-time compute']},
{name:'World-Action Models',status:'emerging',parent:'World Models / Physical AI',subtopics:['Unified reasoner / world / action']},
{name:'Visual Search',status:'emerging',parent:'Geospatial AI',subtopics:['Progressive search','Reward-guided exploration']}
];
function esc(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function toast(m){const t=$('#toast');t.textContent=m;t.style.display='block';clearTimeout(t._timer);t._timer=setTimeout(()=>t.style.display='none',3500)}
async function api(path,opt={}){const r=await fetch(path,{credentials:'include',headers:{'Content-Type':'application/json',...(opt.headers||{})},...opt});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||('HTTP '+r.status));return j}
async function getPrivate(key){try{return (await api('/api/private-data?key='+encodeURIComponent(key))).value??[]}catch{return []}}
async function putPrivate(key,value){return api('/api/private-data?key='+encodeURIComponent(key),{method:'PUT',body:JSON.stringify({value})})}
function show(id){$$('.nav button[data-v]').forEach(b=>b.classList.toggle('active',b.dataset.v===id));$$('.view').forEach(v=>v.classList.toggle('active',v.id===id));if(id==='library')loadLibrary()}
$$('.nav button[data-v]').forEach(b=>b.onclick=()=>show(b.dataset.v));

async function loadTopics(){
 let arr=await getPrivate('topics');
 if(!Array.isArray(arr))arr=[];
 for(const s of STARTER){
   let t=arr.find(x=>x.name===s.name);
   if(!t){arr.push({...s,papers:[],createdAt:new Date().toISOString()});continue}
   if(t.parent==null&&s.parent)t.parent=s.parent;
   if(!Array.isArray(t.subtopics)||!t.subtopics.length)t.subtopics=s.subtopics;
   if(!Array.isArray(t.papers))t.papers=[];
 }
 TOPICS=arr;
 try{CORPUS=(await api('/api/corpus')).papers||[]}catch(e){CORPUS=[];toast('Paper corpus unavailable: '+e.message)}
 try{await putPrivate('topics',TOPICS)}catch{}
 renderTopics();renderMap()
}
function dateOf(p){const d=new Date((p.date||'')+'T00:00:00Z');return isNaN(d)?null:d}
function papersFor(t){const ex=new Set((t.papers||[]).map(String));return CORPUS.filter(p=>(p.topics||[]).includes(t.name)||ex.has(p.id)||ex.has(p.source_url)||ex.has(p.pdf_url))}
function metrics(t){
 const ps=papersFor(t),now=new Date(),d90=new Date(now.getTime()-90*864e5),d180=new Date(now.getTime()-180*864e5);
 const recent=ps.filter(p=>{const d=dateOf(p);return d&&d>=d90}).length;
 const prior=ps.filter(p=>{const d=dateOf(p);return d&&d>=d180&&d<d90}).length;
 return{ps,y25:ps.filter(p=>String(p.date||'').startsWith('2025')).length,y26:ps.filter(p=>String(p.date||'').startsWith('2026')).length,recent,prior}
}
function renderTopics(){
 $('#topics').innerHTML=TOPICS.map((t,i)=>{const m=metrics(t);return '<div class="card topic-card" data-i="'+i+'"><div class="status '+esc(t.status||'candidate')+'">'+esc(t.status||'candidate')+'</div><h2>'+esc(t.name)+'</h2><p><b style="color:#eef4ff">'+m.ps.length+'</b> tracked papers · '+m.y26+' in 2026</p><p class="muted">Last 90d '+m.recent+' · Prior 90d '+m.prior+'</p><div>'+((t.subtopics||[]).slice(0,4).map(x=>'<span class="tag">'+esc(x)+'</span>').join(''))+'</div></div>'}).join('');
 $$('.topic-card').forEach(c=>c.onclick=()=>renderDetail(TOPICS[Number(c.dataset.i)]));
 if(TOPICS.length)renderDetail(TOPICS.find(t=>t.name===SELECTED)||TOPICS[0])
}
function renderDetail(t){
 SELECTED=t.name;const m=metrics(t),venues={};m.ps.forEach(p=>venues[p.venue||'Other']=(venues[p.venue||'Other']||0)+1);
 const ps=[...m.ps].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))),box=$('#topic-detail');box.hidden=false;
 box.innerHTML='<div class="status '+esc(t.status||'candidate')+'">'+esc(t.status||'candidate')+'</div><h2>'+esc(t.name)+'</h2><div class="metricgrid"><div class="metric"><b>'+m.y25+'</b><span>2025 tracked</span></div><div class="metric"><b>'+m.y26+'</b><span>2026 tracked</span></div><div class="metric"><b>'+m.recent+'</b><span>last 90 days</span></div><div class="metric"><b>'+m.prior+'</b><span>previous 90 days</span></div></div><div class="detailgrid"><div><h3>Related papers</h3>'+(ps.length?ps.map(p=>'<div class="paper"><div class="muted">'+esc(p.date||'')+' · '+esc(p.venue||'')+'</div><b>'+esc(p.title||'Untitled')+'</b><div class="toolbar" style="margin-top:6px"><a class="btn" target="_blank" rel="noopener noreferrer" href="'+esc(p.source_url||'#')+'">Paper</a>'+(p.pdf_url?'<a class="btn" target="_blank" rel="noopener noreferrer" href="'+esc(p.pdf_url)+'">PDF</a>':'')+'</div></div>').join(''):'<div class="empty">No tracked papers yet.</div>')+'</div><div><h3>Venue breakdown</h3>'+Object.entries(venues).sort((a,b)=>b[1]-a[1]).map(([v,n])=>'<div class="venue"><span>'+esc(v)+'</span><b>'+n+'</b></div>').join('')+'<h3 style="margin-top:16px">Subtopics</h3>'+((t.subtopics||[]).map(x=>'<span class="tag">'+esc(x)+'</span>').join(''))+'</div></div>'
}
function mapVisibleTopics(){
 if(!MAP_TRACKED_ONLY)return TOPICS;
 const keep=new Set(TOPICS.filter(t=>papersFor(t).length>0).map(t=>t.name));
 let changed=true;
 while(changed){changed=false;TOPICS.forEach(t=>{if(keep.has(t.name)&&t.parent&&!keep.has(t.parent)){keep.add(t.parent);changed=true}})}
 return TOPICS.filter(t=>keep.has(t.name))
}
function renderMap(){
 const box=$('#topic-map'),visible=mapVisibleTopics();
 if(!visible.length){box.innerHTML='<div class="empty">No tracked topics yet.</div>';return}
 const W=1200,H=760,pos=new Map(),roots=visible.filter(t=>!t.parent||!visible.some(x=>x.name===t.parent)),levels=[roots];
 for(let l=1;l<5;l++){const next=[];(levels[l-1]||[]).forEach(p=>visible.filter(x=>x.parent===p.name).forEach(x=>{if(!next.includes(x))next.push(x)}));if(next.length)levels.push(next)}
 const placed=levels.flat();visible.filter(t=>!placed.includes(t)).forEach(t=>levels[0].push(t));
 levels.forEach((nodes,l)=>{const gap=W/(nodes.length+1);nodes.forEach((t,i)=>pos.set(t.name,{x:gap*(i+1),y:95+l*175}))});
 const edges=visible.filter(t=>t.parent&&pos.has(t.parent)&&pos.has(t.name)).map(t=>{const a=pos.get(t.parent),b=pos.get(t.name);return '<line class="map-edge" data-a="'+esc(t.parent)+'" data-b="'+esc(t.name)+'" x1="'+a.x+'" y1="'+a.y+'" x2="'+b.x+'" y2="'+b.y+'"/>'}).join('');
 const nodes=visible.map(t=>{const p=pos.get(t.name)||{x:80,y:80},c=t.status==='established'?'#7dd3fc':t.status==='emerging'?'#86efac':'#fde68a',count=papersFor(t).length,r=38+Math.min(18,count*3);return '<g class="map-node" data-name="'+esc(t.name)+'" transform="translate('+p.x+','+p.y+')"><circle r="'+r+'" fill="#18243c" stroke="'+c+'" stroke-width="3"/><text text-anchor="middle" fill="#eef4ff" font-size="11" y="-2">'+esc(t.name.slice(0,20))+'</text><text text-anchor="middle" fill="#9eacc5" font-size="9" y="14">'+count+' papers</text></g>'}).join('');
 box.innerHTML='<svg id="topic-map-svg" viewBox="0 0 '+W+' '+H+'" aria-label="Interactive topic map">'+edges+nodes+'</svg>';
 const svg=$('#topic-map-svg');
 const reset=()=>svg.setAttribute('viewBox','0 0 '+W+' '+H);
 $('#map-reset').onclick=reset;
 $('#map-tracked').classList.toggle('primary',MAP_TRACKED_ONLY);
 $('#map-tracked').textContent=MAP_TRACKED_ONLY?'Show all topics':'Tracked only';
 $('#map-tracked').onclick=()=>{MAP_TRACKED_ONLY=!MAP_TRACKED_ONLY;renderMap()};
 $$('.map-node').forEach(n=>{
   n.onclick=()=>{const t=TOPICS.find(x=>x.name===n.dataset.name);if(t){show('radar');renderDetail(t)}};
   n.onmouseenter=()=>{const name=n.dataset.name;$$('.map-node').forEach(x=>x.classList.toggle('map-dim',x.dataset.name!==name&&!visible.some(t=>(t.name===name&&t.parent===x.dataset.name)||(t.name===x.dataset.name&&t.parent===name))));$$('.map-edge').forEach(e=>e.classList.toggle('map-hot',e.dataset.a===name||e.dataset.b===name))};
   n.onmouseleave=()=>{$$('.map-node').forEach(x=>x.classList.remove('map-dim'));$$('.map-edge').forEach(e=>e.classList.remove('map-hot'))}
 });
 svg.addEventListener('wheel',e=>{e.preventDefault();const vb=svg.viewBox.baseVal,scale=e.deltaY>0?1.12:.88,pt=svg.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;const p=pt.matrixTransform(svg.getScreenCTM().inverse()),nw=vb.width*scale,nh=vb.height*scale;vb.x=p.x-(p.x-vb.x)*scale;vb.y=p.y-(p.y-vb.y)*scale;vb.width=nw;vb.height=nh},{passive:false});
 let drag=null;
 svg.addEventListener('pointerdown',e=>{if(e.target.closest('.map-node'))return;svg.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,vx:svg.viewBox.baseVal.x,vy:svg.viewBox.baseVal.y,w:svg.viewBox.baseVal.width,h:svg.viewBox.baseVal.height}});
 svg.addEventListener('pointermove',e=>{if(!drag)return;const rect=svg.getBoundingClientRect();svg.viewBox.baseVal.x=drag.vx-(e.clientX-drag.x)*drag.w/rect.width;svg.viewBox.baseVal.y=drag.vy-(e.clientY-drag.y)*drag.h/rect.height});
 svg.addEventListener('pointerup',()=>drag=null);svg.addEventListener('pointercancel',()=>drag=null);
}
function arxivIdFromPaper(p){
 const vals=[p.arxiv_id,p.arxivId,p.id,p.url,p.paper_url].filter(Boolean).map(String);
 for(const v of vals){const m=v.match(/(?:arxiv:)?(\d{4}\.\d{4,5})(?:v\d+)?/i);if(m)return m[1]}
 return ''
}
function normalizedLibraryRow(p,folders){
 const id=arxivIdFromPaper(p),url=id?'https://arxiv.org/abs/'+id:(p.url||p.paper_url||''),alpha=id?'https://www.alphaxiv.org/abs/'+id:(p.alpha_url||'');
 return {...p,_id:id||p.id||p.title,_url:url,_alpha:alpha,folders:[...new Set(folders)],publication_date:p.publication_date||p.published_at||p.date||''}
}
function statusOf(p){return ['Completed','Reading','Want to read'].find(x=>p.folders.includes(x))||''}
function customFoldersOf(p){return p.folders.filter(x=>!['Want to read','Reading','Completed'].includes(x))}
function renderLibrary(){
 const q=($('#library-search').value||'').trim().toLowerCase(),status=$('#status-filter').value,folder=$('#folder-filter').value,sort=$('#library-sort').value;
 let rows=LIBRARY_ROWS.filter(p=>(!q||String(p.title||p._id).toLowerCase().includes(q))&&(!status||p.folders.includes(status))&&(!folder||p.folders.includes(folder)));
 rows.sort((a,b)=>sort==='newest'?String(b.publication_date||'').localeCompare(String(a.publication_date||'')):sort==='oldest'?String(a.publication_date||'').localeCompare(String(b.publication_date||'')):String(a.title||a._id).localeCompare(String(b.title||b._id)));
 $('#library-empty').style.display=rows.length?'none':'block';
 $('#library-body').innerHTML=rows.map((p,i)=>{
   const st=statusOf(p),custom=customFoldersOf(p),paperKey=p._url||p._id;
   const statusSelect='<select class="status-select" data-key="'+esc(paperKey)+'">'+(!st?'<option value="" selected disabled>No status</option>':'')+['Want to read','Reading','Completed'].map(x=>'<option '+(x===st?'selected':'')+'>'+x+'</option>').join('')+'</select>';
   const chips=custom.length?custom.map(x=>'<span class="tag folder-chip">'+esc(x)+' <button class="chip-x" data-remove-folder="'+esc(x)+'" data-key="'+esc(paperKey)+'" title="Remove from folder">×</button></span>').join(''):'<span class="muted">—</span>';
   const options=LIBRARY_FOLDERS.filter(x=>!['Want to read','Reading','Completed'].includes(x.name)&&!custom.includes(x.name)).map(x=>'<option value="'+esc(x.name)+'">'+esc(x.name)+'</option>').join('');
   const add=options?'<div class="folder-add"><select class="folder-select" data-key="'+esc(paperKey)+'"><option value="">Add folder…</option>'+options+'</select><button class="btn add-folder-btn" data-key="'+esc(paperKey)+'">Add</button></div>':'';
   return '<tr><td><input class="pick" type="checkbox" data-url="'+esc(p._url)+'" data-alpha="'+esc(p._alpha)+'"></td><td><b class="paper-title">'+esc(p.title||p._id)+'</b><div class="muted">'+esc(p.publication_date||'')+'</div></td><td>'+statusSelect+'</td><td>'+chips+add+'</td><td><div class="toolbar"><a class="btn primary" target="_blank" rel="noopener noreferrer" href="'+esc(p._alpha||p._url||'#')+'">◈ alphaXiv / Chat</a><a class="btn" target="_blank" rel="noopener noreferrer" href="'+esc(p._url||'#')+'">Paper</a></div></td></tr>'
 }).join('');
 bindLibraryRowActions()
}
function bindLibraryRowActions(){
 $$('.status-select').forEach(s=>s.onchange=async()=>{s.disabled=true;try{await api('/api/library-update',{method:'POST',body:JSON.stringify({paper:s.dataset.key,action:'set_status',folderName:s.value})});toast('Status → '+s.value);await loadLibrary()}catch(e){toast('Status update failed: '+e.message);s.disabled=false}});
 $$('.add-folder-btn').forEach(b=>b.onclick=async()=>{const sel=document.querySelector('.folder-select[data-key="'+CSS.escape(b.dataset.key)+'"]'),name=sel?.value;if(!name)return; b.disabled=true;try{await api('/api/library-update',{method:'POST',body:JSON.stringify({paper:b.dataset.key,action:'add_folder',folderName:name})});toast('Added to '+name);await loadLibrary()}catch(e){toast('Folder update failed: '+e.message);b.disabled=false}});
 $$('[data-remove-folder]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await api('/api/library-update',{method:'POST',body:JSON.stringify({paper:b.dataset.key,action:'remove_folder',folderName:b.dataset.removeFolder})});toast('Removed from '+b.dataset.removeFolder);await loadLibrary()}catch(e){toast('Folder update failed: '+e.message);b.disabled=false}})
}
async function loadLibrary(){
 try{
   const j=await api('/api/library'),folders=j.folders||[],map=new Map();LIBRARY_FOLDERS=folders.map(f=>({name:f.name,id:f.folder_id||f.id,type:f.type}));
   folders.forEach(f=>(f.papers||[]).forEach(p=>{const id=arxivIdFromPaper(p)||p.id||p.url||p.title;if(!map.has(id))map.set(id,{paper:p,folders:[]});map.get(id).folders.push(f.name)}));
   LIBRARY_ROWS=[...map.values()].map(x=>normalizedLibraryRow(x.paper,x.folders));
   const custom=LIBRARY_FOLDERS.filter(x=>!['Want to read','Reading','Completed'].includes(x.name));
   $('#folder-filter').innerHTML='<option value="">All folders</option>'+custom.map(x=>'<option>'+esc(x.name)+'</option>').join('');
   renderLibrary()
 }catch(e){$('#library-empty').style.display='block';$('#library-empty').textContent='Library unavailable: '+e.message}
}
['#library-search','#status-filter','#folder-filter','#library-sort'].forEach(id=>{const el=$(id);if(el)el.oninput=renderLibrary;if(el&&el.tagName==='SELECT')el.onchange=renderLibrary});
$('#refresh-library').onclick=loadLibrary;
$('#notebook-selected').onclick=async()=>{
 const picks=$$('.pick:checked'),urls=picks.map(x=>x.dataset.url).filter(Boolean);if(!urls.length)return toast('Select at least one paper.');
 const win=window.open('https://notebooklm.google.com/','_blank','noopener');const txt=urls.join('\n');
 try{await navigator.clipboard.writeText(txt);toast(urls.length+' source URL'+(urls.length>1?'s':'')+' copied. In NotebookLM choose Add sources and paste.')}catch{prompt('Copy these URLs and paste into NotebookLM → Add sources:',txt)}
 if(!win)toast('NotebookLM popup was blocked. Use alphaXiv / Chat instead.')
};
$('#alphaxiv-selected').onclick=()=>{
 const links=$$('.pick:checked').map(x=>x.dataset.alpha).filter(Boolean);if(!links.length)return toast('Select at least one paper.');
 if(links.length===1){window.open(links[0],'_blank','noopener');return}
 const first=window.open(links[0],'_blank','noopener');navigator.clipboard?.writeText(links.join('\n')).catch(()=>{});toast('Opened the first alphaXiv paper; all '+links.length+' alphaXiv links were copied for the rest.');if(!first)toast('Popup blocked. Use each row’s alphaXiv / Chat button.')
};
async function processIncoming(){
 const q=new URLSearchParams(location.search),a=q.get('action'),paper=q.get('paper');if(!a||!paper)return;
 if(a==='save'){try{const folder=q.get('folder')||'Want to read';await api('/api/save',{method:'POST',body:JSON.stringify({paper,folderName:folder})});toast('Saved to alphaXiv → '+folder);history.replaceState({},'',location.pathname);show('library');await loadLibrary()}catch(e){toast('Save failed: '+e.message)}}
 if(a==='track'){try{const topic=q.get('topic')||'Unsorted';let arr=await getPrivate('topics');if(!Array.isArray(arr))arr=[];let t=arr.find(x=>x.name===topic);if(!t){t={name:topic,status:'candidate',parent:null,subtopics:[],papers:[]};arr.push(t)}if(!t.papers.includes(paper))t.papers.push(paper);await putPrivate('topics',arr);toast('Tracked → '+topic);history.replaceState({},'',location.pathname);await loadTopics();show('radar')}catch(e){toast('Track failed: '+e.message)}}
}
window.addEventListener('error',e=>{
  const box=document.querySelector('#radar');
  if(box && !document.querySelector('#runtime-error')){
    const d=document.createElement('div');
    d.id='runtime-error';
    d.className='empty';
    d.style.marginTop='14px';
    d.textContent='Research OS runtime error: '+(e.message||'unknown error');
    box.prepend(d);
  }
});
Promise.allSettled([loadTopics(),processIncoming()]).then(results=>{
  results.forEach(r=>{if(r.status==='rejected')toast('Research OS error: '+(r.reason?.message||r.reason))})
});