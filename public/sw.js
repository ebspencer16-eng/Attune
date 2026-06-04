// Minimal service worker. Network passthrough, no caching, so there is never a
// stale bundle to clear after a deploy. Present so the registration in index.html
// succeeds instead of 404-ing. A caching strategy can be added later if wanted.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
