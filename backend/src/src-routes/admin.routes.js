import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { User } from "../models/User.js";
import { Job } from "../models/Job.js";
import { Room } from "../models/Room.js";
import { Application } from "../models/Application.js";
import { ActivityLog } from "../models/ActivityLog.js";
import { Booking } from "../models/Booking.js";
import { Complaint } from "../models/Complaint.js";
import { Notification } from "../models/Notification.js";
import { Skill } from "../models/Skill.js";
import { sendMail, sendStatusMail, sendAdminCredentialsMail } from "../services/mail.service.js";
import { createNotification } from "../services/notification.service.js";
import { asyncHandler, sendError, sendSuccess } from "../utils/apiResponse.js";
import { sanitizeUser } from "../utils/authStatus.js";
import { makeImmutableId } from "../utils/id.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole("admin", "superAdmin"));

const userStatuses = ["pending", "verified", "rejected", "suspended", "unverified"];
const jobStatuses = ["pending", "live", "rejected"];
const bookingStatuses = ["pending", "confirmed", "completed", "cancelled", "rejected"];
const complaintStatuses = ["open", "inReview", "resolved", "rejected"];
const notificationStatuses = ["draft", "sent", "failed", "read", "unread"];
const userBioSelect = "fullName email mobile phone dateOfBirth gender address pincode skills companyPreferences talentShares experience workExperienceMonths workExperiences availability about profilePhoto resume documents immutableId createdAt";

const modules = {
  candidates: {
    model: User,
    label: "Candidate",
    filter: { role: "candidate" },
    search: ["fullName", "email", "mobile", "immutableId", "address", "skills"],
    statuses: userStatuses,
    populate: "",
  },
  employers: {
    model: User,
    label: "Company",
    filter: { role: "employer" },
    search: ["companyName", "email", "companyEmail", "companyPhone", "immutableId", "companyLocation"],
    statuses: userStatuses,
    populate: "",
  },
  admins: {
    model: User,
    label: "Admins",
    filter: { role: { $in: ["admin", "superAdmin"] } },
    search: ["fullName", "email", "mobile", "immutableId"],
    statuses: userStatuses,
    populate: "",
  },
  "room-owners": {
    model: User,
    label: "Room Owner",
    filter: { role: "roomOwner" },
    search: ["propertyName", "email", "mobile", "immutableId", "address"],
    statuses: userStatuses,
    populate: "",
  },
  jobs: {
    model: Job,
    label: "Job",
    filter: {},
    search: ["title", "role", "companyName", "address", "postId"],
    statuses: jobStatuses,
    populate: "employer",
  },
  rooms: {
    model: Room,
    label: "Room",
    filter: {},
    search: ["title", "propertyName", "address", "roomId"],
    statuses: jobStatuses,
    populate: "owner",
  },
  applications: {
    model: Application,
    label: "Application",
    filter: {},
    search: ["status"],
    statuses: ["submitted", "shortlisted", "interview", "hired", "terminated", "rejected"],
    populate: "candidate employer job",
  },
  bookings: {
    model: Booking,
    label: "Booking",
    filter: {},
    search: ["status", "message", "visitDate", "visitTime"],
    statuses: bookingStatuses,
    populate: [
      { path: "room" },
      { path: "user", select: userBioSelect },
      { path: "owner", select: "fullName propertyName email mobile companyPhone immutableId status" },
    ],
  },
  complaints: {
    model: Complaint,
    label: "Complaint",
    filter: {},
    search: ["subject", "message", "module", "status"],
    statuses: complaintStatuses,
    populate: "complainant againstUser",
  },
  notifications: {
    model: Notification,
    label: "Notification",
    filter: {},
    search: ["title", "body", "channel", "status"],
    statuses: notificationStatuses,
    populate: "recipient",
  },
  "system-logs": {
    model: ActivityLog,
    label: "System Log",
    filter: {},
    search: ["action", "module", "status", "reason", "entityModel"],
    statuses: [],
    populate: "actor",
  },
};

const statusSchema = z.object({
  body: z.object({
    status: z.string().trim().min(1),
    reason: z.string().trim().optional().or(z.literal("")),
  }),
  params: z.object({
    type: z.string(),
    id: z.string(),
  }),
  query: z.object({}).optional(),
});

