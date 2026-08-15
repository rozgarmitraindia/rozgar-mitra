import mongoose from "mongoose";

const rentPaymentSchema = new mongoose.Schema({
  billingMonth: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  paidOn: { type: Date, default: Date.now },
  method: { type: String, enum: ["cash", "upi", "bank", "other"], default: "cash" },
  note: String,
}, { timestamps: true });

const rentReminderSchema = new mongoose.Schema({
  billingMonth: String,
  amount: Number,
  sentAt: { type: Date, default: Date.now },
  channel: { type: String, default: "email" },
}, { _id: false });

const bookingSchema = new mongoose.Schema({
  room: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  visitDate: String,
  visitTime: String,
  message: String,
  visitStatus: { type: String, enum: ["pending", "confirmed", "completed", "cancelled", "rejected"], default: "pending" },
  adminReviewStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  adminReviewedAt: Date,
  adminReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  bookingStatus: { type: String, enum: ["notBooked", "booked", "cancelled", "released"], default: "notBooked" },
  bookedOccupancy: { type: Number, default: 0 },
  assignedUnit: String,
  assignedBed: String,
  bookingNote: String,
  rentStartDate: String,
  monthlyRent: { type: Number, min: 0, default: 0 },
  monthlyMaintenance: { type: Number, min: 0, default: 0 },
  securityDeposit: { type: Number, min: 0, default: 0 },
  rentDueDay: { type: Number, min: 1, max: 28 },
  rentStatus: { type: String, enum: ["active", "ended"], default: "active" },
  rentEndDate: String,
  rentPayments: [rentPaymentSchema],
  rentReminders: [rentReminderSchema],
  status: { type: String, enum: ["pending", "confirmed", "completed", "cancelled", "rejected"], default: "pending" },
  adminReason: String,
}, { timestamps: true });

bookingSchema.index({ status: 1, createdAt: -1 });
bookingSchema.index({ adminReviewStatus: 1, createdAt: -1 });
bookingSchema.index({ visitStatus: 1, bookingStatus: 1, createdAt: -1 });
bookingSchema.index({ owner: 1, bookingStatus: 1, rentStatus: 1, rentStartDate: -1 });

export const Booking = mongoose.model("Booking", bookingSchema);
