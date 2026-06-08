// Self-destroying service worker.
//
// A previous version of this file cached the app shell. That left some browsers
// serving a stale bundle after a deploy, because a service worker keeps serving
// its own cache even after the normal browser cache is cleared. This version
// caches nothing: it deletes any caches a prior worker created, unregisters
// itself, and (once) reloads open tabs so they fetch the current build straight
// from the network. After it has cleaned up, no service worker remains.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.clients.claim();
    try { await self.registration.unregister(); } catch (e) {}
    // Only reload when we actually cleared a stale cache, so this can't loop.
    if (keys.length > 0) {
      const wins = await self.clients.matchAll({ type: 'window' });
      wins.forEach((c) => { try { c.navigate(c.url); } catch (e) {} });
    }
  })());
});
// No 'fetch' handler on purpose: requests go straight to the network.