const notificationSchema = z.object({
  body: z.object({
    recipient: z.string().optional(),
    targetRole: z.enum(["candidate", "employer", "roomOwner", "admin"]).optional(),
    title: z.string().trim().min(1),
    body: z.string().trim().min(1),
    channel: z.enum(["email", "push", "inApp", "system"]).default("inApp"),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const reasonSchema = z.object({
  body: z.object({
    reason: z.string().trim().min(1, "Reason is compulsory"),
  }).passthrough(),
  params: z.object({
    type: z.string().optional(),
    id: z.string(),
  }).passthrough(),
  query: z.object({}).optional(),
});

const listingEditSchema = z.object({
  body: z.object({
    reason: z.string().trim().min(1, "Edit reason is compulsory"),
  }).passthrough(),
  params: z.object({
    type: z.enum(["jobs", "rooms"]),
    id: z.string(),
  }),
  query: z.object({}).optional(),
});

const adminCreateSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(3),
    email: z.string().trim().email().transform((value) => value.toLowerCase()),
    mobile: z.string().trim().min(10),
    password: z.string().trim().min(6),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const skillStatusSchema = z.object({
  body: z.object({
    status: z.enum(["approved", "rejected"]),
    reason: z.string().trim().optional().or(z.literal("")),
  }),
  params: z.object({
    id: z.string().trim().min(1),
  }),
  query: z.object({}).optional(),
});

const contactReplySchema = z.object({
  body: z.object({ reply: z.string().trim().min(2).max(10000) }),
  params: z.object({ id: z.string().trim().min(1) }),
  query: z.object({}).optional(),
});

function getModule(type) {
  return modules[type];
}

function regexSearch(fields, search) {
  if (!search) return {};
  const rx = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  return { $or: fields.map((field) => ({ [field]: rx })) };
}

function parsePagination(query) {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 10), 1), 100);
  return { page, limit, skip: (page - 1) * limit };
}

function shapeItem(item) {
  if (!item) return item;
  if (item.passwordHash || item.refreshTokens) return sanitizeUser(item);
  return typeof item.toObject === "function" ? item.toObject() : item;
}

async function createActivity(req, { action, module, entity, status, reason, metadata }) {
  await ActivityLog.create({
    actor: req.user._id,
    actorRole: req.user.role,
    action,
    module,
    entityId: String(entity?._id || ""),
    entityModel: entity?.constructor?.modelName,
    status,
    reason,
    metadata,
    ipAddress: req.ip,
  });
}

async function notifyStatusChange(type, item, status, reason) {
  if (["candidates", "employers", "room-owners"].includes(type)) {
    await sendStatusMail(item, status, reason);
    await createNotification({
      recipient: item._id,
      title: `Account ${status}`,
      body: reason ? `Your account status is ${status}. Reason: ${reason}` : `Your account status is ${status}.`,
      channel: "inApp",
      sendPush: true,
      metadata: { type: "account_status", status, reason: reason || "" },
    });
    return;
  }

  if (type === "jobs") {
    const employer = await User.findById(item.employer);
    if (employer) {
      const title = status === "live" ? "Job approved and published" : "Job rejected by admin";
      const body = status === "live"
        ? `${item.title || "Your job"} is now live on Rozgar Mitra.`
        : `${item.title || "Your job"} has been rejected and removed from public listings. Reason: ${reason}`;
      await createNotification({
        recipient: employer._id,
        title,
        body,
        channel: "inApp",
        sendEmail: true,
        sendPush: true,
        metadata: { type: "job_status", jobId: String(item._id), status, reason: reason || "" },
      });
    }
    if (status === "live") {
      await createNotification({
        targetRole: "candidate",
        title: "New job available",
        body: `${item.title || "A new job"}${item.companyName ? ` at ${item.companyName}` : ""} is now open for applications.`,
        channel: "inApp",
        sendPush: true,
        metadata: { type: "new_job", jobId: String(item._id) },
      });
    }
  }

  if (type === "rooms") {
    const owner = await User.findById(item.owner);
    if (owner) {
      const title = status === "live" ? "Room approved and published" : "Room rejected by admin";
      const body = status === "live"
        ? `${item.title || "Your room"} is now live on Rozgar Mitra.`
        : `${item.title || "Your room"} has been rejected and removed from public listings. Reason: ${reason}`;
      await createNotification({
        recipient: owner._id,
        title,
        body,
        channel: "inApp",
        sendEmail: true,
        sendPush: true,
        metadata: { type: "room_status", roomId: String(item._id), status, reason: reason || "" },
      });
    }
  }
}

async function safeNotification(payload) {
  try {
    await createNotification(payload);
  } catch (error) {
    console.error("Admin notification failed", { title: payload.title, error: error.message });
  }
}

async function notifyListingOwner(type, item, action, reason) {
  const ownerId = type === "jobs" ? item.employer : item.owner;
  const owner = await User.findById(ownerId);
  if (!owner) return;
  const noun = type === "jobs" ? "Job" : "Room";
  const title = `${noun} ${action} by admin`;
  const name = item.title || item.companyName || item.propertyName || `your ${noun.toLowerCase()}`;
  await safeNotification({
    recipient: owner._id,
    title,
    body: `${name} has been ${action} by admin. Reason: ${reason}`,
    channel: "inApp",
    sendEmail: true,
    sendPush: true,
    metadata: { type: `${type.slice(0, -1)}_${action}`, id: String(item._id), reason },
  });
}

function normalizeStatus(type, status) {
  if (type === "jobs" || type === "rooms") {
    if (status === "live" || status === "verified" || status === "approved" || status === "approve") return "live";
    if (status === "pending") return "pending";
    return "rejected";
  }
  return status;
}

function titleFor(item, type) {
  if (type === "candidates") return item.fullName || item.email || item.immutableId;
  if (type === "employers") return item.companyName || item.email || item.immutableId;
  if (type === "room-owners") return item.propertyName || item.email || item.immutableId;
  return item.title || item.subject || item._id;
}

function normalizeListingEditValue(key, value) {
  if (value === "") return undefined;
  if (["skills", "amenities", "photos"].includes(key)) {
    if (Array.isArray(value)) return value;
    return String(value).split(",").map((item) => item.trim()).filter(Boolean);
  }
  if (key === "vacancies") return Math.max(Number(value || 1), 1);
  if (["applicationStartDate", "applicationEndDate", "interviewStartDate", "interviewEndDate"].includes(key)) {
    return value ? new Date(value) : undefined;
  }
  return value;
}

adminRouter.get("/meta/modules", (_req, res) => {
  return sendSuccess(res, {
    message: "Admin modules fetched",
    data: Object.fromEntries(Object.entries(modules).map(([key, value]) => [key, { label: value.label, statuses: value.statuses }])),
  });
});

adminRouter.get("/dashboard/analytics", asyncHandler(async (_req, res) => {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const months = Array.from({ length: 12 }, (_, index) => {
    const start = new Date(now.getFullYear(), index, 1);
    const end = new Date(now.getFullYear(), index + 1, 1);
    return { label: start.toLocaleString("en", { month: "short" }), start, end };
  });

  const [
    users,
    employers,
    roomOwners,
    rooms,
    jobs,
    applications,
    bookings,
    complaints,
    recentActivity,
  ] = await Promise.all([
    User.countDocuments({ role: "candidate" }),
    User.countDocuments({ role: "employer" }),
    User.countDocuments({ role: "roomOwner" }),
    Room.countDocuments(),
    Job.countDocuments(),
    Application.countDocuments(),
    Booking.countDocuments(),
    Complaint.countDocuments(),
    ActivityLog.find().populate("actor").sort({ createdAt: -1 }).limit(10),
  ]);

  const growth = await Promise.all(months.map(async (month) => ({
    month: month.label,
    users: await User.countDocuments({ createdAt: { $gte: month.start, $lt: month.end } }),
    jobs: await Job.countDocuments({ createdAt: { $gte: month.start, $lt: month.end } }),
    rooms: await Room.countDocuments({ createdAt: { $gte: month.start, $lt: month.end } }),
    applications: await Application.countDocuments({ createdAt: { $gte: month.start, $lt: month.end } }),
  })));

  const statusSummary = {
    pendingUsers: await User.countDocuments({ status: "pending" }),
    verifiedUsers: await User.countDocuments({ status: "verified" }),
    pendingJobs: await Job.countDocuments({ status: "pending" }),
    pendingRooms: await Room.countDocuments({ status: "pending" }),
    openComplaints: await Complaint.countDocuments({ status: "open" }),
    liveJobs: await Job.countDocuments({ status: "live" }),
    liveRooms: await Room.countDocuments({ status: "live" }),
    yearGrowth: await User.countDocuments({ createdAt: { $gte: yearStart } }),
  };

  return sendSuccess(res, {
    message: "Dashboard analytics fetched",
    data: {
      totals: { users, employers, roomOwners, rooms, jobs, applications, bookings, complaints },
      statusSummary,
      growth,
      recentActivity: recentActivity.map(shapeItem),
    },
  });
}));

adminRouter.get("/reports/summary", asyncHandler(async (_req, res) => {
  const [usersByStatus, jobsByStatus, roomsByStatus, applicationsByStatus] = await Promise.all([
    User.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Job.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Room.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Application.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);
  return sendSuccess(res, { message: "Reports fetched", data: { usersByStatus, jobsByStatus, roomsByStatus, applicationsByStatus } });
}));

adminRouter.get("/skills", asyncHandler(async (req, res) => {
  const requestedStatus = String(req.query.status || "").trim().toLowerCase();
  const allowedStatuses = ["pending", "approved", "rejected"];
  const filter = {};

  if (requestedStatus && allowedStatuses.includes(requestedStatus)) {
    if (requestedStatus === "pending") {
      filter.isApproved = false;
      filter.isRejected = false;
    } else if (requestedStatus === "approved") {
      filter.isApproved = true;
    } else {
      filter.isRejected = true;
    }
  }

  const items = await Skill.find(filter).sort({ createdAt: -1 }).lean();
  const pending = items.filter((item) => !item.isApproved && !item.isRejected);

  return sendSuccess(res, {
    message: "Skill suggestions fetched",
    data: {
      items,
      pending,
      approved: items.filter((item) => item.isApproved),
      rejected: items.filter((item) => item.isRejected),
    },
  });
}));

adminRouter.patch("/skills/:id/status", validate(skillStatusSchema), asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { status, reason = "" } = req.validated.body;

  const item = await Skill.findById(id);
  if (!item) {
    return sendError(res, { statusCode: 404, code: "SKILL_NOT_FOUND", message: "Skill suggestion not found" });
  }

  if (status === "approved") {
    item.isApproved = true;
    item.isRejected = false;
    item.approvedBy = req.user._id;
    item.rejectedBy = null;
    item.displayName = item.displayName || item.name;
  } else {
    item.isApproved = false;
    item.isRejected = true;
    item.rejectedBy = req.user._id;
    item.approvedBy = null;
  }

  item.name = String(item.name || "").trim().toLowerCase();
  item.displayName = String(item.displayName || item.name || "").trim();
  if (reason) item.reason = String(reason).trim();

  await item.save();

  return sendSuccess(res, {
    message: status === "approved" ? "Skill approved and added to the master list" : "Skill rejected",
    data: { item: item.toObject() },
  });
}));

