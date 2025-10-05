importScripts('https://cdn.onesignal.com/sdks/OneSignalSDKWorker.js');

self.addEventListener('push', function(event) {
console.log('[Custom SW] 收到 push event:', event);
let payload = {};
if (event.data) {
try { payload = event.data.json(); }
catch (e) { payload = { title: '新通知', body: event.data.text() }; }
}
const title = payload.title || '通知';
const options = {
body: payload.body || '你有新消息',
icon: payload.icon || '/icons/icon-192x192.png',
badge: payload.badge || '/icons/badge-72x72.png',
data: payload.data || { url: '/' }
};
event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
console.log('[Custom SW] notificationclick event:', event);
event.notification.close();
const clickUrl = event.notification.data.url || '/';
event.waitUntil(
clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
for (let i = 0; i < clientList.length; i++) {
const client = clientList[i];
if (client.url === clickUrl && 'focus' in client) return client.focus();
}
if (clients.openWindow) return clients.openWindow(clickUrl);
})
);
});