import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  actorRole: String,
  action: { type: String, required: true },
  module: { type: String, required: true },
  entityId: String,
  entityModel: String,
  status: String,
  reason: String,
  metadata: mongoose.Schema.Types.Mixed,
  ipAddress: String,
}, { timestamps: true });

activityLogSchema.index({ module: 1, createdAt: -1 });
activityLogSchema.index({ actor: 1, createdAt: -1 });

export const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);
