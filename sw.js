const CALLFOCUS_SW_VERSION = '14.5';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const request = event.request;
  const options = request.mode === 'navigate' ? { cache: 'no-store' } : undefined;
  event.respondWith(
    fetch(request, options).catch(() => new Response('CallFocus is temporarily unavailable.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' }
    }))
  );
});
