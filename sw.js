const CACHE_VERSION = 'little-learning-v2';
const PDF_CACHE = 'little-learning-workbooks-v1';
const APP_SHELL = ["./","./index.html","./css/app.css","./js/app.js","./js/core.js","./js/voice.js","./js/math-game.js","./data/anastasia.json","./data/vivian.json","./manifest.webmanifest","./images/anastasia-unicorn.png","./images/vivian-dinosaur.png","./icons/icon-192.png","./icons/icon-512.png","./icons/icon-maskable-512.png"];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_VERSION).then(cache=>cache.addAll(APP_SHELL)));});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const name of await caches.keys())if(name.startsWith('little-learning-')&&![CACHE_VERSION,PDF_CACHE].includes(name))await caches.delete(name);await self.clients.claim();})());});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
  if(url.pathname.endsWith('.pdf')){
    event.respondWith((async()=>{const cached=await caches.match(request);if(cached)return cached;try{const response=await fetch(request);if(response.ok&&response.headers.get('content-type')?.includes('pdf')){const cache=await caches.open(PDF_CACHE);await cache.put(request,response.clone());}return response;}catch{return new Response('Connect to download this workbook for the first time.',{status:503,headers:{'Content-Type':'text/plain'}});}})());return;
  }
  event.respondWith((async()=>{const cache=await caches.open(CACHE_VERSION);const cached=await cache.match(request,{ignoreSearch:true});if(cached)return cached;if(request.mode==='navigate'){return await cache.match(new URL('./index.html',self.registration.scope))||fetch(request);}return fetch(request);})());
});
