// ===================================================
// 🔔 OneSignal Service Worker for Web + iOS PWA
// ===================================================

importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

self.addEventListener('install', event => {
console.log('✅ OneSignal SW installed');
});

self.addEventListener('activate', event => {
console.log('✅ OneSignal SW activated');
});

// 可以自訂顯示內容（可選）
self.addEventListener('notificationclick', function(event) {
event.notification.close();
const url = event.notification.data?.url || 'https://safecrossinghk.github.io/';
event.waitUntil(clients.openWindow(url));
});