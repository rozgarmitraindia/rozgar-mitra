import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

function initApp() {
  if (!getApps().length) initializeApp(firebaseConfig);
}

export function isFirebaseConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.messagingSenderId);
}

export function getFirebaseMessaging() {
  initApp();
  try {
    return getMessaging();
  } catch (e) {
    return null;
  }
}

async function resetMessagingStorage() {
  if (!("indexedDB" in window)) return;
  const names = ["firebase-messaging-database", "fcm_token_details_db"];
  await Promise.all(names.map((name) => new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = request.onerror = request.onblocked = () => resolve();
  })));
}

async function ensureMessagingServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { updateViaCache: "none" });
  try {
    await registration.update();
  } catch {
    // The existing registration can still be used.
  }
  return registration;
}

export async function requestToken(vapidKey, retry = true) {
  const messaging = getFirebaseMessaging();
  if (!messaging) return null;
  try {
    let registration = null;
    try {
      registration = await ensureMessagingServiceWorker();
    } catch (err) {
      console.warn('Service worker registration failed', err);
    }
    const options = registration ? { vapidKey, serviceWorkerRegistration: registration } : { vapidKey };
    const currentToken = await getToken(messaging, options);
    return currentToken;
  } catch (e) {
    if (retry && e?.name === "VersionError") {
      await resetMessagingStorage();
      return requestToken(vapidKey, false);
    }
    return null;
  }
}

export function onForegroundMessage(handler) {
  const messaging = getFirebaseMessaging();
  if (!messaging) return () => {};
  return onMessage(messaging, handler);
}
