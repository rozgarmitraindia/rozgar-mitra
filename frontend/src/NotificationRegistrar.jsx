import { useEffect } from 'react';
import { requestToken, onForegroundMessage, isFirebaseConfigured, isPushSupported } from './firebaseClient.js';
import { apiFetch, isLoggedIn } from './utils/auth.js';
import { useToast } from './contexts/ToastContext.jsx';

async function showForegroundBrowserNotification(title, body, data = {}) {
  if (!isPushSupported() || Notification.permission !== 'granted') return;
  const options = {
    body,
    data,
    icon: '/rozgar-mitra-logo.png',
    badge: '/favicon.svg',
  };
  try {
    const registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    if (registration?.showNotification) {
      await registration.showNotification(title, options);
      return;
    }
  } catch {
    // Fall back to the window Notification constructor below.
  }
  try {
    new Notification(title, options);
  } catch {
    // Some browsers disallow foreground constructor usage.
  }
}

export default function NotificationRegistrar() {
  const toast = useToast();

  useEffect(() => {
    let unsub = () => {};
    let cancelled = false;

    async function setup() {
      if (!isFirebaseConfigured() || !isPushSupported()) return;
      try {
        if (!isLoggedIn()) return;
        if (Notification.permission === 'default') {
          const perm = await Notification.requestPermission();
          if (cancelled) return;
          if (perm !== 'granted') {
            toast.show('Notifications not granted', 'info');
            return;
          }
        }
        if (Notification.permission !== 'granted') return;
        const vapid = import.meta.env.VITE_FIREBASE_VAPID_KEY;
        const token = await requestToken(vapid);
        if (token) {
          try { await apiFetch('/notifications/register', { method: 'POST', body: JSON.stringify({ token }) }); } catch (e) { /* ignore */ }
        }
        unsub = onForegroundMessage((payload) => {
          const title = payload.notification?.title || payload.data?.title || 'Notification';
          const body = payload.notification?.body || payload.data?.body || '';
          toast.show(`${title}: ${body}`, 'info', 8000);
          showForegroundBrowserNotification(title, body, payload.data || {});
        });
      } catch {
        // Notification registration is optional; keep the app quiet if the browser/backend is unavailable.
      }
    }

    function setupAfterAuthChange() {
      try { unsub(); } catch {}
      unsub = () => {};
      setup();
    }

    setup();
    window.addEventListener('rozgar:auth-change', setupAfterAuthChange);
    return () => {
      cancelled = true;
      window.removeEventListener('rozgar:auth-change', setupAfterAuthChange);
      try { unsub(); } catch {}
    };
  }, [toast]);

  return null;
}
