import { Notification } from "../models/Notification.js";
import { User } from "../models/User.js";
import { sendMail } from "./mail.service.js";
import { sendPushNotification } from "./firebase.service.js";
import { emitNotificationToUser, emitNotificationToRole, emitGlobalNotification } from "../utils/socket.js";

function notificationUrlFor(metadata = {}, role = "") {
  const type = metadata?.type;
  if (type === "new_job" && metadata.jobId) return `/jobs/${metadata.jobId}`;
  if (type === "room_status" && metadata.roomId) return `/room-owner/rooms`;
  if (type === "job_status" && metadata.jobId) return `/employer/jobs`;
  if (type === "visit_request" || type === "visit_request_admin_review") return "/room-owner/visit-requests";
  if (type === "visit_request_rejected") return "/candidate/visit-requests";
  if (String(type || "").startsWith("room_")) return role === "roomOwner" ? "/room-owner/bookings" : "/candidate/booked-room";
  if (String(type || "").includes("interview")) return role === "employer" ? "/employer/applications" : "/interviews";
  if (String(type || "").includes("application") || ["hired", "employment_terminated"].includes(type)) return role === "employer" ? "/employer/applications" : "/applied-jobs";
  if (type === "account_status") return "/settings";
  if (role === "employer") return "/employer/notifications";
  if (role === "roomOwner") return "/room-owner/notifications";
  return "/notifications";
}

export async function createNotification({ recipient, targetRole, title, body, channel = "inApp", metadata = {}, sendEmail = false, sendPush = false, realtime = true, emailHtml = "", emailSubject = "" }) {
  const notificationPayload = {
    title,
    body,
    channel,
    metadata,
    status: "unread",
  };

  if (recipient) {
    const item = await Notification.create({ ...notificationPayload, recipient });
    const user = await User.findById(recipient);
    if (sendEmail && user?.email) {
      await sendMail({ to: user.email, subject: emailSubject || title, html: emailHtml || `<p>${body}</p>` });
    }
    if (sendPush && user?.pushTokens?.length) {
      const pushResult = await sendPushNotification(user.pushTokens, { notification: { title, body }, data: { type: metadata?.type || "notification", id: String(item._id), url: notificationUrlFor(metadata, user.role), ...metadata } });
      if (pushResult?.invalidTokens?.length) {
        await User.updateOne({ _id: user._id }, { $pull: { pushTokens: { $in: pushResult.invalidTokens } } });
      }
    }
    if (realtime) {
      emitNotificationToUser(recipient, { title, body, channel, metadata, id: item._id, createdAt: item.createdAt, status: item.status });
    }
    return item;
  }

  const roleFilter = targetRole ? { role: targetRole, status: "verified" } : { status: "verified" };
  const users = await User.find(roleFilter).select("pushTokens email").lean();
  const docs = users.map((user) => ({ ...notificationPayload, recipient: user._id }));
  const created = docs.length ? await Notification.insertMany(docs) : [];

  if (sendEmail) {
    await Promise.all(users.map((user) => user.email ? sendMail({ to: user.email, subject: emailSubject || title, html: emailHtml || `<p>${body}</p>` }) : Promise.resolve()));
  }

  if (sendPush) {
    const tokens = users.flatMap((user) => user.pushTokens || []);
    if (tokens.length) {
      const pushResult = await sendPushNotification(tokens, { notification: { title, body }, data: { type: metadata?.type || "notification", url: notificationUrlFor(metadata, targetRole), ...metadata } });
      if (pushResult?.invalidTokens?.length) {
        await User.updateMany({ pushTokens: { $in: pushResult.invalidTokens } }, { $pull: { pushTokens: { $in: pushResult.invalidTokens } } });
      }
    }
  }

  if (realtime) {
    if (targetRole) {
      emitNotificationToRole(targetRole, { title, body, channel, metadata, createdAt: new Date(), status: "unread" });
    } else {
      emitGlobalNotification({ title, body, channel, metadata, createdAt: new Date(), status: "unread" });
    }
  }
  return created;
}

export async function getUserNotifications(userId, options = {}) {
  const { limit = 100, skip = 0 } = options;
  return Notification.find({ recipient: userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
}

export async function getUnreadCount(userId) {
  return Notification.countDocuments({ recipient: userId, status: "unread" });
}

export async function markAsRead(userId, id) {
  const query = { _id: id, recipient: userId };
  const result = await Notification.findOneAndUpdate(query, { status: "read" }, { new: true });
  return result;
}

export async function markAllAsRead(userId) {
  const result = await Notification.updateMany({ recipient: userId, status: "unread" }, { status: "read" });
  return result;
}

export async function deleteUserNotification(userId, id) {
  return Notification.findOneAndDelete({ _id: id, recipient: userId });
}

export async function deleteAllUserNotifications(userId) {
  return Notification.deleteMany({ recipient: userId });
}

export async function deleteNotificationById(id) {
  return Notification.findByIdAndDelete(id);
}

export async function deleteAllNotifications(filter = {}) {
  return Notification.deleteMany(filter);
}
