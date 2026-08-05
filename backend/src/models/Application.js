import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
  candidate: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  employer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  aadhaarUrl: String,
  governmentIdUrl: String,
  candidateDocuments: [{
    type: String,
    url: String,
    publicId: String,
  }],
  candidateResumeUrl: String,
  candidateProfilePhotoUrl: String,
  status: { type: String, enum: ["submitted", "shortlisted", "interview", "hired", "rejected"], default: "submitted" },
  interview: {
    mode: String,
    meetingUrl: String,
    mapLink: String,
    locationAddress: String,
    date: String,
    time: String,
    supportContact: String,
  },
  offer: {
    offeredSalary: String,
    joiningDate: String,
    offerNote: String,
  },
  rejectionReason: String,
}, { timestamps: true });

applicationSchema.index({ job: 1, candidate: 1 }, { unique: true });

export const Application = mongoose.model("Application", applicationSchema);
