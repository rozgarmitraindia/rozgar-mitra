import { useEffect } from 'react';
import { requestToken, onForegroundMessage, isFirebaseConfigured } from './firebaseClient.js';
import { apiFetch, isLoggedIn } from './utils/auth.js';
import { useToast } from './contexts/ToastContext.jsx';

export default function NotificationRegistrar() {
  const toast = useToast();

  useEffect(() => {
    let unsub = () => {};

    async function setup() {
      if (!isFirebaseConfigured()) return;
      try {
        if (!isLoggedIn()) return;
        if (Notification.permission === 'default') {
          const perm = await Notification.requestPermission();
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
        });
      } catch (e) {
        console.error('Notification setup error', e);
      }
    }

    setup();
    return () => { try { unsub(); } catch {} };
  }, [toast]);

  return null;
}
