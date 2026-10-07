const CALLFOCUS_SW_VERSION = '14.6-retired';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil((async()=>{
    try{ await self.registration.unregister(); }catch{}
    try{ const clients = await self.clients.matchAll({type:'window',includeUncontrolled:true}); for(const client of clients){ try{ client.postMessage({type:'CALLFOCUS_SW_RETIRED',version:CALLFOCUS_SW_VERSION}); }catch{} } }catch{}
  })());
});
// No fetch handler: all requests go directly to the network/Cloudflare Worker.
