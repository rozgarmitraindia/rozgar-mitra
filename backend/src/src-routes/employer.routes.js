import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { Job } from "../models/Job.js";
import { Room } from "../models/Room.js";
import { Application } from "../models/Application.js";
import { Booking } from "../models/Booking.js";
import { makeImmutableId } from "../utils/id.js";
import { renderEmailTemplate, sendMail } from "../services/mail.service.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";
import { getFirebaseAdmin } from "../services/firebase.service.js";
import { User } from "../models/User.js";
import { createNotification } from "../services/notification.service.js";

export const employerRouter = Router();

const candidateBioFields = "fullName email mobile dateOfBirth gender address pincode skills experience workExperienceMonths workExperiences availability about profilePhoto resume documents immutableId";

function populateApplication(query) {
  return query
    .populate({ path: "candidate", select: candidateBioFields })
    .populate({ path: "employer", select: "companyName email companyEmail fullName immutableId" })
    .populate({ path: "job", select: "title role postId companyName salary employmentType vacancies address googleMapLink status" });
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
  const hrName = String(payload.hrName || "").trim();
  const supportContact = String(payload.supportContact || "").trim();
  if (!['remote', 'physical'].includes(mode)) throw interviewError("Select Remote or Physical interview mode");
  if (!date || !time || !hrName || !supportContact) throw interviewError("Interview date, time, HR name and support contact are required");
  if (mode === "remote" && !String(payload.meetingUrl || "").trim()) throw interviewError("Meeting link is required for a remote interview");
  if (mode === "physical" && !String(payload.locationAddress || "").trim()) throw interviewError("Interview location is required for a physical interview");
  return {
    mode,
    date,
    time,
    hrName,
    supportContact,
    meetingUrl: mode === "remote" ? String(payload.meetingUrl).trim() : "",
    mapLink: mode === "physical" ? String(payload.mapLink || "").trim() : "",
    locationAddress: mode === "physical" ? String(payload.locationAddress).trim() : "",
  };
}

function toArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  return String(value).split(",").map((item) => item.trim()).filter(Boolean);
}

function normalizePhotos(photos = []) {
  return (Array.isArray(photos) ? photos : []).map((photo, index) => {
    if (typeof photo === "string") return { id: `photo-${index + 1}`, url: photo, caption: "", isCover: index === 0 };
    return {
      id: photo.id || photo.publicId || `photo-${index + 1}`,
      url: photo.url,
      caption: photo.caption || "",
      isCover: Boolean(photo.isCover),
    };
  }).filter((photo) => photo.url);
}

function makeRoomPublicId(roomId) {
  return `RM-ROOM-${String(roomId).replace(/^rozgarmitra-roomid-/i, "")}`;
}

function roomPayload(body = {}, user) {
  const type = body.type || body.roomType;
  const totalRooms = Math.max(1, Number(body.totalRooms || 1));
  const bedsPerRoom = Math.max(1, Number(body.bedsPerRoom || body.maxOccupancy || 1));
  const maxOccupancy = Math.max(1, Number(body.maxOccupancy || (totalRooms * bedsPerRoom) || 1));
  const occupiedOccupancy = Math.max(0, Number(body.occupiedOccupancy || 0));
  const availableOccupancy = Math.max(0, maxOccupancy - occupiedOccupancy);
  return {
    ...body,
    publicId: body.publicId,
    propertyName: body.propertyName || user.propertyName,
    ownerName: body.ownerName || user.fullName || user.propertyName,
    ownerVerified: user.status === "verified",
    ownerPublicId: user.immutableId,
    ownerPhone: body.ownerPhone || body.contactNumber || user.mobile || user.companyPhone,
    ownerWhatsapp: body.ownerWhatsapp || user.whatsapp,
    preferredContactTime: body.preferredContactTime || "10am - 7pm",
    type,
    roomType: type,
    totalRooms,
    bedsPerRoom,
    maxOccupancy,
    occupiedOccupancy,
    availableOccupancy,
    occupancyStatus: availableOccupancy <= 0 ? "full" : availableOccupancy <= Math.ceil(maxOccupancy * 0.25) ? "limited" : "available",
    mapLink: body.mapLink || body.googleMapLink,
    googleMapLink: body.googleMapLink || body.mapLink,
    contactNumber: body.contactNumber || body.ownerPhone || user.mobile || user.companyPhone,
    amenities: toArray(body.amenities),
    rules: toArray(body.rules),
    nearby: Array.isArray(body.nearby) ? body.nearby.filter((item) => item?.label || item?.distance).slice(0, 6) : [],
    photos: normalizePhotos(body.photos),
    tone: body.tone || "from-signal/20 to-verified/10",
  };
}

