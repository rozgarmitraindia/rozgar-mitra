import mongoose from "mongoose";

const jobSchema = new mongoose.Schema({
  postId: { type: String, unique: true, required: true },
  employer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  immutableCompanyId: String,
  companyName: String,
  title: String,
  role: String,
  genderNeeded: String,
  ageRange: String,
  skills: [String],
  salary: String,
  requirements: String,
  googleMapLink: String,
  address: String,
  contactNumber: String,
  description: String,
  benefits: String,
  status: { type: String, enum: ["pending", "live", "rejected"], default: "pending" },
  adminReason: String,
}, { timestamps: true });

export const Job = mongoose.model("Job", jobSchema);
