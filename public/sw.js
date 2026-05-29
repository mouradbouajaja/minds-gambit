// MIND'S GAMBIT SERVICE WORKER — KILL SWITCH
// Replaces previous SW. On activation, unregisters itself and reloads all clients.
// After this, no SW is registered for mindsgambit.com.
// Date: 2026-05-29

self.addEventListener('install', (event) => {
  // Activate this SW immediately, skip the "waiting" state
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Take control of all open clients
    await self.clients.claim();
    // Delete every cache
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    // Unregister this service worker
    await self.registration.unregister();
    // Tell every open client to reload — fetches will go through fresh, no SW
    const clientList = await self.clients.matchAll({ type: 'window' });
    for (const client of clientList) {
      // Use navigate() with the same URL to force a full reload
      try {
        if (client.url && 'navigate' in client) {
          await client.navigate(client.url);
        }
      } catch (e) {
        // navigate() can fail for cross-origin; ignore
      }
    }
  })());
});

self.addEventListener('fetch', (event) => {
  // Don't intercept anything — pass through to network
  return;
});
