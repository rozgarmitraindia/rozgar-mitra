import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema({
  complainant: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  againstUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  module: String,
  entityId: String,
  subject: String,
  message: String,
  contactName: String,
  contactEmail: { type: String, lowercase: true, trim: true },
  contactMobile: String,
  adminReply: String,
  repliedAt: Date,
  repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  status: { type: String, enum: ["open", "inReview", "resolved", "rejected"], default: "open" },
  adminReason: String,
}, { timestamps: true });

complaintSchema.index({ status: 1, createdAt: -1 });
complaintSchema.index({ contactEmail: 1, createdAt: -1 });

export const Complaint = mongoose.model("Complaint", complaintSchema);
