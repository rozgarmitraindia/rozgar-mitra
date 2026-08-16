import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

let firebaseAdmin = null;
const INVALID_TOKEN_CODES = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
  "messaging/invalid-argument",
]);

function stringifyDataValue(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function normalizeData(data = {}) {
  return Object.fromEntries(
    Object.entries(data)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, stringifyDataValue(value)]),
  );
}

function normalizePayload(payload = {}) {
  return {
    ...payload,
    data: normalizeData({
      title: payload.notification?.title,
      body: payload.notification?.body,
      ...(payload.data || {}),
    }),
    webpush: {
      ...(payload.webpush || {}),
      fcmOptions: {
        link: payload.data?.url || payload.webpush?.fcmOptions?.link || "/",
        ...(payload.webpush?.fcmOptions || {}),
      },
      notification: {
        icon: "/rozgar-mitra-logo.png",
        badge: "/favicon.svg",
        ...(payload.webpush?.notification || {}),
      },
    },
  };
}

export function getFirebaseAdmin() {
  if (firebaseAdmin) return firebaseAdmin;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) return null;

  const app = getApps()[0] || initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });

  firebaseAdmin = {
    app,
    messaging: () => getMessaging(app),
  };
  return firebaseAdmin;
}

export async function sendPushNotification(tokens, payload) {
  const firebase = getFirebaseAdmin();
  if (!firebase || !tokens || tokens.length === 0) return null;
  const uniqueTokens = [...new Set(tokens.filter(Boolean))];
  if (!uniqueTokens.length) return null;
  const safePayload = normalizePayload(payload);

  const chunks = [];
  for (let i = 0; i < uniqueTokens.length; i += 500) {
    chunks.push(uniqueTokens.slice(i, i + 500));
  }

  const results = [];
  const invalidTokens = [];
  for (const chunk of chunks) {
    try {
      const resp = await firebase.messaging().sendEachForMulticast({ tokens: chunk, ...safePayload });
      resp.responses?.forEach((item, index) => {
        if (!item.success && INVALID_TOKEN_CODES.has(item.error?.code)) {
          invalidTokens.push(chunk[index]);
        }
      });
      results.push(resp);
    } catch (error) {
      console.error("Firebase push error", error);
    }
  }
  return { results, invalidTokens };
}
