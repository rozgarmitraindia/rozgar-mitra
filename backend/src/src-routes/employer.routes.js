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
import { createNotification } from "../services/notification.service.js";

export const employerRouter = Router();

const candidateBioFields = "fullName email mobile dateOfBirth gender address pincode skills experience availability about profilePhoto resume documents immutableId";

function populateApplication(query) {
  return query
    .populate({ path: "candidate", select: candidateBioFields })
    .populate({ path: "job", select: "title postId salary employmentType vacancies address googleMapLink status" });
}

function interviewError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  error.code = "INVALID_INTERVIEW_DETAILS";
  return error;
}

function validateInterviewDetails(payload = {}) {
  const mode = String(payload.mode || "").toLowerCase();
  const date = String(payload.date || "").trim();
  const time = String(payload.time || "").trim();
  const supportContact = String(payload.supportContact || "").trim();
  if (!['remote', 'physical'].includes(mode)) throw interviewError("Select Remote or Physical interview mode");
  if (!date || !time || !supportContact) throw interviewError("Interview date, time and support contact are required");
  if (mode === "remote" && !String(payload.meetingUrl || "").trim()) throw interviewError("Meeting link is required for a remote interview");
  if (mode === "physical" && !String(payload.locationAddress || "").trim()) throw interviewError("Interview location is required for a physical interview");
  return {
    mode,
    date,
    time,
    supportContact,
    meetingUrl: mode === "remote" ? String(payload.meetingUrl).trim() : "",
    mapLink: mode === "physical" ? String(payload.mapLink || "").trim() : "",
    locationAddress: mode === "physical" ? String(payload.locationAddress).trim() : "",
  };
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function interviewGuidance(interview) {
  if (interview.mode === "remote") {
    return [
      "Join from a quiet place with stable internet and no background interruptions.",
      "Keep your phone charged, documents ready, and join five minutes before the planned time.",
      "Use headphones if possible and keep camera/microphone permissions ready.",
    ];
  }
  return [
    "Reach the venue at least 30 minutes before the scheduled time.",
    "Carry your government ID and relevant documents in original or clear digital copy.",
    "Use the provided map link and support contact if you need directions.",
  ];
}

function applicationMailTemplate({ heading, intro, app, details = [], note = "", guidance = [] }) {
  const rows = [
    ["Candidate", app.candidate?.fullName || "Candidate"],
    ["Job", app.job?.title || "Job"],
    ["Company", reqSafeCompany(app)],
  ].map(([label, value]) => [label, escapeHtml(value)]);
  const detailRows = details.map(([label, value]) => [label, value]);
  return `
    <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.55">
      <h2 style="margin:0 0 12px">${escapeHtml(heading)}</h2>
      <p>${escapeHtml(intro)}</p>
      <table style="border-collapse:collapse;width:100%;max-width:640px;margin:18px 0">
        ${[...rows, ...detailRows].map(([label, value]) => `<tr><td style="border:1px solid #e5e7eb;padding:10px;font-weight:700;background:#f9fafb">${escapeHtml(label)}</td><td style="border:1px solid #e5e7eb;padding:10px">${value}</td></tr>`).join("")}
      </table>
      ${guidance.length ? `<h3 style="margin:18px 0 8px">Important instructions</h3><ul>${guidance.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
      ${note ? `<p style="margin-top:18px">${escapeHtml(note)}</p>` : ""}
      <p style="margin-top:24px;color:#6b7280;font-size:13px">This update was sent automatically by Rozgar Mitra.</p>
    </div>
  `;
}

function reqSafeCompany(app) {
  return app.job?.companyName || app.employer?.companyName || "Employer";
}

async function notifyCandidateUpdate({ app, title, body, type, emailHtml, emailSubject, extraMetadata = {} }) {
  try {
    await createNotification({
      recipient: app.candidate._id,
      title,
      body,
      metadata: { type, applicationId: String(app._id), jobId: String(app.job._id), ...extraMetadata },
      sendEmail: true,
      sendPush: true,
      emailSubject: emailSubject || title,
      emailHtml,
    });
  } catch (error) {
    console.error("Unable to send candidate notification", error);
  }
}

employerRouter.get("/summary", requireAuth, async (req, res) => {
  if (req.user.role === "employer") {
    const jobs = await Job.find({ employer: req.user._id });
    const applications = await Application.find({ employer: req.user._id });
    const statusCounts = { pending: 0, live: 0, rejected: 0 };
    jobs.forEach((job) => { statusCounts[job.status] = (statusCounts[job.status] || 0) + 1; });
    const applicationCounts = { total: applications.length, shortlisted: 0, interview: 0, hired: 0, rejected: 0 };
    applications.forEach((app) => { applicationCounts[app.status] = (applicationCounts[app.status] || 0) + 1; });
    const recent = await populateApplication(Application.find({ employer: req.user._id })).sort({ createdAt: -1 }).limit(6);
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
  const applicationStartDate = req.body.applicationStartDate ? new Date(req.body.applicationStartDate) : null;
  const applicationEndDate = req.body.applicationEndDate ? new Date(req.body.applicationEndDate) : null;
  const interviewStartDate = req.body.interviewStartDate ? new Date(req.body.interviewStartDate) : null;
  const interviewEndDate = req.body.interviewEndDate ? new Date(req.body.interviewEndDate) : null;
  if (!applicationStartDate || !applicationEndDate || Number.isNaN(applicationStartDate.valueOf()) || Number.isNaN(applicationEndDate.valueOf())) {
    return sendError(res, { statusCode: 400, code: "APPLICATION_DATES_REQUIRED", message: "Application opening and closing dates are required" });
  }
  if (applicationEndDate < applicationStartDate) {
    return sendError(res, { statusCode: 400, code: "INVALID_APPLICATION_DATES", message: "Application closing date must be after opening date" });
  }
  if (!interviewStartDate || !interviewEndDate || Number.isNaN(interviewStartDate.valueOf()) || Number.isNaN(interviewEndDate.valueOf()) || interviewEndDate < interviewStartDate) {
    return sendError(res, { statusCode: 400, code: "INVALID_INTERVIEW_DATES", message: "Enter a valid interview start and end date" });
  }
  if (interviewStartDate < applicationEndDate) {
    return sendError(res, { statusCode: 400, code: "INTERVIEW_BEFORE_CLOSING", message: "Interview window must start on or after applications close" });
  }
  if (!req.body.interviewStartTime || !req.body.interviewEndTime) {
    return sendError(res, { statusCode: 400, code: "INTERVIEW_TIME_REQUIRED", message: "Interview start and end time are required" });
  }
  if (String(req.body.interviewEndTime) <= String(req.body.interviewStartTime)) {
    return sendError(res, { statusCode: 400, code: "INVALID_INTERVIEW_TIME", message: "Interview end time must be after start time" });
  }
  const job = await Job.create({
    ...req.body,
    postId: makeImmutableId("postid"),
    employer: req.user._id,
    immutableCompanyId: req.user.immutableId,
    companyName: req.user.companyName,
    skills: Array.isArray(req.body.skills) ? req.body.skills : String(req.body.skills || "").split(",").map((x) => x.trim()).filter(Boolean),
    vacancies: Math.max(Number(req.body.vacancies) || 1, 1),
    employmentType: ["fullTime", "partTime", "contract", "internship"].includes(req.body.employmentType) ? req.body.employmentType : "fullTime",
    applicationStartDate,
    applicationEndDate,
    interviewStartDate,
    interviewEndDate,
    interviewMode: ["remote", "physical", "hybrid"].includes(req.body.interviewMode) ? req.body.interviewMode : "physical",
    status: "pending",
  });
  return sendSuccess(res, { statusCode: 201, message: "Job submitted for admin review", data: { job } });
});

employerRouter.get("/jobs", requireAuth, requireRole("employer"), async (req, res) => {
  const jobs = await Job.find({ employer: req.user._id }).sort({ createdAt: -1 }).lean();
  const counts = await Application.aggregate([
    { $match: { employer: req.user._id } },
    { $group: { _id: "$job", count: { $sum: 1 }, interviews: { $sum: { $cond: [{ $eq: ["$status", "interview"] }, 1, 0] } }, hired: { $sum: { $cond: [{ $eq: ["$status", "hired"] }, 1, 0] } } } },
  ]);
  const byJob = new Map(counts.map((count) => [String(count._id), count]));
  const items = jobs.map((job) => ({ ...job, applicationStats: byJob.get(String(job._id)) || { count: 0, interviews: 0, hired: 0 } }));
  return sendSuccess(res, { message: "Employer jobs fetched", data: { items } });
});

employerRouter.patch("/jobs/:id/application-window", requireAuth, requireRole("employer"), async (req, res) => {
  const job = await Job.findOne({ _id: req.params.id, employer: req.user._id });
  if (!job) return sendError(res, { statusCode: 404, code: "JOB_NOT_FOUND", message: "Job not found" });

  const applicationStartDate = req.body.applicationStartDate ? new Date(req.body.applicationStartDate) : null;
  const applicationEndDate = req.body.applicationEndDate ? new Date(req.body.applicationEndDate) : null;
  if (!applicationStartDate || !applicationEndDate || Number.isNaN(applicationStartDate.valueOf()) || Number.isNaN(applicationEndDate.valueOf())) {
    return sendError(res, { statusCode: 400, code: "APPLICATION_DATES_REQUIRED", message: "Application opening and closing dates are required" });
  }
  if (applicationEndDate < applicationStartDate) {
    return sendError(res, { statusCode: 400, code: "INVALID_APPLICATION_DATES", message: "Application closing date must be after opening date" });
  }

  if (req.body.interviewStartDate || req.body.interviewEndDate) {
    const interviewStartDate = req.body.interviewStartDate ? new Date(req.body.interviewStartDate) : null;
    const interviewEndDate = req.body.interviewEndDate ? new Date(req.body.interviewEndDate) : null;
    if (!interviewStartDate || !interviewEndDate || Number.isNaN(interviewStartDate.valueOf()) || Number.isNaN(interviewEndDate.valueOf()) || interviewEndDate < interviewStartDate) {
      return sendError(res, { statusCode: 400, code: "INVALID_INTERVIEW_DATES", message: "Enter a valid interview start and end date" });
    }
    if (interviewStartDate < applicationEndDate) {
      return sendError(res, { statusCode: 400, code: "INTERVIEW_BEFORE_CLOSING", message: "Interview window must start on or after applications close" });
    }
    job.interviewStartDate = interviewStartDate;
    job.interviewEndDate = interviewEndDate;
  }

  if (req.body.interviewStartTime) job.interviewStartTime = req.body.interviewStartTime;
  if (req.body.interviewEndTime) job.interviewEndTime = req.body.interviewEndTime;
  if (job.interviewStartTime && job.interviewEndTime && String(job.interviewEndTime) <= String(job.interviewStartTime)) {
    return sendError(res, { statusCode: 400, code: "INVALID_INTERVIEW_TIME", message: "Interview end time must be after start time" });
  }

  job.applicationStartDate = applicationStartDate;
  job.applicationEndDate = applicationEndDate;
  if (job.status === "rejected") {
    job.status = "pending";
    job.adminReason = "";
  }
  await job.save();

  return sendSuccess(res, {
    message: job.status === "pending" ? "Job dates updated and resubmitted for admin review" : "Job application window updated",
    data: { job },
  });
});

employerRouter.get("/applications", requireAuth, requireRole("employer"), async (req, res) => {
  const filter = { employer: req.user._id };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.job) filter.job = req.query.job;
  const items = await populateApplication(Application.find(filter)).sort({ createdAt: -1 });
  res.json({ success: true, message: "Applications fetched", data: { items }, items });
});

employerRouter.post("/applications/:id/shortlist", requireAuth, requireRole("employer"), async (req, res) => {
  const app = await populateApplication(Application.findOne({ _id: req.params.id, employer: req.user._id }));
  if (!app) return sendError(res, { statusCode: 404, code: "APPLICATION_NOT_FOUND", message: "Application not found" });
  if (["hired", "rejected"].includes(app.status)) return sendError(res, { statusCode: 400, code: "APPLICATION_CLOSED", message: "This application is already closed" });
  app.status = "shortlisted";
  await app.save();
  await notifyCandidateUpdate({
    app,
    title: "Application shortlisted",
    body: `You have been shortlisted for ${app.job.title}. Please watch for the next hiring update.`,
    type: "application_shortlisted",
    emailHtml: applicationMailTemplate({
      heading: "Application Shortlisted",
      intro: "Your profile has moved to the next hiring stage.",
      app,
      note: "The employer may schedule an interview or request additional information from your dashboard.",
    }),
  });
  return sendSuccess(res, { message: "Candidate shortlisted", data: { application: app } });
});

employerRouter.post("/applications/:id/interview", requireAuth, requireRole("employer"), async (req, res) => {
  const app = await populateApplication(Application.findOne({ _id: req.params.id, employer: req.user._id }));
  if (!app) return sendError(res, { statusCode: 404, code: "APPLICATION_NOT_FOUND", message: "Application not found" });
  if (["hired", "rejected"].includes(app.status)) return sendError(res, { statusCode: 400, code: "APPLICATION_CLOSED", message: "This application is already closed" });
  let interview;
  try {
    interview = validateInterviewDetails(req.body);
  } catch (error) {
    return sendError(res, { statusCode: error.statusCode || 400, code: error.code || "INVALID_INTERVIEW_DETAILS", message: error.message });
  }
  app.status = "interview";
  app.interview = interview;
  await app.save();
  const modeLabel = interview.mode === "remote" ? "Online / remote" : "Physical / in-person";
  await notifyCandidateUpdate({
    app,
    title: "Planned Interview Window",
    body: `${app.job.title}: ${interview.date} at ${interview.time} (${modeLabel}). Check your instructions before joining.`,
    type: "interview",
    extraMetadata: interview,
    emailHtml: applicationMailTemplate({
      heading: "Planned Interview Window",
      intro: "Your interview has been scheduled. Please follow the instructions below carefully.",
      app,
      details: [
        ["Date", escapeHtml(interview.date)],
        ["Time", escapeHtml(interview.time)],
        ["Mode", escapeHtml(modeLabel)],
        ["Interview access", interview.mode === "remote" ? `<a href="${escapeHtml(interview.meetingUrl)}">${escapeHtml(interview.meetingUrl)}</a>` : escapeHtml(interview.locationAddress)],
        ["Map link", interview.mapLink ? `<a href="${escapeHtml(interview.mapLink)}">${escapeHtml(interview.mapLink)}</a>` : "-"],
        ["Support contact", escapeHtml(interview.supportContact)],
      ],
      guidance: interviewGuidance(interview),
    }),
  });
  return sendSuccess(res, { message: "Interview scheduled", data: { application: app } });
});

employerRouter.post("/applications/:id/hire", requireAuth, requireRole("employer"), async (req, res) => {
  const app = await populateApplication(Application.findOne({ _id: req.params.id, employer: req.user._id }));
  if (!app) return sendError(res, { statusCode: 404, code: "APPLICATION_NOT_FOUND", message: "Application not found" });
  app.status = "hired";
  app.offer = req.body;
  await app.save();
  await notifyCandidateUpdate({
    app,
    title: "Selection confirmed",
    body: `Congratulations! You have been selected for ${app.job.title}.`,
    type: "hired",
    emailHtml: applicationMailTemplate({
      heading: "Selection Confirmed",
      intro: "Congratulations. The employer has selected your application.",
      app,
      note: "Please keep your phone and email active for joining or onboarding instructions.",
    }),
  });
  return sendSuccess(res, { message: "Candidate hired", data: { application: app } });
});

employerRouter.post("/applications/:id/reject", requireAuth, requireRole("employer"), async (req, res) => {
  const app = await populateApplication(Application.findOne({ _id: req.params.id, employer: req.user._id }));
  if (!app) return sendError(res, { statusCode: 404, code: "APPLICATION_NOT_FOUND", message: "Application not found" });
  const reason = String(req.body.reason || "").trim();
  if (!reason) return sendError(res, { statusCode: 400, code: "REJECTION_REASON_REQUIRED", message: "A professional rejection reason is required" });
  app.status = "rejected";
  app.rejectionReason = reason;
  await app.save();
  await notifyCandidateUpdate({
    app,
    title: "Application update",
    body: `Your application for ${app.job.title} was not selected. Reason: ${reason}`,
    type: "application_rejected",
    emailHtml: applicationMailTemplate({
      heading: "Application Update",
      intro: "Thank you for applying. The employer has closed this application with the reason below.",
      app,
      details: [["Reason", escapeHtml(reason)]],
      note: "You can continue applying to other verified opportunities on Rozgar Mitra.",
    }),
  });
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
      if (tokens.length) await firebase.messaging().sendEachForMulticast({ tokens, notification: { title: 'New room posted', body: room.title || 'A new room was posted' } });
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