adminRouter.post("/admins", validate(adminCreateSchema), asyncHandler(async (req, res) => {
  const { fullName, email, mobile, password } = req.validated.body;
  const existing = await User.findOne({ role: "admin", $or: [{ email }, { mobile }] });
  if (existing) {
    return sendError(res, { statusCode: 409, code: "ADMIN_EXISTS", message: "Admin with provided email or mobile already exists" });
  }

  const user = await User.create({
    role: "admin",
    status: "verified",
    emailVerified: true,
    phoneVerified: true,
    immutableId: makeImmutableId("adminid"),
    fullName,
    email,
    mobile,
    passwordHash: await bcrypt.hash(password, 10),
  });

  await sendAdminCredentialsMail({ user, password });
  await createActivity(req, { action: "admin.create", module: "settings", entity: user, status: "verified" });

  return sendSuccess(res, { statusCode: 201, message: "Admin account created", data: { item: sanitizeUser(user) } });
}));

adminRouter.post("/notifications", validate(notificationSchema), asyncHandler(async (req, res) => {
  const { recipient, targetRole, title, body, channel } = req.validated.body;
  const created = await createNotification({
    recipient,
    targetRole,
    title,
    body,
    channel,
    sendEmail: channel === "email",
    sendPush: channel === "push",
    metadata: { type: "admin_announcement" },
  });
  const items = Array.isArray(created) ? created : [created];
  await createActivity(req, {
    action: "notification.broadcast",
    module: "notifications",
    entity: items[0],
    status: "sent",
    metadata: { targetRole: targetRole || "all", recipient: recipient || null, recipientCount: items.length, channel },
  });
  return sendSuccess(res, {
    statusCode: 201,
    message: `Notification sent to ${items.length} user${items.length === 1 ? "" : "s"}`,
    data: { item: items[0] || null, recipientCount: items.length },
  });
}));

