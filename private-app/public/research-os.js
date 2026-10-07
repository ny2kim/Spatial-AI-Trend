const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let TOPICS=[],CORPUS=[],SELECTED=null;
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
function show(id){$('.nav button[data-v]').forEach(b=>b.classList.toggle('active',b.dataset.v===id));$('.view').forEach(v=>v.classList.toggle('active',v.id===id));if(id==='library')loadLibrary()}
$('.nav button[data-v]').forEach(b=>b.onclick=()=>show(b.dataset.v));

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
function renderMap(){
 const box=$('#topic-map');if(!TOPICS.length){box.innerHTML='<div class="empty">No topics.</div>';return}
 const W=1200,H=760,pos=new Map(),roots=TOPICS.filter(t=>!t.parent||!TOPICS.some(x=>x.name===t.parent)),levels=[roots];
 for(let l=1;l<4;l++){const next=[];(levels[l-1]||[]).forEach(p=>TOPICS.filter(x=>x.parent===p.name).forEach(x=>{if(!next.includes(x))next.push(x)}));if(next.length)levels.push(next)}
 const placed=levels.flat();TOPICS.filter(t=>!placed.includes(t)).forEach(t=>levels[0].push(t));
 levels.forEach((nodes,l)=>{const gap=W/(nodes.length+1);nodes.forEach((t,i)=>pos.set(t.name,{x:gap*(i+1),y:90+l*190}))});
 const edges=TOPICS.filter(t=>t.parent&&pos.has(t.parent)&&pos.has(t.name)).map(t=>{const a=pos.get(t.parent),b=pos.get(t.name);return '<line x1="'+a.x+'" y1="'+a.y+'" x2="'+b.x+'" y2="'+b.y+'" stroke="#40506c" stroke-width="2"/>'}).join('');
 const nodes=TOPICS.map((t,i)=>{const p=pos.get(t.name)||{x:80,y:80},c=t.status==='established'?'#7dd3fc':t.status==='emerging'?'#86efac':'#fde68a';return '<g class="map-node" data-i="'+i+'" transform="translate('+p.x+','+p.y+')"><circle r="50" fill="#18243c" stroke="'+c+'" stroke-width="3"/><text text-anchor="middle" fill="#eef4ff" font-size="11">'+esc(t.name.slice(0,20))+'</text></g>'}).join('');
 box.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" style="min-width:950px;width:100%;height:'+H+'px">'+edges+nodes+'</svg>';
 $$('.map-node').forEach(n=>n.onclick=()=>{const t=TOPICS[Number(n.dataset.i)];show('radar');renderDetail(t)})
}
async function loadLibrary(){
 try{
   const j=await api('/api/library'),folders=j.folders||[],map=new Map();
   folders.forEach(f=>(f.papers||[]).forEach(p=>{const id=p.arxiv_id||p.id||p.url||p.title;if(!map.has(id))map.set(id,{...p,folders:[]});map.get(id).folders.push(f.name)}));
   const rows=[...map.values()];$('#library-empty').style.display=rows.length?'none':'block';
   $('#library-body').innerHTML=rows.map(p=>{const id=p.arxiv_id||p.id||'',url=p.url||(/^[0-9]{4}\.[0-9]+/.test(id)?'https://arxiv.org/abs/'+id:''),alpha=url.includes('arxiv.org')?url.replace('arxiv.org','www.alphaxiv.org'):url;return '<tr><td><input class="pick" type="checkbox" data-url="'+esc(url)+'"></td><td><b style="color:#eef4ff">'+esc(p.title||id)+'</b></td><td>'+p.folders.map(x=>'<span class="tag">'+esc(x)+'</span>').join('')+'</td><td><a class="btn" target="_blank" rel="noopener noreferrer" href="'+esc(alpha||'#')+'">Analyze</a></td></tr>'}).join('')
 }catch(e){$('#library-empty').style.display='block';$('#library-empty').textContent='Library unavailable: '+e.message}
}
$('#refresh-library').onclick=loadLibrary;
$('#notebook-selected').onclick=async()=>{
 const urls=$$('.pick:checked').map(x=>x.dataset.url).filter(Boolean);if(!urls.length)return toast('Select at least one paper.');
 const win=window.open('https://notebooklm.google.com/','_blank','noopener');const txt=urls.join('\n');
 try{await navigator.clipboard.writeText(txt);toast(urls.length+' paper URL'+(urls.length>1?'s':'')+' copied. Paste into NotebookLM → Add sources.')}catch{prompt('Copy these URLs and paste into NotebookLM → Add sources:',txt)}
 if(!win)toast('NotebookLM popup was blocked. Allow popups and click again.')
};
async function processIncoming(){
 const q=new URLSearchParams(location.search),a=q.get('action'),paper=q.get('paper');if(!a||!paper)return;
 if(a==='save'){try{const folder=q.get('folder')||'Want to read';await api('/api/save',{method:'POST',body:JSON.stringify({paper,folderName:folder})});toast('Saved to alphaXiv → '+folder);history.replaceState({},'',location.pathname);show('library');await loadLibrary()}catch(e){toast('Save failed: '+e.message)}}
 if(a==='track'){try{const topic=q.get('topic')||'Unsorted';let arr=await getPrivate('topics');if(!Array.isArray(arr))arr=[];let t=arr.find(x=>x.name===topic);if(!t){t={name:topic,status:'candidate',parent:null,subtopics:[],papers:[]};arr.push(t)}if(!t.papers.includes(paper))t.papers.push(paper);await putPrivate('topics',arr);toast('Tracked → '+topic);history.replaceState({},'',location.pathname);await loadTopics();show('radar')}catch(e){toast('Track failed: '+e.message)}}
}
loadTopics();processIncoming();