import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { Job } from "../models/Job.js";
import { Room } from "../models/Room.js";
import { Application } from "../models/Application.js";
import { Booking } from "../models/Booking.js";
import { makeImmutableId } from "../utils/id.js";
import { sendMail } from "../services/mail.service.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";
import { getFirebaseAdmin } from "../services/firebase.service.js";
import { User } from "../models/User.js";

export const employerRouter = Router();

employerRouter.get("/summary", requireAuth, async (req, res) => {
  if (req.user.role === "employer") {
    const jobs = await Job.find({ employer: req.user._id });
    const applications = await Application.find({ employer: req.user._id });
    const statusCounts = { pending: 0, live: 0, rejected: 0 };
    jobs.forEach((job) => { statusCounts[job.status] = (statusCounts[job.status] || 0) + 1; });
    const applicationCounts = { total: applications.length, shortlisted: 0, interview: 0, hired: 0, rejected: 0 };
    applications.forEach((app) => { applicationCounts[app.status] = (applicationCounts[app.status] || 0) + 1; });
    const recent = await Application.find({ employer: req.user._id }).populate("candidate job").sort({ createdAt: -1 }).limit(6);
    return sendSuccess(res, { message: "Employer summary fetched", data: { statusCounts, applicationCounts, recent } });
  }
  if (req.user.role === "roomOwner") {
    const rooms = await Room.find({ owner: req.user._id });
    const requests = await Booking.find({ owner: req.user._id });
    const statusCounts = { pending: 0, live: 0, rejected: 0 };
    rooms.forEach((room) => { statusCounts[room.status] = (statusCounts[room.status] || 0) + 1; });
    const requestCounts = { total: requests.length, pending: 0, confirmed: 0, completed: 0, cancelled: 0, rejected: 0 };
    requests.forEach((reqItem) => { requestCounts[reqItem.status] = (requestCounts[reqItem.status] || 0) + 1; });
    return sendSuccess(res, { message: "Room owner summary fetched", data: { statusCounts, requestCounts } });
  }
  return sendError(res, { statusCode: 403, code: "ROLE_NOT_ALLOWED", message: "Summary not available for this role" });
});

employerRouter.post("/jobs", requireAuth, requireRole("employer"), async (req, res) => {
  const job = await Job.create({
    ...req.body,
    postId: makeImmutableId("postid"),
    employer: req.user._id,
    immutableCompanyId: req.user.immutableId,
    companyName: req.user.companyName,
    skills: Array.isArray(req.body.skills) ? req.body.skills : String(req.body.skills || "").split(",").map((x) => x.trim()).filter(Boolean),
    status: "pending",
  });
  // Send web push to candidates who have tokens
  try {
    const firebase = getFirebaseAdmin();
    if (firebase) {
      const candidates = await User.find({ role: 'candidate' }).select('pushTokens');
      const tokens = candidates.flatMap(u => u.pushTokens || []);
      if (tokens.length) {
        await firebase.messaging().sendMulticast({ tokens, notification: { title: 'New job posted', body: job.title || 'A new job was posted' } });
      }
    }
  } catch (e) {
    console.error('Error sending job push', e);
  }
  return sendSuccess(res, { statusCode: 201, message: "Job submitted for admin review", data: { job } });
});

employerRouter.get("/applications", requireAuth, requireRole("employer"), async (req, res) => {
  const items = await Application.find({ employer: req.user._id }).populate("candidate job").sort({ createdAt: -1 });
  res.json({ success: true, message: "Applications fetched", data: { items }, items });
});

employerRouter.post("/applications/:id/interview", requireAuth, requireRole("employer"), async (req, res) => {
  const app = await Application.findOne({ _id: req.params.id, employer: req.user._id }).populate("candidate job");
  if (!app) return sendError(res, { statusCode: 404, code: "APPLICATION_NOT_FOUND", message: "Application not found" });
  app.status = "interview";
  app.interview = req.body;
  await app.save();
  await sendMail({ to: app.candidate.email, subject: "Interview scheduled", html: `<p>Your interview for ${app.job.title} is scheduled.</p><pre>${JSON.stringify(req.body, null, 2)}</pre>` });
  try {
    const firebase = getFirebaseAdmin();
    if (firebase) {
      const tokens = app.candidate.pushTokens || [];
      if (tokens.length) await firebase.messaging().sendMulticast({ tokens, notification: { title: 'Interview scheduled', body: `Interview for ${app.job.title}` } });
    }
  } catch (e) { console.error('Push error', e); }
  return sendSuccess(res, { message: "Interview scheduled", data: { application: app } });
});

employerRouter.post("/applications/:id/hire", requireAuth, requireRole("employer"), async (req, res) => {
  const app = await Application.findOne({ _id: req.params.id, employer: req.user._id }).populate("candidate job");
  if (!app) return sendError(res, { statusCode: 404, code: "APPLICATION_NOT_FOUND", message: "Application not found" });
  app.status = "hired";
  app.offer = req.body;
  await app.save();
  await sendMail({ to: app.candidate.email, subject: "You are hired", html: `<p>Congratulations. You are hired for ${app.job.title}.</p><pre>${JSON.stringify(req.body, null, 2)}</pre>` });
  try {
    const firebase = getFirebaseAdmin();
    if (firebase) {
      const tokens = app.candidate.pushTokens || [];
      if (tokens.length) await firebase.messaging().sendMulticast({ tokens, notification: { title: 'You are hired', body: `Hired for ${app.job.title}` } });
    }
  } catch (e) { console.error('Push error', e); }
  return sendSuccess(res, { message: "Candidate hired", data: { application: app } });
});