adminRouter.delete("/jobs/:id", asyncHandler(async (req, res) => {
  const reason = String(req.body?.reason || "").trim();
  if (!reason) return sendError(res, { statusCode: 400, code: "REASON_REQUIRED", message: "Delete reason is compulsory" });
  const job = await Job.findById(req.params.id);
  if (!job) return sendError(res, { statusCode: 404, code: "JOB_NOT_FOUND", message: "Job not found" });

  const applicationCount = await Application.countDocuments({ job: job._id });
  await notifyListingOwner("jobs", job, "deleted", reason);
  await createActivity(req, {
    action: "job.delete",
    module: "jobs",
    entity: job,
    status: "deleted",
    reason,
    metadata: { title: job.title, postId: job.postId, previousStatus: job.status, applicationCount },
  });
  await Promise.all([
    Application.deleteMany({ job: job._id }),
    User.updateMany({ savedJobs: job._id }, { $pull: { savedJobs: job._id } }),
    Job.deleteOne({ _id: job._id }),
  ]);

  return sendSuccess(res, {
    message: "Job permanently deleted and removed from public listings",
    data: { id: String(job._id), deletedApplications: applicationCount },
  });
}));

adminRouter.delete("/rooms/:id", asyncHandler(async (req, res) => {
  const reason = String(req.body?.reason || "").trim();
  if (!reason) return sendError(res, { statusCode: 400, code: "REASON_REQUIRED", message: "Delete reason is compulsory" });
  const room = await Room.findById(req.params.id);
  if (!room) return sendError(res, { statusCode: 404, code: "ROOM_NOT_FOUND", message: "Room not found" });

  const bookingCount = await Booking.countDocuments({ room: room._id });
  await notifyListingOwner("rooms", room, "deleted", reason);
  await createActivity(req, {
    action: "room.delete",
    module: "rooms",
    entity: room,
    status: "deleted",
    reason,
    metadata: { title: room.title, roomId: room.roomId, previousStatus: room.status, bookingCount },
  });
  await Promise.all([
    Booking.deleteMany({ room: room._id }),
    User.updateMany({ savedRooms: room._id }, { $pull: { savedRooms: room._id } }),
    Room.deleteOne({ _id: room._id }),
  ]);

  return sendSuccess(res, {
    message: "Room permanently deleted and removed from public listings",
    data: { id: String(room._id), deletedBookings: bookingCount },
  });
}));

