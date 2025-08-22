let deferredPrompt = null;
window.addEventListener('beforeinstallprompt',(e)=>{ e.preventDefault(); deferredPrompt = e; });

// IndexedDB micro-wrapper
const DB = (()=>{
  let _db;
  const open = () => new Promise((resolve, reject)=>{
    const req = indexedDB.open('soulengine', 1);
    req.onupgradeneeded = (e)=>{
      const db = e.target.result;
      db.createObjectStore('scenes', {keyPath:'id'});
      db.createObjectStore('lore', {keyPath:'id'});
      db.createObjectStore('kv', {keyPath:'key'});
    };
    req.onsuccess = ()=>{ _db = req.result; resolve(_db); };
    req.onerror = ()=>reject(req.error);
  });
  const tx = (store, mode='readonly') => _db.transaction(store, mode).objectStore(store);
  const getAll = (store)=> new Promise((res, rej)=>{ const r=tx(store).getAll(); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
  const get = (store, key)=> new Promise((res, rej)=>{ const r=tx(store).get(key); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
  const put = (store, val)=> new Promise((res, rej)=>{ const r=tx(store,'readwrite').put(val); r.onsuccess=()=>res(); r.onerror=()=>rej(r.error); });
  const del = (store, key)=> new Promise((res, rej)=>{ const r=tx(store,'readwrite').delete(key); r.onsuccess=()=>res(); r.onerror=()=>rej(r.error); });
  return { open, getAll, get, put, del };
})();

const uid = ()=> 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
const wc = (s)=> (s||'').trim().split(/\s+/).filter(Boolean).length;

async function main(){
  await DB.open();
  await maybeSeed();
  bindTabs();
  renderScenes();
  renderLore();
  bindSettings();
  bindFooter();
  registerSW();
}

async function maybeSeed(){
  const seeded = await DB.get('kv','seeded');
  if (seeded && seeded.value) return;
  const seed = (window.__SOUL_ENGINE_SEED__||{});
  const now = Date.now();
  for(const s of (seed.scenes||[])){
    await DB.put('scenes', { id: uid(), created: now, updated: now, title: s.title, pov: s.pov||'', loc: s.loc||'', body: s.body||'' });
  }
  for(const l of (seed.lore||[])){
    await DB.put('lore', { id: uid(), created: now, updated: now, title: l.title, body: l.body||'' });
  }
  await DB.put('kv', { key:'seeded', value:true });
}

function bindTabs(){
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(t => t.addEventListener('click', ()=>{
    tabs.forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    document.querySelectorAll('.panel').forEach(p=>p.classList.add('hide'));
    document.getElementById(t.dataset.tab).classList.remove('hide');
  }));

  document.getElementById('newScene').onclick = ()=> openSceneEditor();
  document.getElementById('newLore').onclick = ()=> openLoreEditor();
  document.getElementById('sceneSearch').oninput = renderScenes;
  document.getElementById('loreSearch').oninput = renderLore;
}

async function renderScenes(){
  const q = (document.getElementById('sceneSearch').value||'').toLowerCase();
  const list = document.getElementById('sceneList');
  list.innerHTML='';
  let items = await DB.getAll('scenes');
  items.sort((a,b)=> (b.updated||0) - (a.updated||0));
  items
   .filter(x=> !q || (x.title||'').toLowerCase().includes(q) || (x.body||'').toLowerCase().includes(q))
   .forEach(x=>{
      const card = document.createElement('div');
      card.className='card';
      card.innerHTML = `
        <strong>${x.title||'(Untitled)'}</strong>
        <div class="meta">${new Date(x.updated||x.created||Date.now()).toLocaleString()} · ${wc(x.body)} words ${x.pov? '· ' + x.pov : ''} ${x.loc? '· ' + x.loc : ''}</div>
        <div class="actions">
          <button data-id="${x.id}" class="open">Open</button>
        </div>`;
      card.querySelector('.open').onclick = ()=> openSceneEditor(x.id);
      list.appendChild(card);
   });
}

async function renderLore(){
  const q = (document.getElementById('loreSearch').value||'').toLowerCase();
  const list = document.getElementById('loreList');
  list.innerHTML='';
  let items = await DB.getAll('lore');
  items.sort((a,b)=> (b.updated||0) - (a.updated||0));
  items
   .filter(x=> !q || (x.title||'').toLowerCase().includes(q) || (x.body||'').toLowerCase().includes(q))
   .forEach(x=>{
      const card = document.createElement('div');
      card.className='card';
      card.innerHTML = `
        <strong>${x.title||'(Untitled)'}</strong>
        <div class="meta">${new Date(x.updated||x.created||Date.now()).toLocaleString()} · ${wc(x.body)} words</div>
        <div class="actions">
          <button data-id="${x.id}" class="open">Open</button>
        </div>`;
      card.querySelector('.open').onclick = ()=> openLoreEditor(x.id);
      list.appendChild(card);
   });
}

async function openSceneEditor(id){
  const tpl = document.getElementById('sceneEditorTpl').content.cloneNode(true);
  const wrap = document.createElement('div');
  wrap.appendChild(tpl);
  const title = wrap.querySelector('.title');
  const pov = wrap.querySelector('.pov');
  const loc = wrap.querySelector('.loc');
  const body = wrap.querySelector('.body');
  const count = wrap.querySelector('.count');

  let doc = id ? await DB.get('scenes', id) : { id: uid(), created: Date.now(), title:'', pov:'', loc:'', body:'' };
  title.value = doc.title||''; pov.value = doc.pov||''; loc.value = doc.loc||''; body.value = doc.body||'';
  count.textContent = `${wc(body.value)} words`;
  body.addEventListener('input', ()=> count.textContent = `${wc(body.value)} words`);

  wrap.querySelector('.save').onclick = async ()=>{
    doc.title = title.value.trim(); doc.pov = pov.value.trim(); doc.loc = loc.value.trim(); doc.body = body.value;
    doc.updated = Date.now();
    await DB.put('scenes', doc);
    document.body.removeChild(wrap);
    renderScenes();
  };
  wrap.querySelector('.del').onclick = async ()=>{
    if(confirm('Delete this scene?')){ await DB.del('scenes', doc.id); document.body.removeChild(wrap); renderScenes();}
  };
  wrap.querySelector('.speak').onclick = ()=> speakText(body.value);
  wrap.querySelector('.close').onclick = ()=> document.body.removeChild(wrap);
  Object.assign(wrap.style,{position:'fixed', inset:'0', overflow:'auto', background:'rgba(0,0,0,0.35)', padding:'12px'});
  document.body.appendChild(wrap);
}

async function openLoreEditor(id){
  const tpl = document.getElementById('loreEditorTpl').content.cloneNode(true);
  const wrap = document.createElement('div'); wrap.appendChild(tpl);
  const title = wrap.querySelector('.title');
  const body = wrap.querySelector('.body');

  let doc = id ? await DB.get('lore', id) : { id: uid(), created: Date.now(), title:'', body:'' };
  title.value = doc.title||''; body.value = doc.body||'';

  wrap.querySelector('.save').onclick = async ()=>{
    doc.title = title.value.trim(); doc.body = body.value;
    doc.updated = Date.now();
    await DB.put('lore', doc);
    document.body.removeChild(wrap);
    renderLore();
  };
  wrap.querySelector('.del').onclick = async ()=>{
    if(confirm('Delete this entry?')){ await DB.del('lore', doc.id); document.body.removeChild(wrap); renderLore();}
  };
  wrap.querySelector('.close').onclick = ()=> document.body.removeChild(wrap);
  Object.assign(wrap.style,{position:'fixed', inset:'0', overflow:'auto', background:'rgba(0,0,0,0.35)', padding:'12px'});
  document.body.appendChild(wrap);
}

function bindSettings(){
  const apiKey = document.getElementById('apiKey');
  const voiceId = document.getElementById('voiceId');
  DB.get('kv','tts').then(v => { if(v){ apiKey.value=v.apiKey||''; voiceId.value=v.voiceId||''; }});
  const saveKV = ()=> DB.put('kv', {key:'tts', apiKey: apiKey.value.trim(), voiceId: voiceId.value.trim()});
  apiKey.onchange = saveKV; voiceId.onchange = saveKV;

  document.getElementById('testTts').onclick = ()=> speakText("Soul Engine test. Hello, writer.");

  document.getElementById('exportBtn').onclick = exportJSON;
  document.getElementById('importFile').addEventListener('change', importJSON);
}

async function exportJSON(){
  const scenes = await DB.getAll('scenes');
  const lore = await DB.getAll('lore');
  const payload = { exportedAt: new Date().toISOString(), scenes, lore };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'soulengine_export.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

async function importJSON(ev){
  const file = ev.target.files[0];
  if(!file) return;
  const text = await file.text();
  const data = JSON.parse(text);
  const now = Date.now();
  for(const s of (data.scenes||[])){ s.id = s.id || uid(); s.updated = s.updated || now; await DB.put('scenes', s); }
  for(const l of (data.lore||[])){ l.id = l.id || uid(); l.updated = l.updated || now; await DB.put('lore', l); }
  alert('Import complete'); renderScenes(); renderLore();
}

function bindFooter(){
  document.getElementById('installBtn').onclick = async ()=>{
    if(deferredPrompt){ deferredPrompt.prompt(); deferredPrompt=null; }
    else alert('Safari → Share → Add to Home Screen.');
  };
  document.getElementById('backupBtn').onclick = exportJSON;
  document.getElementById('statsBtn').onclick = showStats;
}

async function showStats(){
  const scenes = await DB.getAll('scenes');
  const words = scenes.reduce((a,s)=> a + wc(s.body||''), 0);
  alert(`Scenes: ${scenes.length}\nTotal words: ${words}`);
}

async function speakText(text){
  if(!text || !text.trim()) return;
  const kv = await DB.get('kv','tts');
  if(kv && kv.apiKey && kv.voiceId){
    try{
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${kv.voiceId}`,{
        method:'POST',
        headers:{ 'xi-api-key': kv.apiKey, 'Content-Type':'application/json' },
        body: JSON.stringify({ text, model_id:'eleven_multilingual_v2', voice_settings:{stability:0.5, similarity_boost:0.7}})
      });
      if(!res.ok) throw new Error('TTS error');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play();
      return;
    }catch(e){ console.warn(e); }
  }
  if('speechSynthesis' in window){
    const utter = new SpeechSynthesisUtterance(text);
    speechSynthesis.speak(utter);
  }else{
    alert('Use iOS Speak Selection.');
  }
}

async function registerSW(){
  if('serviceWorker' in navigator){
    try{ await navigator.serviceWorker.register('sw.js'); }catch(e){ console.warn('SW fail', e); }
  }
}

main();
