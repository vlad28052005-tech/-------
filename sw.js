self.addEventListener('install', function(e) {
    e.waitUntil(caches.open('rozklad-v2').then(function(cache) {
        return cache.addAll(['./', './index.html', './script.js', './manifest.json', './icon.png']).catch(function() {});
    }));
    self.skipWaiting();
});

self.addEventListener('activate', function(e) {
    e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', function(e) {
    // Стратегія "Network First": завжди намагаємось взяти свіжі дані з мережі
    e.respondWith(
        fetch(e.request).catch(function() {
            // Якщо інтернету немає, віддаємо збережений офлайн кеш
            return caches.match(e.request);
        })
    );
});