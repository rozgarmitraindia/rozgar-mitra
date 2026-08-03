import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  title: String,
  body: String,
  channel: { type: String, enum: ["email", "push", "inApp", "system"], default: "inApp" },
  status: { type: String, enum: ["draft", "sent", "failed", "read", "unread"], default: "unread" },
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ status: 1, createdAt: -1 });

export const Notification = mongoose.model("Notification", notificationSchema);
