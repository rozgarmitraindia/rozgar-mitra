import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  room: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  visitDate: String,
  visitTime: String,
  message: String,
  visitStatus: { type: String, enum: ["pending", "confirmed", "completed", "cancelled", "rejected"], default: "pending" },
  bookingStatus: { type: String, enum: ["notBooked", "booked", "cancelled", "released"], default: "notBooked" },
  bookedOccupancy: { type: Number, default: 0 },
  assignedUnit: String,
  assignedBed: String,
  bookingNote: String,
  status: { type: String, enum: ["pending", "confirmed", "completed", "cancelled", "rejected"], default: "pending" },
  adminReason: String,
}, { timestamps: true });

bookingSchema.index({ status: 1, createdAt: -1 });
bookingSchema.index({ visitStatus: 1, bookingStatus: 1, createdAt: -1 });

export const Booking = mongoose.model("Booking", bookingSchema);
