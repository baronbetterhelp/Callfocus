const CACHE='toolcart-shell-v2-5';
const SHELL=['/','/styles.css?v=2.5.0','/app.js','/toolcart-logo.png','/icon-192.svg','/icon-512.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const req=event.request,url=new URL(req.url);
  if(req.method!=='GET'||url.pathname.startsWith('/api/')||url.pathname.startsWith('/media/'))return;
  if(url.pathname==='/admin'||url.pathname==='/admin/'||url.pathname==='/admin.html'||url.pathname==='/admin.js'||url.pathname==='/admin.css')return;
  event.respondWith(fetch(req).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));return res;}).catch(()=>caches.match(req).then(r=>r||caches.match('/'))));
});
