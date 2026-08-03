import { Router } from "express";
import { Job } from "../models/Job.js";
import { Application } from "../models/Application.js";
import { requireAuth, requireRole, optionalAuth } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { sendMail } from "../services/mail.service.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";

export const jobsRouter = Router();

jobsRouter.get("/", optionalAuth, async (req, res) => {
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
  const item = await Job.findOne({ _id: req.params.id, status: "live" });
  if (!item) return sendError(res, { statusCode: 404, code: "JOB_NOT_FOUND", message: "Job not found or pending admin review" });
  const obj = item.toObject();
  obj.isSaved = req.user ? (req.user.savedJobs || []).map(String).includes(String(item._id)) : false;
  obj.savedCount = await User.countDocuments({ savedJobs: item._id });
  return sendSuccess(res, { message: "Job fetched", data: obj });
});

jobsRouter.post("/:id/applications", requireAuth, requireRole("candidate"), async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job || job.status !== "live") return sendError(res, { statusCode: 404, code: "JOB_NOT_LIVE", message: "Job not live" });
  const existing = await Application.findOne({ job: job._id, candidate: req.user._id });
  if (existing) return sendError(res, { statusCode: 409, code: "DUPLICATE_APPLICATION", message: "You have already applied to this job" });

  try {
    const application = await Application.create({
      job: job._id,
      candidate: req.user._id,
      employer: job.employer,
      aadhaarUrl: req.body.aadhaarUrl,
      governmentIdUrl: req.body.governmentIdUrl,
    });
    await sendMail({ to: req.user.email, subject: "Application submitted", html: `<p>Your application for ${job.title} has been submitted.</p>` });
    return sendSuccess(res, { statusCode: 201, message: "Application submitted", data: { application } });
  } catch (error) {
    if (error.code === 11000) {
      return sendError(res, { statusCode: 409, code: "DUPLICATE_APPLICATION", message: "You have already applied to this job" });
    }
    throw error;
  }
});

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
