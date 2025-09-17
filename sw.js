self.addEventListener('install', function(e) {
  e.waitUntil(caches.open('rozklad-v1').then(function(cache) {
    return cache.addAll(['./', './index.html', './script.js', './manifest.json', './icon.png']).catch(function(){});
  }));
  self.skipWaiting();
});
self.addEventListener('activate', function(e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function(e) {
  e.respondWith(caches.match(e.request).then(function(r){ return r || fetch(e.request).catch(function(){ return r; }); }));
});