adminRouter.patch("/:type/:id", validate(listingEditSchema), asyncHandler(async (req, res) => {
  const { type, id } = req.validated.params;
  const { reason, ...body } = req.validated.body;
  const config = getModule(type);
  if (!config || !["jobs", "rooms"].includes(type)) {
    return sendError(res, { statusCode: 404, code: "UNKNOWN_ADMIN_SECTION", message: "Unknown admin section" });
  }

  const item = await config.model.findById(id);
  if (!item) return sendError(res, { statusCode: 404, code: "NOT_FOUND", message: "Not found" });

  const allowed = type === "jobs"
    ? ["title", "role", "genderNeeded", "vacancies", "employmentType", "ageRange", "skills", "salary", "requirements", "googleMapLink", "address", "contactNumber", "description", "benefits", "applicationStartDate", "applicationEndDate", "interviewStartDate", "interviewEndDate", "interviewStartTime", "interviewEndTime", "interviewMode", "interviewDetails"]
    : ["propertyName", "title", "rent", "deposit", "amenities", "roomType", "photos", "googleMapLink", "address", "contactNumber", "description"];

  for (const key of allowed) {
    if (body[key] !== undefined) {
      const normalized = normalizeListingEditValue(key, body[key]);
      if (normalized !== undefined) item[key] = normalized;
    }
  }
  await item.save();
  await notifyListingOwner(type, item, "edited", reason);
  await createActivity(req, {
    action: `${type.slice(0, -1)}.edit`,
    module: type,
    entity: item,
    status: item.status,
    reason,
    metadata: { title: titleFor(item, type), editedFields: Object.keys(body).filter((key) => allowed.includes(key)) },
  });

  return sendSuccess(res, { message: `${config.label} updated`, data: { item: shapeItem(item) } });
}));

