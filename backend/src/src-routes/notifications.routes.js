import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { getFirebaseAdmin } from "../services/firebase.service.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";
import { User } from "../models/User.js";
import { createNotification, getUserNotifications, getUnreadCount, markAsRead, markAllAsRead } from "../services/notification.service.js";

async function sendMulticast(firebase, tokens, payload) {
  if (!tokens || tokens.length === 0) return [];
  const chunkSize = 500; // FCM limit
  const results = [];
  for (let i = 0; i < tokens.length; i += chunkSize) {
    const batch = tokens.slice(i, i + chunkSize);
    try {
      const resp = await firebase.messaging().sendMulticast({ tokens: batch, ...payload });
      results.push(resp);
    } catch (e) {
      console.error('FCM sendMulticast error', e);
    }
  }
  return results;
}

export const notificationsRouter = Router();
notificationsRouter.use("/broadcast", requireAuth, requireRole("admin", "superAdmin"));

notificationsRouter.get("/", requireAuth, async (req, res) => {
  const items = await getUserNotifications(req.user._id, { limit: 100 });
  return sendSuccess(res, { message: "Notifications fetched", data: { items } });
});

notificationsRouter.get("/unread-count", requireAuth, async (req, res) => {
  const count = await getUnreadCount(req.user._id);
  return sendSuccess(res, { message: "Unread count fetched", data: { unreadCount: count } });
});

notificationsRouter.patch("/:id/read", requireAuth, async (req, res) => {
  const item = await markAsRead(req.user._id, req.params.id);
  if (!item) return sendError(res, { statusCode: 404, code: "NOTIFICATION_NOT_FOUND", message: "Notification not found" });
  return sendSuccess(res, { message: "Notification marked as read", data: { item } });
});

notificationsRouter.patch("/read-all", requireAuth, async (req, res) => {
  await markAllAsRead(req.user._id);
  return sendSuccess(res, { message: "All notifications marked as read" });
});

notificationsRouter.post("/push", requireAuth, async (req, res) => {
  const firebase = getFirebaseAdmin();
  if (!firebase) return sendError(res, { statusCode: 500, code: "FIREBASE_NOT_CONFIGURED", message: "Firebase admin not configured" });
  const messageId = await firebase.messaging().send({
    token: req.body.token,
    notification: {
      title: req.body.title || "Rozgar Mitra",
      body: req.body.body || "New update available",
    },
    data: req.body.data || {},
  });
  return sendSuccess(res, { message: "Push notification sent", data: { messageId } });
});

notificationsRouter.post('/register', requireAuth, async (req, res) => {
  const token = req.body?.token;
  if (!token) return sendError(res, { statusCode: 400, code: 'TOKEN_REQUIRED', message: 'Token is required' });
  const user = req.user;
  user.pushTokens = Array.from(new Set([...(user.pushTokens || []), token]));
  await user.save();
  return sendSuccess(res, { message: 'Token registered' });
});

notificationsRouter.post('/unregister', requireAuth, async (req, res) => {
  const token = req.body?.token;
  if (!token) return sendError(res, { statusCode: 400, code: 'TOKEN_REQUIRED', message: 'Token is required' });
  const user = req.user;
  user.pushTokens = (user.pushTokens || []).filter(t => t !== token);
  await user.save();
  return sendSuccess(res, { message: 'Token unregistered' });
});

notificationsRouter.post('/broadcast/new-post', requireAuth, async (req, res) => {
  // Broadcast a notification to users of a specific role when a new post is created
  const { title, body, role } = req.body;
  const firebase = getFirebaseAdmin();
  if (!firebase) return sendError(res, { statusCode: 500, code: 'FIREBASE_NOT_CONFIGURED', message: 'Firebase admin not configured' });
  const filter = role ? { role } : { }; 
  const users = await User.find(filter).select('pushTokens');
  const tokens = users.flatMap(u => u.pushTokens || []);
  await sendMulticast(firebase, tokens, { notification: { title: title || 'New post', body: body || 'A new post is available' } });
  return sendSuccess(res, { message: 'Broadcast sent' });
});
