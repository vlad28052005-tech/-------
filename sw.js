self.addEventListener('install', event => {
  console.log('Service Worker: install');
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('Service Worker: activate');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', event => {
  try{
    const data = event.data || {};
    if(data && data.type === 'SHOW_NOTIFICATION'){
      self.registration.showNotification(data.title || 'Повідомлення', {
        body: data.body || '',
        tag: 'schedule-notif',
        renotify: true
      });
    }
  }catch(e){}
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({type:'window'}).then(clients => {
    if(clients.length > 0) return clients[0].focus();
    return self.clients.openWindow('/');
  }));
});

self.addEventListener('fetch', event => {
  // minimal; could add caching strategy here
});