adminRouter.delete("/notifications/all", asyncHandler(async (req, res) => {
  const result = await Notification.deleteMany({});
  await createActivity(req, {
    action: "notification.deleteAll",
    module: "notifications",
    entity: { _id: "all", constructor: { modelName: "Notification" } },
    status: "deleted",
    reason: "Admin permanently deleted all notifications",
    metadata: { deletedCount: result.deletedCount || 0 },
  });
  return sendSuccess(res, { message: "All notifications permanently deleted", data: { deletedCount: result.deletedCount || 0 } });
}));

adminRouter.delete("/notifications/:id", asyncHandler(async (req, res) => {
  const notification = await Notification.findByIdAndDelete(req.params.id);
  if (!notification) return sendError(res, { statusCode: 404, code: "NOTIFICATION_NOT_FOUND", message: "Notification not found" });
  await createActivity(req, {
    action: "notification.delete",
    module: "notifications",
    entity: notification,
    status: "deleted",
    reason: "Admin permanently deleted notification",
    metadata: { title: notification.title, recipient: notification.recipient },
  });
  return sendSuccess(res, { message: "Notification permanently deleted", data: { id: String(notification._id) } });
}));

adminRouter.delete("/:type/:id", validate(reasonSchema), asyncHandler(async (req, res) => {
  const { type, id } = req.validated.params;
  const { reason } = req.validated.body;
  if (!["candidates", "employers", "room-owners"].includes(type)) {
    return sendError(res, { statusCode: 404, code: "UNKNOWN_ADMIN_SECTION", message: "Unknown admin section" });
  }
  const config = getModule(type);
  const user = await User.findOne({ _id: id, ...config.filter });
  if (!user) return sendError(res, { statusCode: 404, code: "NOT_FOUND", message: "Account not found" });
  if (["admin", "superAdmin"].includes(user.role)) {
    return sendError(res, { statusCode: 403, code: "ADMIN_DELETE_FORBIDDEN", message: "Admin accounts cannot be deleted here" });
  }

  await safeNotification({
    recipient: user._id,
    title: "Account deleted by admin",
    body: `Your Rozgar Mitra account has been permanently deleted. Reason: ${reason}`,
    channel: "inApp",
    sendEmail: true,
    sendPush: true,
    metadata: { type: "account_deleted", reason },
  });

  const metadata = { email: user.email, role: user.role, immutableId: user.immutableId };
  if (user.role === "candidate") {
    await Promise.all([
      Application.deleteMany({ candidate: user._id }),
      Booking.deleteMany({ user: user._id }),
    ]);
  }
  if (user.role === "employer") {
    const jobs = await Job.find({ employer: user._id }).select("_id").lean();
    const jobIds = jobs.map((job) => job._id);
    await Promise.all([
      Application.deleteMany({ employer: user._id }),
      Job.deleteMany({ employer: user._id }),
      User.updateMany({ savedJobs: { $in: jobIds } }, { $pull: { savedJobs: { $in: jobIds } } }),
    ]);
    metadata.deletedJobs = jobIds.length;
  }
  if (user.role === "roomOwner") {
    const rooms = await Room.find({ owner: user._id }).select("_id").lean();
    const roomIds = rooms.map((room) => room._id);
    await Promise.all([
      Booking.deleteMany({ owner: user._id }),
      Room.deleteMany({ owner: user._id }),
      User.updateMany({ savedRooms: { $in: roomIds } }, { $pull: { savedRooms: { $in: roomIds } } }),
    ]);
    metadata.deletedRooms = roomIds.length;
  }

  await createActivity(req, {
    action: "account.delete",
    module: type,
    entity: user,
    status: "deleted",
    reason,
    metadata,
  });
  await User.deleteOne({ _id: user._id });

  return sendSuccess(res, { message: "Account permanently deleted", data: { id: String(user._id), metadata } });
}));

