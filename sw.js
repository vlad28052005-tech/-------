const CACHE_NAME = 'rozklad-v3'; // Змінили назву кешу

self.addEventListener('install', function(e) {
    e.waitUntil(caches.open(CACHE_NAME).then(function(cache) {
        return cache.addAll(['./', './index.html', './script.js', './manifest.json', './icon.png']).catch(function() {});
    }));
    self.skipWaiting();
});

// Цей блок АВТОМАТИЧНО видаляє старі завислі файли
self.addEventListener('activate', function(e) {
    e.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName); // Видаляємо старий кеш
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Завжди спочатку йдемо в інтернет, а якщо його немає — беремо з кешу
self.addEventListener('fetch', function(e) {
    e.respondWith(
        fetch(e.request).catch(function() {
            return caches.match(e.request);
        })
    );
});