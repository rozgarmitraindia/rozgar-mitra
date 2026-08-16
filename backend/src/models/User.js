import mongoose from "mongoose";

const documentSchema = new mongoose.Schema({
  label: String,
  type: String,
  url: String,
  publicId: String,
  resourceType: String,
  format: String,
  originalName: String,
  mimeType: String,
}, { _id: false });

const workExperienceSchema = new mongoose.Schema({
  application: { type: mongoose.Schema.Types.ObjectId, ref: "Application" },
  job: { type: mongoose.Schema.Types.ObjectId, ref: "Job" },
  employer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  companyName: String,
  jobTitle: String,
  role: String,
  startDate: Date,
  endDate: Date,
  status: { type: String, enum: ["active", "ended"], default: "active" },
  terminationReason: String,
}, { timestamps: true });

const talentShareSchema = new mongoose.Schema({
  employer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  sharedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  skill: String,
  companyPreference: String,
  sharedAt: { type: Date, default: Date.now },
}, { _id: false });

const userSchema = new mongoose.Schema({
  role: { type: String, enum: ["candidate", "employer", "roomOwner", "admin", "superAdmin"], required: true },
  status: { type: String, enum: ["pending", "verified", "unverified", "rejected", "suspended"], default: "pending" },
  immutableId: { type: String, unique: true, required: true },
  fullName: String,
  dateOfBirth: Date,
  gender: { type: String, enum: ["male", "female", "other", "preferNotToSay"] },
  mobile: String,
  phone: String,
  email: { type: String, required: true, lowercase: true, trim: true },
  passwordHash: String,
  emailVerified: { type: Boolean, default: false },
  phoneVerified: { type: Boolean, default: false },
  address: String,
  pincode: String,
  skills: [String],
  companyPreferences: [String],
  talentShares: [talentShareSchema],
  experience: String,
  workExperienceMonths: { type: Number, default: 0 },
  workExperiences: [workExperienceSchema],
  availability: String,
  about: String,
  companyName: String,
  companyEmail: String,
  companyPhone: String,
  whatsapp: String,
  alternateNumber: String,
  companyLocation: String,
  propertyName: String,
  googleMapLink: String,
  documents: [documentSchema],
  profilePhoto: documentSchema,
  resume: documentSchema,
  companyDocs: [documentSchema],
  roomPhotos: [documentSchema],
  verificationOtp: String,
  verificationOtpExpiresAt: Date,
  passwordResetOtp: String,
  passwordResetOtpExpiresAt: Date,
  refreshTokens: [{
    tokenHash: String,
    expiresAt: Date,
    createdAt: { type: Date, default: Date.now },
  }],
  savedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Job" }],
  savedRooms: [{ type: mongoose.Schema.Types.ObjectId, ref: "Room" }],
  pushTokens: [String],
  lastPushTokenRegisteredAt: Date,
  lastPushTokenUserAgent: String,
}, { timestamps: true });

userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ mobile: 1 }, { unique: true, sparse: true });
userSchema.index({ companyEmail: 1 }, { unique: true, sparse: true });
userSchema.index({ companyPhone: 1 }, { unique: true, sparse: true });

export const User = mongoose.model("User", userSchema);