adminRouter.get("/contact-messages", asyncHandler(async (_req, res) => {
  const items = await Complaint.find({ module: "contact" })
    .populate("repliedBy", "fullName email immutableId")
    .sort({ createdAt: -1 })
    .limit(500);
  return sendSuccess(res, { message: "Contact messages fetched", data: { items: items.map(shapeItem) } });
}));

adminRouter.post("/contact-messages/:id/reply", validate(contactReplySchema), asyncHandler(async (req, res) => {
  const item = await Complaint.findOne({ _id: req.validated.params.id, module: "contact" });
  if (!item) return sendError(res, { statusCode: 404, code: "CONTACT_MESSAGE_NOT_FOUND", message: "Contact message not found." });
  if (!item.contactEmail) return sendError(res, { statusCode: 400, code: "CONTACT_EMAIL_MISSING", message: "Sender email is not available." });
  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) return sendError(res, { statusCode: 503, code: "EMAIL_NOT_CONFIGURED", message: "Email service is not configured. Add RESEND_API_KEY and MAIL_FROM." });
  const reply = req.validated.body.reply;
  await sendMail({
    to: item.contactEmail,
    subject: `Re: ${item.subject || "Your Rozgar Mitra enquiry"}`,
    html: `<p>Hello ${String(item.contactName || "there").replace(/[<>&"']/g, "")},</p><p>${reply.replace(/[<>&]/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[character]).replace(/\n/g, "<br />")}</p>`,
  });
  item.adminReply = reply;
  item.repliedAt = new Date();
  item.repliedBy = req.user._id;
  item.status = "resolved";
  await item.save();
  await createActivity(req, {
    action: "contact.reply",
    module: "contact",
    entity: item,
    status: "resolved",
    reason: "",
    metadata: { recipient: item.contactEmail, subject: item.subject },
  });
  return sendSuccess(res, { message: `Reply sent to ${item.contactEmail}.`, data: { item: shapeItem(item) } });
}));

adminRouter.get("/talent/groups", asyncHandler(async (_req, res) => {
  const [candidates, employers] = await Promise.all([
    User.find({ role: "candidate", status: "verified", skills: { $exists: true, $ne: [] }, companyPreferences: { $exists: true, $ne: [] } })
      .select(userBioSelect)
      .lean(),
    User.find({ role: "employer", status: "verified" })
      .select("companyName fullName email companyEmail immutableId")
      .lean(),
  ]);
  const groups = new Map();
  for (const candidate of candidates) {
    for (const companyPreference of candidate.companyPreferences || []) {
      for (const skill of candidate.skills || []) {
        const key = `${String(companyPreference).trim().toLowerCase()}::${String(skill).trim().toLowerCase()}`;
        if (!groups.has(key)) groups.set(key, { key, companyPreference, skill, candidates: [] });
        groups.get(key).candidates.push(candidate);
      }
    }
  }
  const items = [...groups.values()]
    .map((group) => ({
      ...group,
      count: group.candidates.length,
      matchedEmployers: employers.filter((employer) => String(employer.companyName || employer.fullName || "").trim().toLowerCase() === String(group.companyPreference).trim().toLowerCase()),
    }))
    .sort((a, b) => b.count - a.count || a.companyPreference.localeCompare(b.companyPreference));
  return sendSuccess(res, { message: "Candidate talent groups fetched", data: { items, employers } });
}));

