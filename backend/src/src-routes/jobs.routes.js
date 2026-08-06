import { Router } from "express";
import { Job } from "../models/Job.js";
import { Application } from "../models/Application.js";
import { requireAuth, requireRole, optionalAuth } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { sendMail } from "../services/mail.service.js";
import { asyncHandler, sendError, sendSuccess } from "../utils/apiResponse.js";

export const jobsRouter = Router();

function normalizeDocument(doc, fallbackType = "document") {
  if (!doc) return null;
  const source = typeof doc.toObject === "function" ? doc.toObject() : doc;
  if (!source.url) return null;
  return {
    type: source.type || fallbackType,
    url: source.url,
    publicId: source.publicId,
    resourceType: source.resourceType,
    format: source.format,
    originalName: source.originalName,
    mimeType: source.mimeType,
  };
}

jobsRouter.get("/", optionalAuth, async (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  const search = req.query.search ? new RegExp(req.query.search, "i") : null;
  const filter = { status: "live" };
  if (search) filter.$or = [{ title: search }, { role: search }, { address: search }, { companyName: search }];
  const items = await Job.find(filter).sort({ createdAt: -1 });

  const userSavedIds = req.user ? (req.user.savedJobs || []).map(String) : [];

  const enriched = await Promise.all(items.map(async (it) => {
    const itemObj = it.toObject();
    itemObj.isSaved = userSavedIds.includes(String(it._id));
    itemObj.savedCount = await User.countDocuments({ savedJobs: it._id });
    return itemObj;
  }));

  res.json({ success: true, message: "Jobs fetched", data: { items: enriched }, items: enriched });
});

jobsRouter.get("/:id", optionalAuth, async (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  const item = await Job.findOne({ _id: req.params.id, status: "live" });
  if (!item) return sendError(res, { statusCode: 404, code: "JOB_NOT_FOUND", message: "Job not found or pending admin review" });
  const obj = item.toObject();
  obj.isSaved = req.user ? (req.user.savedJobs || []).map(String).includes(String(item._id)) : false;
  obj.savedCount = await User.countDocuments({ savedJobs: item._id });
  obj.applied = req.user?.role === "candidate" ? Boolean(await Application.exists({ job: item._id, candidate: req.user._id })) : false;
  if (!obj.applied) {
    delete obj.contactNumber;
    obj.contactLocked = true;
  }
  return sendSuccess(res, { message: "Job fetched", data: obj });
});

jobsRouter.post("/:id/applications", requireAuth, requireRole("candidate"), asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job || job.status !== "live") return sendError(res, { statusCode: 404, code: "JOB_NOT_LIVE", message: "Job not live" });
  const now = new Date();
  if (job.applicationStartDate && now < job.applicationStartDate) {
    return sendError(res, { statusCode: 400, code: "APPLICATIONS_NOT_OPEN", message: "Applications are not open yet" });
  }
  if (job.applicationEndDate) {
    const closing = new Date(job.applicationEndDate);
    closing.setHours(23, 59, 59, 999);
    if (now > closing) return sendError(res, { statusCode: 400, code: "APPLICATIONS_CLOSED", message: "Applications for this job are closed" });
  }
  const existing = await Application.findOne({ job: job._id, candidate: req.user._id });
  if (existing) return sendError(res, { statusCode: 409, code: "DUPLICATE_APPLICATION", message: "You have already applied to this job" });
  const candidateDocuments = (req.user.documents || []).map((doc) => normalizeDocument(doc)).filter(Boolean);
  const governmentId = candidateDocuments.find((doc) => ["government-id", "govt-id", "aadhaar", "document"].includes(String(doc.type || "").toLowerCase()));
  const governmentIdDocument = normalizeDocument(req.body.governmentIdDocument, "government-id") || governmentId;
  const resumeDocument = normalizeDocument(req.body.resumeDocument, "resume") || normalizeDocument(req.user.resume, "resume");
  const governmentIdUrl = req.body.governmentIdUrl || governmentIdDocument?.url;
  if (!governmentIdUrl) {
    return sendError(res, {
      statusCode: 400,
      code: "GOVERNMENT_ID_REQUIRED",
      message: "Government ID upload compulsory hai. Please ID upload karke job apply karein.",
    });
  }

  try {
    const application = await Application.create({
      job: job._id,
      candidate: req.user._id,
      employer: job.employer,
      aadhaarUrl: req.body.aadhaarUrl,
      governmentIdUrl,
      governmentIdDocument,
      candidateDocuments,
      applicationDocuments: [governmentIdDocument, resumeDocument].filter(Boolean),
      candidateResumeUrl: req.body.resumeUrl || resumeDocument?.url || "",
      candidateResumeDocument: resumeDocument,
      candidateProfilePhotoUrl: req.user.profilePhoto?.url || "",
    });
    try {
      await sendMail({ to: req.user.email, subject: "Application submitted", html: `<p>Your application for ${job.title} has been submitted.</p>` });
    } catch (mailError) {
      console.error("Application confirmation mail failed", { email: req.user.email, error: mailError.message });
    }
    return sendSuccess(res, { statusCode: 201, message: "Application submitted", data: { application } });
  } catch (error) {
    if (error.code === 11000) {
      return sendError(res, { statusCode: 409, code: "DUPLICATE_APPLICATION", message: "You have already applied to this job" });
    }
    throw error;
  }
}));

jobsRouter.post("/:id/wishlist", requireAuth, requireRole("candidate"), async (req, res) => {
  const jobId = req.params.id;
  const user = req.user;
  const exists = (user.savedJobs || []).some(id => String(id) === String(jobId));
  if (exists) {
    user.savedJobs = (user.savedJobs || []).filter(id => String(id) !== String(jobId));
    await user.save();
    const count = await User.countDocuments({ savedJobs: jobId });
    return sendSuccess(res, { message: "Removed from saved jobs", data: { isSaved: false, savedCount: count } });
  }
  user.savedJobs = user.savedJobs || [];
  user.savedJobs.push(jobId);
  await user.save();
  const count = await User.countDocuments({ savedJobs: jobId });
  return sendSuccess(res, { statusCode: 201, message: "Saved to wishlist", data: { isSaved: true, savedCount: count } });
});
