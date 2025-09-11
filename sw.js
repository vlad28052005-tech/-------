self.addEventListener('install', function(e) {
    e.waitUntil(caches.open('rozklad-v1').then(function(cache) {
        return cache.addAll(['./', '/index.html', '/manifest.json', '/icon.png']).catch(() => {});
    }));
    self.skipWaiting();
});
self.addEventListener('activate', function(e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function(e) {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).catch(() => r)));
});