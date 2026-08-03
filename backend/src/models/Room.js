import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
  roomId: { type: String, unique: true, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  immutableOwnerId: String,
  propertyName: String,
  title: String,
  rent: String,
  deposit: String,
  amenities: [String],
  roomType: String,
  photos: [String],
  googleMapLink: String,
  address: String,
  contactNumber: String,
  description: String,
  status: { type: String, enum: ["pending", "live", "rejected"], default: "pending" },
  adminReason: String,
}, { timestamps: true });

export const Room = mongoose.model("Room", roomSchema);
