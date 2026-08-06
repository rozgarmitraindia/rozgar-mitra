// Firebase Messaging Service Worker
// NOTE: Replace the firebaseConfig below with your project's config values.

importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyDSjK12QaTMOehqviIoTLZ-DGhdo43yqV4",
  authDomain: "rozgar-mitra-india.firebaseapp.com",
  projectId: "rozgar-mitra-india",
  storageBucket: "rozgar-mitra-india.firebasestorage.app",
  messagingSenderId: "445194861368",
  appId: "1:445194861368:web:1762f353d2b1de5f0bdfcd",
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  try {
    const notification = payload.notification || {};
    const title = notification.title || payload.data?.title || 'Rozgar Mitra';
    const options = {
      body: notification.body || payload.data?.body || '',
      data: payload.data || {},
    };
    self.registration.showNotification(title, options);
  } catch (e) {
    console.error('Background message handling error', e);
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.matchAll({ type: 'window' }).then(windowClients => {
    for (let client of windowClients) {
      if (client.url === url && 'focus' in client) return client.focus();
    }
    if (clients.openWindow) return clients.openWindow(url);
  }));
});
