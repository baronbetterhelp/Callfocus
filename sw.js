self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request).catch(() => new Response('CallFocus is temporarily unavailable.', {status: 503, headers:{'Content-Type':'text/plain'}})));
});
