// very small offline SW - caches root and index for simple offline usage
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open('sched-v1').then(cache => cache.addAll(['./', './index.html', './manifest.json', './icon.png']).catch(() => {}))
    );
    self.skipWaiting();
});
self.addEventListener('activate', event => { event.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(resp => resp || fetch(event.request).catch(() => resp))
    );
});