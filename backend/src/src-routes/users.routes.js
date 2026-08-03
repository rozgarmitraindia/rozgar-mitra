import { Router } from "express";
import { User } from "../models/User.js";
import { Job } from "../models/Job.js";
import { Room } from "../models/Room.js";
import { Application } from "../models/Application.js";
import { Notification } from "../models/Notification.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";
import { sendVerificationMail } from "../services/mail.service.js";

export const usersRouter = Router();

usersRouter.get("/saved", requireAuth, async (req, res) => {
  const user = await User.findById(req.user._id).populate("savedJobs savedRooms");
  return sendSuccess(res, { message: "Saved items fetched", data: { savedJobs: user.savedJobs || [], savedRooms: user.savedRooms || [] } });
});

usersRouter.get("/applications", requireAuth, requireRole("candidate"), async (req, res) => {
  const items = await Application.find({ candidate: req.user._id }).populate("job employer").sort({ createdAt: -1 });
  return sendSuccess(res, { message: "Applications fetched", data: { items } });
});

usersRouter.get("/summary", requireAuth, requireRole("candidate"), async (req, res) => {
  const user = await User.findById(req.user._id).select("savedJobs savedRooms").lean();
  const applicationsCount = await Application.countDocuments({ candidate: req.user._id });
  const interviewsCount = await Application.countDocuments({ candidate: req.user._id, status: "interview" });
  const unreadNotifications = await Notification.countDocuments({ recipient: req.user._id, status: "unread" });
  return sendSuccess(res, {
    message: "Candidate summary fetched",
    data: {
      savedJobs: (user?.savedJobs || []).length,
      savedRooms: (user?.savedRooms || []).length,
      applications: applicationsCount,
      interviews: interviewsCount,
      unreadNotifications,
    },
  });
});

usersRouter.patch("/profile", requireAuth, async (req, res) => {
  const { fullName, email, mobile } = req.body || {};
  const updates = {};

  if (fullName) updates.fullName = fullName;
  if (email) {
    const normalized = email.toLowerCase().trim();
    if (!normalized) return sendError(res, { statusCode: 400, code: "INVALID_EMAIL", message: "Email is invalid" });

    const existing = await User.findOne({ email: normalized, _id: { $ne: req.user._id } });
    if (existing) {
      return sendError(res, { statusCode: 409, code: "EMAIL_IN_USE", message: "Email is already used by another account." });
    }

    if (normalized !== req.user.email) {
      updates.email = normalized;
      updates.emailVerified = false;
      updates.status = "pending";
      updates.verificationOtp = Math.random().toString().slice(2, 8);
      updates.verificationOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    }
  }

  if (mobile) {
    const trimmedMobile = mobile.trim();
    if (!trimmedMobile) return sendError(res, { statusCode: 400, code: "INVALID_MOBILE", message: "Mobile number is invalid" });
    const existingMobile = await User.findOne({ mobile: trimmedMobile, _id: { $ne: req.user._id } });
    if (existingMobile) {
      return sendError(res, { statusCode: 409, code: "MOBILE_IN_USE", message: "Mobile number is already used by another account." });
    }
    updates.mobile = trimmedMobile;
  }

  if (Object.keys(updates).length === 0) {
    return sendError(res, { statusCode: 400, code: "NO_UPDATES", message: "No profile changes provided." });
  }

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
  if (updates.email && updates.email !== req.user.email) {
    await sendVerificationMail(user);
  }

  return sendSuccess(res, { message: "Profile updated", data: { user } });
});

usersRouter.post("/saved/jobs/:id", requireAuth, requireRole("candidate"), async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) return sendError(res, { statusCode: 404, code: "JOB_NOT_FOUND", message: "Job not found" });
  const exists = (req.user.savedJobs || []).some((id) => String(id) === String(job._id));
  if (exists) {
    await User.updateOne({ _id: req.user._id }, { $pull: { savedJobs: job._id } });
    return sendSuccess(res, { message: "Removed from saved jobs" });
  }
  await User.updateOne({ _id: req.user._id }, { $addToSet: { savedJobs: job._id } });
  return sendSuccess(res, { message: "Added to saved jobs" });
});

usersRouter.post("/saved/rooms/:id", requireAuth, requireRole("candidate"), async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) return sendError(res, { statusCode: 404, code: "ROOM_NOT_FOUND", message: "Room not found" });
  const exists = (req.user.savedRooms || []).some((id) => String(id) === String(room._id));
  if (exists) {
    await User.updateOne({ _id: req.user._id }, { $pull: { savedRooms: room._id } });
    return sendSuccess(res, { message: "Removed from saved rooms" });
  }
  await User.updateOne({ _id: req.user._id }, { $addToSet: { savedRooms: room._id } });
  return sendSuccess(res, { message: "Added to saved rooms" });
});
