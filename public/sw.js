// MIND'S GAMBIT SERVICE WORKER — SILENT UNREGISTER
// Replaces previous SWs. Unregisters itself on activation.
// Does NOT navigate clients (which previously caused an infinite reload loop).
// Date: 2026-05-29 v2

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await self.clients.claim();
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    await self.registration.unregister();
    // Intentionally do NOT call client.navigate() — that creates a reload loop
    // because BaseLayout body re-registers /sw.js on every page load. We're
    // removing that registration in a separate file edit; once both ship, the
    // SW stays unregistered for good.
  })());
});

self.addEventListener('fetch', (event) => {
  return;
});