function visitStatusFor(booking) {
  return booking.visitStatus || booking.status || "pending";
}

function bookingStatusFor(booking) {
  return booking.bookingStatus || (booking.status === "completed" ? "notBooked" : "notBooked");
}

function roomCapacity(room) {
  const max = Math.max(1, Number(room?.maxOccupancy || 1));
  const occupied = Math.max(0, Number(room?.occupiedOccupancy || 0));
  return { max, occupied, available: Math.max(0, max - occupied) };
}

async function notifyRoomCandidate({ booking, title, body, type, details = [] }) {
  if (!booking?.user?._id) return;
  await createNotification({
    recipient: booking.user._id,
    title,
    body,
    channel: "inApp",
    metadata: { type, roomId: String(booking.room?._id || booking.room), bookingId: String(booking._id) },
    realtime: true,
  });
  if (booking.user.email) {
    await sendMail({
      to: booking.user.email,
      subject: title,
      html: renderEmailTemplate({
        title,
        headline: title,
        body,
        buttonText: "Open room",
        buttonLink: `${process.env.FRONTEND_URL || "http://localhost:5173"}/rooms/${booking.room?._id || booking.room}`,
        details,
      }),
    });
  }
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
  return renderEmailTemplate({
    title: heading,
    headline: heading,
    body: intro,
    rawBody: true,
    details: [...rows, ...detailRows],
    note: guidance.length ? `<strong>Important instructions</strong><ul>${guidance.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>${note ? `<p>${escapeHtml(note)}</p>` : ""}` : note,
    buttonText: "Open Rozgar Mitra",
  });
}

function reqSafeCompany(app) {
  return app.job?.companyName || app.employer?.companyName || app.employer?.fullName || "Company";
}

function monthDiff(startDate, endDate = new Date()) {
  if (!startDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || end < start) return 0;
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  return Math.max(months + (end.getDate() >= start.getDate() ? 0 : -1), 0);
}

function formatExperienceMonths(totalMonths = 0) {
  if (!totalMonths) return "Fresher";
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  return [years ? `${years} year${years > 1 ? "s" : ""}` : "", months ? `${months} month${months > 1 ? "s" : ""}` : ""].filter(Boolean).join(" ");
}

async function refreshCandidateExperience(candidateId) {
  const candidate = await User.findById(candidateId);
  if (!candidate) return null;
  const entries = candidate.workExperiences || [];
  const totalMonths = entries.reduce((sum, item) => sum + monthDiff(item.startDate, item.endDate || new Date()), 0);
  candidate.workExperienceMonths = totalMonths;
  candidate.experience = totalMonths === 0 && entries.length ? "Less than 1 month" : formatExperienceMonths(totalMonths);
  await candidate.save();
  return candidate;
}

async function createOrUpdateWorkExperience(app) {
  const candidate = await User.findById(app.candidate?._id || app.candidate);
  if (!candidate) return null;
  const applicationId = String(app._id);
  const existing = (candidate.workExperiences || []).find((item) => String(item.application) === applicationId);
  const startDate = app.offer?.joiningDate ? new Date(app.offer.joiningDate) : (app.hiredAt || new Date());
  const entry = {
    application: app._id,
    job: app.job?._id || app.job,
    employer: app.employer?._id || app.employer,
    companyName: reqSafeCompany(app),
    jobTitle: app.job?.title || "Job",
    role: app.job?.role || app.job?.title || "Employee",
    startDate,
    endDate: undefined,
    status: "active",
    terminationReason: "",
  };
  if (existing) Object.assign(existing, entry);
  else candidate.workExperiences.push(entry);
  await candidate.save();
  return refreshCandidateExperience(candidate._id);
}