employerRouter.post("/applications/:id/reject", requireAuth, requireRole("employer"), async (req, res) => {
  const app = await Application.findOne({ _id: req.params.id, employer: req.user._id }).populate("candidate job");
  if (!app) return sendError(res, { statusCode: 404, code: "APPLICATION_NOT_FOUND", message: "Application not found" });
  app.status = "rejected";
  app.rejectionReason = req.body.reason;
  await app.save();
  await sendMail({ to: app.candidate.email, subject: "Application update", html: `<p>Your application for ${app.job.title} was not selected.</p><p>${req.body.reason || ""}</p>` });
  try {
    const firebase = getFirebaseAdmin();
    if (firebase) {
      const tokens = app.candidate.pushTokens || [];
      if (tokens.length) await firebase.messaging().sendMulticast({ tokens, notification: { title: 'Application update', body: `Your application for ${app.job.title} was updated` } });
    }
  } catch (e) { console.error('Push error', e); }
  return sendSuccess(res, { message: "Application rejected", data: { application: app } });
});

employerRouter.post("/rooms", requireAuth, requireRole("roomOwner"), async (req, res) => {
  const room = await Room.create({
    ...req.body,
    roomId: makeImmutableId("roomid"),
    owner: req.user._id,
    immutableOwnerId: req.user.immutableId,
    propertyName: req.user.propertyName,
    amenities: Array.isArray(req.body.amenities) ? req.body.amenities : String(req.body.amenities || "").split(",").map((x) => x.trim()).filter(Boolean),
    status: "pending",
  });
  try {
    const firebase = getFirebaseAdmin();
    if (firebase) {
      const candidates = await User.find({ role: 'candidate' }).select('pushTokens');
      const tokens = candidates.flatMap(u => u.pushTokens || []);
      if (tokens.length) await firebase.messaging().sendMulticast({ tokens, notification: { title: 'New room posted', body: room.title || 'A new room was posted' } });
    }
  } catch (e) { console.error('Push error', e); }
  return sendSuccess(res, { statusCode: 201, message: "Room submitted for admin review", data: { room } });
});

employerRouter.get("/rooms", requireAuth, requireRole("roomOwner"), async (req, res) => {
  const status = req.query.status;
  const filter = { owner: req.user._id };
  if (status) filter.status = status;
  const items = await Room.find(filter).sort({ createdAt: -1 });
  return sendSuccess(res, { message: "Rooms fetched", data: { items } });
});

employerRouter.get("/rooms/:id", requireAuth, requireRole("roomOwner"), async (req, res) => {
  const room = await Room.findOne({ _id: req.params.id, owner: req.user._id });
  if (!room) return sendError(res, { statusCode: 404, code: "ROOM_NOT_FOUND", message: "Room not found" });
  return sendSuccess(res, { message: "Room details fetched", data: room });
});

employerRouter.get("/visit-requests", requireAuth, requireRole("roomOwner"), async (req, res) => {
  const items = await Booking.find({ owner: req.user._id }).populate("user room").sort({ createdAt: -1 });
  return sendSuccess(res, { message: "Visit requests fetched", data: { items } });
});

employerRouter.get("/bookings", requireAuth, requireRole("roomOwner"), async (req, res) => {
  const items = await Booking.find({ owner: req.user._id }).populate("user room").sort({ createdAt: -1 });
  return sendSuccess(res, { message: "Bookings fetched", data: { items } });
});

employerRouter.post("/visit-requests/:id/respond", requireAuth, requireRole("roomOwner"), async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, owner: req.user._id }).populate("user room");
  if (!booking) return sendError(res, { statusCode: 404, code: "BOOKING_NOT_FOUND", message: "Visit request not found" });
  const { action, message, visitDate, visitTime, meetingUrl, locationAddress, supportContact } = req.body;
  if (action === "accept") {
    booking.status = "confirmed";
  } else if (action === "reject") {
    booking.status = "rejected";
  } else if (action === "reschedule") {
    booking.status = "pending";
    if (visitDate) booking.visitDate = visitDate;
    if (visitTime) booking.visitTime = visitTime;
    if (locationAddress) booking.locationAddress = locationAddress;
    if (meetingUrl) booking.meetingUrl = meetingUrl;
    if (supportContact) booking.supportContact = supportContact;
  }
  booking.message = message || booking.message;
  await booking.save();
  await sendMail({ to: booking.user.email, subject: "Visit request updated", html: `<p>Your visit request for ${booking.room.title || booking.room.propertyName} has been updated.</p><pre>${JSON.stringify(req.body, null, 2)}</pre>` });
  return sendSuccess(res, { message: "Request updated", data: { booking } });
});