adminRouter.post("/talent/share", asyncHandler(async (req, res) => {
  const employerId = String(req.body.employerId || "").trim();
  const candidateIds = Array.isArray(req.body.candidateIds) ? [...new Set(req.body.candidateIds.map(String))] : [];
  const skill = String(req.body.skill || "").trim();
  const companyPreference = String(req.body.companyPreference || "").trim();
  if (!employerId || !candidateIds.length) return sendError(res, { statusCode: 400, code: "SHARE_DETAILS_REQUIRED", message: "Company and at least one candidate are required." });
  const employer = await User.findOne({ _id: employerId, role: "employer", status: "verified" });
  if (!employer) return sendError(res, { statusCode: 404, code: "EMPLOYER_NOT_FOUND", message: "Verified company not found." });
  const candidates = await User.find({ _id: { $in: candidateIds }, role: "candidate", status: "verified" });
  const now = new Date();
  for (const candidate of candidates) {
    const alreadyShared = (candidate.talentShares || []).some((share) => String(share.employer) === employerId && share.skill === skill && share.companyPreference === companyPreference);
    if (!alreadyShared) candidate.talentShares.push({ employer: employer._id, sharedBy: req.user._id, skill, companyPreference, sharedAt: now });
    await candidate.save();
  }
  await createNotification({
    recipient: employer._id,
    title: "New candidate talent group shared",
    body: `Admin shared ${candidates.length} candidate profile${candidates.length === 1 ? "" : "s"} for ${skill || "your hiring needs"}.`,
    metadata: { type: "talent_group_shared", skill, companyPreference, candidateCount: candidates.length },
    sendEmail: true,
    sendPush: true,
  });
  await createActivity(req, {
    action: "talent.share",
    module: "candidates",
    entity: employer,
    status: "shared",
    reason: "",
    metadata: { employerId, candidateIds: candidates.map((candidate) => String(candidate._id)), skill, companyPreference },
  });
  return sendSuccess(res, { message: `${candidates.length} candidate profiles shared with ${employer.companyName || employer.fullName}.`, data: { sharedCount: candidates.length } });
}));

adminRouter.get("/:type", asyncHandler(async (req, res) => {
  const config = getModule(req.params.type);
  if (!config) return sendError(res, { statusCode: 404, code: "UNKNOWN_ADMIN_SECTION", message: "Unknown admin section" });

  const { page, limit, skip } = parsePagination(req.query);
  const filter = {
    ...config.filter,
    ...regexSearch(config.search, req.query.search),
  };
  if (req.query.status) filter.status = req.query.status;

  const query = config.model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
  if (config.populate) query.populate(config.populate);
  const [items, total] = await Promise.all([query, config.model.countDocuments(filter)]);

  return res.json({
    success: true,
    message: "Admin items fetched",
    data: { items: items.map(shapeItem), pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } },
    items: items.map(shapeItem),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  });
}));

adminRouter.get("/:type/:id", asyncHandler(async (req, res) => {
  const config = getModule(req.params.type);
  if (!config) return sendError(res, { statusCode: 404, code: "UNKNOWN_ADMIN_SECTION", message: "Unknown admin section" });

  const query = config.model.findById(req.params.id);
  if (config.populate) query.populate(config.populate);
  const item = await query;
  if (!item) return sendError(res, { statusCode: 404, code: "NOT_FOUND", message: "Not found" });

  const activity = await ActivityLog.find({ entityId: String(item._id) }).populate("actor").sort({ createdAt: -1 }).limit(20);
  return sendSuccess(res, { message: "Admin item fetched", data: { item: shapeItem(item), activity: activity.map(shapeItem) } });
}));

adminRouter.patch("/:type/:id/status", validate(statusSchema), asyncHandler(async (req, res) => {
  const { type, id } = req.validated.params;
  const { reason } = req.validated.body;
  const requestedStatus = req.validated.body.status;
  const config = getModule(type);
  if (!config) return sendError(res, { statusCode: 404, code: "UNKNOWN_ADMIN_SECTION", message: "Unknown admin section" });

  const status = normalizeStatus(type, requestedStatus);
  if (config.statuses.length && !config.statuses.includes(status)) {
    return sendError(res, { statusCode: 400, code: "INVALID_STATUS", message: "Invalid status" });
  }
  if ((type === "jobs" || type === "rooms") && status === "rejected" && !reason) {
    return sendError(res, { statusCode: 400, code: "REASON_REQUIRED", message: "Reject reason is compulsory" });
  }
  if (["rejected", "suspended", "unverified"].includes(status) && ["candidates", "employers", "room-owners"].includes(type) && !reason) {
    return sendError(res, { statusCode: 400, code: "REASON_REQUIRED", message: "Reason is compulsory for this status" });
  }

  const item = await config.model.findById(id);
  if (!item) return sendError(res, { statusCode: 404, code: "NOT_FOUND", message: "Not found" });

  item.status = status;
  item.adminReason = reason || "";
  await item.save();
  await notifyStatusChange(type, item, status, reason);
  await createActivity(req, {
    action: "status.update",
    module: type,
    entity: item,
    status,
    reason,
    metadata: { title: titleFor(item, type), requestedStatus },
  });

  return sendSuccess(res, { message: "Status updated", data: { item: shapeItem(item) } });
}));
