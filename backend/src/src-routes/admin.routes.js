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
    label: "Employer",
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
    statuses: ["submitted", "shortlisted", "interview", "hired", "rejected"],
    populate: "candidate employer job",
  },
  bookings: {
    model: Booking,
    label: "Booking",
    filter: {},
    search: ["status", "message", "visitDate", "visitTime"],
    statuses: bookingStatuses,
    populate: "room user owner",
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
    title: z.string().trim().min(1),
    body: z.string().trim().min(1),
    channel: z.enum(["email", "push", "inApp", "system"]).default("inApp"),
  }),
  params: z.object({}).optional(),
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
    return;
  }

  if (type === "jobs") {
    const employer = await User.findById(item.employer);
    if (employer?.email || employer?.companyEmail) {
      await sendMail({
        to: employer.companyEmail || employer.email,
        subject: `Rozgar Mitra Job ${item.status}`,
        html: `<h2>Job ${item.status}</h2><p>${item.title || "Your job"} status changed to ${item.status}.</p><p>${reason || ""}</p>`,
      });
    }
  }

  if (type === "rooms") {
    const owner = await User.findById(item.owner);
    if (owner?.email) {
      await sendMail({
        to: owner.email,
        subject: `Rozgar Mitra Room ${item.status}`,
        html: `<h2>Room ${item.status}</h2><p>${item.title || "Your room"} status changed to ${item.status}.</p><p>${reason || ""}</p>`,
      });
    }
  }
}

function normalizeStatus(type, status) {
  if (type === "jobs" || type === "rooms") {
    if (status === "verified" || status === "approved" || status === "approve") return "live";
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
  const notification = await Notification.create(req.validated.body);
  if (req.validated.body.channel === "email" && req.validated.body.recipient) {
    const user = await User.findById(req.validated.body.recipient);
    if (user?.email) {
      await sendMail({ to: user.email, subject: req.validated.body.title, html: `<p>${req.validated.body.body}</p>` });
      notification.status = "sent";
      await notification.save();
    }
  }
  await createActivity(req, { action: "notification.create", module: "notifications", entity: notification, status: notification.status });
  return sendSuccess(res, { statusCode: 201, message: "Notification created", data: { item: notification } });
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
