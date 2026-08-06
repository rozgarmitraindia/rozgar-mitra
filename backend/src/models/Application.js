import mongoose from "mongoose";

const documentSnapshotSchema = new mongoose.Schema({
  type: String,
  url: String,
  publicId: String,
  resourceType: String,
  format: String,
  originalName: String,
  mimeType: String,
}, { _id: false });

const applicationSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
  candidate: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  employer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  aadhaarUrl: String,
  governmentIdUrl: String,
  governmentIdDocument: documentSnapshotSchema,
  candidateDocuments: [documentSnapshotSchema],
  applicationDocuments: [documentSnapshotSchema],
  candidateResumeUrl: String,
  candidateResumeDocument: documentSnapshotSchema,
  candidateProfilePhotoUrl: String,
  status: { type: String, enum: ["submitted", "shortlisted", "interview", "hired", "terminated", "rejected"], default: "submitted" },
  interview: {
    mode: String,
    hrName: String,
    meetingUrl: String,
    mapLink: String,
    locationAddress: String,
    date: String,
    time: String,
    supportContact: String,
  },
  interviewReminderSentAt: Date,
  offer: {
    offeredSalary: String,
    joiningDate: String,
    offerNote: String,
  },
  hiredAt: Date,
  terminatedAt: Date,
  terminationReason: String,
  rejectionReason: String,
}, { timestamps: true });

applicationSchema.index({ job: 1, candidate: 1 }, { unique: true });

export const Application = mongoose.model("Application", applicationSchema);
