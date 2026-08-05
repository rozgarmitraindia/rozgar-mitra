import admin from "firebase-admin";

let firebaseAdmin = null;

export function getFirebaseAdmin() {
  if (firebaseAdmin) return firebaseAdmin;
  if (!process.env.FIREBASE_PROJECT_ID) return null;
  firebaseAdmin = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
  return firebaseAdmin;
}
export async function sendPushNotification(tokens, payload) {
  const firebase = getFirebaseAdmin();
  if (!firebase || !tokens || tokens.length === 0) return null;

  const chunks = [];
  for (let i = 0; i < tokens.length; i += 500) {
    chunks.push(tokens.slice(i, i + 500));
  }

  const results = [];
  for (const chunk of chunks) {
    try {
      const resp = await firebase.messaging().sendEachForMulticast({ tokens: chunk, ...payload });
      results.push(resp);
    } catch (error) {
      console.error("Firebase push error", error);
    }
  }
  return results;
}