async function closeWorkExperience(app, reason) {
  const candidate = await User.findById(app.candidate?._id || app.candidate);
  if (!candidate) return null;
  const applicationId = String(app._id);
  const item = (candidate.workExperiences || []).find((entry) => String(entry.application) === applicationId);
  if (item) {
    item.endDate = app.terminatedAt || new Date();
    item.status = "ended";
    item.terminationReason = reason;
  }
  await candidate.save();
  return refreshCandidateExperience(candidate._id);
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
  app.interviewReminderSentAt = undefined;
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
        ["HR / Interviewer", escapeHtml(interview.hrName)],
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
  if (["terminated", "rejected"].includes(app.status)) return sendError(res, { statusCode: 400, code: "APPLICATION_CLOSED", message: "This application is already closed" });
  app.status = "hired";
  app.offer = req.body;
  app.hiredAt = new Date();
  app.terminatedAt = undefined;
  app.terminationReason = "";
  await app.save();
  await createOrUpdateWorkExperience(app);
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

employerRouter.post("/applications/:id/fire", requireAuth, requireRole("employer"), async (req, res) => {
  const app = await populateApplication(Application.findOne({ _id: req.params.id, employer: req.user._id }));
  if (!app) return sendError(res, { statusCode: 404, code: "APPLICATION_NOT_FOUND", message: "Application not found" });
  if (app.status !== "hired") return sendError(res, { statusCode: 400, code: "NOT_HIRED", message: "Only a hired candidate can be fired." });
  const reason = String(req.body.reason || "").trim();
  if (!reason) return sendError(res, { statusCode: 400, code: "FIRE_REASON_REQUIRED", message: "Termination reason is required." });
  app.status = "terminated";
  app.terminatedAt = new Date();
  app.terminationReason = reason;
  await app.save();
  await closeWorkExperience(app, reason);
  await notifyCandidateUpdate({
    app,
    title: "Employment ended",
    body: `Your employment for ${app.job.title} at ${reqSafeCompany(app)} has ended. Reason: ${reason}`,
    type: "employment_terminated",
    emailHtml: applicationMailTemplate({
      heading: "Employment Ended",
      intro: "The employer has marked this employment as ended.",
      app,
      details: [["Reason", escapeHtml(reason)], ["End date", escapeHtml(new Date().toLocaleDateString("en-IN"))]],
      note: "Your Rozgar Mitra profile work experience has been updated with the employment date range.",
    }),
  });
  return sendSuccess(res, { message: "Candidate employment ended", data: { application: app } });
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
  const roomId = makeImmutableId("roomid");
  const room = await Room.create({
    ...roomPayload(req.body, req.user),
    roomId,
    publicId: req.body.publicId || makeRoomPublicId(roomId),
    owner: req.user._id,
    immutableOwnerId: req.user.immutableId,
    status: req.body.status === "draft" ? "draft" : "pending",
    statusReason: undefined,
    adminReason: undefined,
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

employerRouter.patch("/rooms/:id", requireAuth, requireRole("roomOwner"), async (req, res) => {
  const room = await Room.findOne({ _id: req.params.id, owner: req.user._id });
  if (!room) return sendError(res, { statusCode: 404, code: "ROOM_NOT_FOUND", message: "Room not found" });
  Object.assign(room, roomPayload(req.body, req.user));
  if (req.body.status === "draft") {
    room.status = "draft";
  } else if (["draft", "rejected", "closed"].includes(room.status) || req.body.resubmit) {
    room.status = "pending";
    room.statusReason = undefined;
    room.adminReason = undefined;
  }
  await room.save();
  return sendSuccess(res, { message: room.status === "draft" ? "Room draft saved" : "Room submitted for admin review", data: { room } });
});

employerRouter.patch("/rooms/:id/close", requireAuth, requireRole("roomOwner"), async (req, res) => {
  const room = await Room.findOne({ _id: req.params.id, owner: req.user._id });
  if (!room) return sendError(res, { statusCode: 404, code: "ROOM_NOT_FOUND", message: "Room not found" });
  room.status = "closed";
  room.statusReason = req.body.reason || "Closed by owner";
  await room.save();
  return sendSuccess(res, { message: "Room listing closed", data: { room } });
});

employerRouter.post("/rooms/:id/duplicate", requireAuth, requireRole("roomOwner"), async (req, res) => {
  const source = await Room.findOne({ _id: req.params.id, owner: req.user._id }).lean();
  if (!source) return sendError(res, { statusCode: 404, code: "ROOM_NOT_FOUND", message: "Room not found" });
  const roomId = makeImmutableId("roomid");
  const { _id, createdAt, updatedAt, views, requests, adminReason, statusReason, ...copy } = source;
  const room = await Room.create({
    ...copy,
    roomId,
    publicId: makeRoomPublicId(roomId),
    title: `${source.title || "Room"} copy`,
    status: "draft",
    views: 0,
    requests: 0,
  });
  return sendSuccess(res, { statusCode: 201, message: "Draft duplicate created", data: { room } });
});

employerRouter.delete("/rooms/:id", requireAuth, requireRole("roomOwner"), async (req, res) => {
  const room = await Room.findOne({ _id: req.params.id, owner: req.user._id });
  if (!room) return sendError(res, { statusCode: 404, code: "ROOM_NOT_FOUND", message: "Room not found" });
  const bookingCount = await Booking.countDocuments({ room: room._id });
  await Promise.all([
    Booking.deleteMany({ room: room._id }),
    Room.deleteOne({ _id: room._id }),
  ]);
  return sendSuccess(res, { message: "Room permanently deleted", data: { id: String(room._id), deletedBookings: bookingCount } });
});

employerRouter.get("/visit-requests", requireAuth, requireRole("roomOwner"), async (req, res) => {
  const items = await Booking.find({
    owner: req.user._id,
    $or: [
      { visitStatus: { $in: ["pending", "confirmed", "rejected", "cancelled"] } },
      { visitStatus: { $exists: false }, status: { $in: ["pending", "confirmed", "rejected", "cancelled"] } },
    ],
  })
    .populate("user", "fullName email mobile phone dateOfBirth gender address pincode skills experience workExperienceMonths workExperiences availability about profilePhoto resume documents immutableId createdAt")
    .populate("room")
    .sort({ createdAt: -1 });
  return sendSuccess(res, { message: "Visit requests fetched", data: { items } });
});

employerRouter.get("/bookings", requireAuth, requireRole("roomOwner"), async (req, res) => {
  const items = await Booking.find({
    owner: req.user._id,
    $or: [
      { visitStatus: "completed" },
      { visitStatus: { $exists: false }, status: "completed" },
    ],
  })
    .populate("user", "fullName email mobile phone dateOfBirth gender address pincode skills experience workExperienceMonths workExperiences availability about profilePhoto resume documents immutableId createdAt")
    .populate("room")
    .sort({ updatedAt: -1 });
  return sendSuccess(res, { message: "Bookings fetched", data: { items } });
});

employerRouter.post("/visit-requests/:id/respond", requireAuth, requireRole("roomOwner"), async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, owner: req.user._id })
    .populate("user", "fullName email mobile phone dateOfBirth gender address pincode skills experience workExperienceMonths workExperiences availability about profilePhoto resume documents immutableId createdAt")
    .populate("room");
  if (!booking) return sendError(res, { statusCode: 404, code: "BOOKING_NOT_FOUND", message: "Visit request not found" });
  const { action, message, visitDate, visitTime, meetingUrl, locationAddress, supportContact } = req.body;
  if (action === "accept") {
    booking.status = "confirmed";
    booking.visitStatus = "confirmed";
  } else if (action === "reject") {
    booking.status = "rejected";
    booking.visitStatus = "rejected";
  } else if (action === "complete") {
    if (visitStatusFor(booking) !== "confirmed") {
      return sendError(res, { statusCode: 400, code: "VISIT_NOT_CONFIRMED", message: "Only confirmed visits can be marked completed" });
    }
    booking.status = "completed";
    booking.visitStatus = "completed";
  } else if (action === "reschedule") {
    booking.status = "pending";
    booking.visitStatus = "pending";
    if (visitDate) booking.visitDate = visitDate;
    if (visitTime) booking.visitTime = visitTime;
    if (locationAddress) booking.locationAddress = locationAddress;
    if (meetingUrl) booking.meetingUrl = meetingUrl;
    if (supportContact) booking.supportContact = supportContact;
  }
  booking.message = message || booking.message;
  await booking.save();
  await sendMail({
    to: booking.user.email,
    subject: "Visit request updated",
    html: renderEmailTemplate({
      title: "Visit Request Update",
      headline: `Visit request ${booking.status}`,
      body: `Your visit request for ${booking.room.title || booking.room.propertyName || "the room"} has been updated by the room owner.`,
      buttonText: "Open Rozgar Mitra",
      buttonLink: `${process.env.FRONTEND_URL || "http://localhost:5173"}/rooms/${booking.room._id}`,
      note: booking.message || "",
      details: [
        ["Room", booking.room.title || booking.room.propertyName || "-"],
        ["Status", booking.status],
        ["Visit status", visitStatusFor(booking)],
        ["Booking status", bookingStatusFor(booking)],
        ["Visit date", booking.visitDate || "Date not selected"],
        ["Visit time", booking.visitTime || "Time not selected"],
        ["Owner action", action || "-"],
      ],
    }),
  });
  return sendSuccess(res, { message: "Request updated", data: { booking } });
});

employerRouter.post("/bookings/:id/confirm", requireAuth, requireRole("roomOwner"), async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, owner: req.user._id })
    .populate("user", "fullName email mobile phone immutableId")
    .populate("room");
  if (!booking) return sendError(res, { statusCode: 404, code: "BOOKING_NOT_FOUND", message: "Booking not found" });
  if (visitStatusFor(booking) !== "completed") {
    return sendError(res, { statusCode: 400, code: "VISIT_NOT_COMPLETED", message: "Complete the visit before approving room booking" });
  }
  if (bookingStatusFor(booking) === "booked") {
    return sendError(res, { statusCode: 400, code: "ALREADY_BOOKED", message: "This candidate is already marked booked for this room" });
  }

  const requestedOccupancy = Math.max(1, Number(req.body.occupancy || 1));
  const room = booking.room;
  const capacity = roomCapacity(room);
  if (requestedOccupancy > capacity.available) {
    return sendError(res, {
      statusCode: 400,
      code: "OCCUPANCY_EXCEEDED",
      message: `Only ${capacity.available} occupancy left for this room`,
    });
  }

  booking.bookingStatus = "booked";
  booking.bookedOccupancy = requestedOccupancy;
  booking.assignedUnit = String(req.body.assignedUnit || "").trim();
  booking.assignedBed = String(req.body.assignedBed || "").trim();
  booking.bookingNote = String(req.body.note || "").trim();
  await booking.save();

  room.occupiedOccupancy = capacity.occupied + requestedOccupancy;
  room.availableOccupancy = Math.max(0, capacity.max - Number(room.occupiedOccupancy || 0));
  room.occupancyStatus = room.availableOccupancy <= 0 ? "full" : room.availableOccupancy <= Math.ceil(capacity.max * 0.25) ? "limited" : "available";
  if (room.availableOccupancy <= 0) room.status = "closed";
  await room.save();

  const body = `Your room booking has been approved for ${room.title || room.propertyName || "the room"}.`;
  await notifyRoomCandidate({
    booking,
    title: "Room booking confirmed",
    body,
    type: "room_booking_confirmed",
    details: [
      ["Room", room.title || room.propertyName || "-"],
      ["Room ID", room.publicId || room.roomId || String(room._id)],
      ["Booked occupancy", String(requestedOccupancy)],
      ["Assigned room/bed", [booking.assignedUnit, booking.assignedBed].filter(Boolean).join(" / ") || "-"],
      ["Available occupancy left", String(room.availableOccupancy)],
    ],
  });

  return sendSuccess(res, { message: "Room booking confirmed", data: { booking, room } });
});
