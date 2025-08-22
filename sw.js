self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open('se-v1').then(c=> c.addAll(['./','index.html','script.js','seed.js','manifest.json','icons/icon-192.png','icons/icon-512.png'])));
});
self.addEventListener('activate', (e)=>{ e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (e)=>{
  e.respondWith(
    caches.match(e.request).then(resp => resp || fetch(e.request).then(r => {
      const clone = r.clone();
      caches.open('se-v1').then(c=> c.put(e.request, clone));
      return r;
    }).catch(()=> caches.match('index.html')))
  );
});
