const CACHE_NAME = 'rozklad-v4';
const APP_SHELL = [
    './', './index.html', './script.js', './config.js', './data/schedules.js',
    './manifest.json', './icon.png', './pascal.png', './rapunzel.png', './Slytherin.png'
];

self.addEventListener('install', function(e) {
    e.waitUntil(caches.open(CACHE_NAME).then(function(cache) {
        return cache.addAll(APP_SHELL).catch(function() {});
    }));
    self.skipWaiting();
});

// Видаляємо кеші попередніх версій
self.addEventListener('activate', function(e) {
    e.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(cacheNames.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)));
        }).then(() => self.clients.claim())
    );
});

// Лише власні файли застосунку: спочатку мережа, без мережі — кеш.
// Запити до Supabase та інших сервісів не чіпаємо: для них є окремий фолбек у script.js.
self.addEventListener('fetch', function(e) {
    const url = new URL(e.request.url);
    if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

    e.respondWith(
        fetch(e.request).then(function(response) {
            if (response.ok) {
                const copy = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(url.pathname, copy));
            }
            return response;
        }).catch(function() {
            return caches.match(e.request, { ignoreSearch: true }).then(function(hit) {
                return hit || (e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error());
            });
        })
    );
});
