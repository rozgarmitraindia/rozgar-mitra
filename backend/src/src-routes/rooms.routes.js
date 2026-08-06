import { Router } from "express";
import mongoose from "mongoose";
import { Room } from "../models/Room.js";
import { Booking } from "../models/Booking.js";
import { requireAuth, requireRole, optionalAuth } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { sendVisitRequestMail } from "../services/mail.service.js";
import { createNotification } from "../services/notification.service.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";

export const roomsRouter = Router();

function toRoomPhoto(photo, index, title = "Room") {
  if (!photo) return null;
  if (typeof photo === "string") {
    return { id: `photo-${index + 1}`, url: photo, caption: `${title} photo ${index + 1}`, isCover: index === 0 };
  }
  if (!photo.url) return null;
  return {
    id: photo.id || photo.publicId || `photo-${index + 1}`,
    url: photo.url,
    caption: photo.caption || `${title} photo ${index + 1}`,
    isCover: Boolean(photo.isCover || index === 0),
  };
}

function normalizeRoom(item, savedIds = []) {
  const obj = typeof item.toObject === "function" ? item.toObject() : { ...item };
  const title = obj.title || obj.propertyName || "Verified room";
  const owner = obj.owner && typeof obj.owner === "object" ? obj.owner : null;
  const ownerName = obj.ownerName || owner?.fullName || owner?.propertyName || obj.propertyName || "Room Owner";
  const photos = (obj.photos || []).map((photo, index) => toRoomPhoto(photo, index, title)).filter(Boolean);
  return {
    ...obj,
    id: String(obj._id),
    publicId: obj.publicId || obj.roomId,
    title,
    city: obj.city || "",
    locality: obj.locality || obj.area || "",
    mapLink: obj.mapLink || obj.googleMapLink,
    type: obj.type || obj.roomType || "Single Room",
    roomType: obj.roomType || obj.type,
    furnishing: obj.furnishing || "Semi-furnished",
    gender: obj.gender || "Any",
    owner: ownerName,
    ownerName,
    ownerVerified: obj.ownerVerified ?? owner?.status === "verified",
    ownerPublicId: obj.ownerPublicId || obj.immutableOwnerId || owner?.immutableId,
    ownerPhone: obj.ownerPhone || obj.contactNumber || owner?.mobile || owner?.companyPhone,
    ownerWhatsapp: obj.ownerWhatsapp || owner?.whatsapp,
    preferredContactTime: obj.preferredContactTime || "10am - 7pm",
    photos,
    amenities: obj.amenities || [],
    rules: obj.rules || [],
    nearby: obj.nearby || [],
    totalRooms: Number(obj.totalRooms || 1),
    bedsPerRoom: Number(obj.bedsPerRoom || obj.maxOccupancy || 1),
    maxOccupancy: Number(obj.maxOccupancy || 1),
    occupiedOccupancy: Number(obj.occupiedOccupancy || 0),
    availableOccupancy: Math.max(0, Number(obj.availableOccupancy ?? ((Number(obj.maxOccupancy || 1)) - Number(obj.occupiedOccupancy || 0)))),
    occupancyStatus: obj.occupancyStatus || (Number(obj.availableOccupancy || 0) <= 0 ? "full" : "available"),
    isSaved: savedIds.includes(String(obj._id)),
  };
}

roomsRouter.get("/", optionalAuth, async (req, res) => {
  const search = req.query.search ? new RegExp(req.query.search, "i") : null;
  const filter = { status: "live" };
  if (search) filter.$or = [{ title: search }, { address: search }, { propertyName: search }, { city: search }, { locality: search }, { ownerName: search }];
  const items = await Room.find(filter).populate("owner", "fullName propertyName immutableId status mobile companyPhone whatsapp").sort({ createdAt: -1 });

  const userSavedIds = req.user ? (req.user.savedRooms || []).map(String) : [];

  const availableItems = items.filter((it) => Math.max(0, Number(it.availableOccupancy ?? (Number(it.maxOccupancy || 1) - Number(it.occupiedOccupancy || 0)))) > 0);
  const enriched = await Promise.all(availableItems.map(async (it) => {
    const itemObj = normalizeRoom(it, userSavedIds);
    itemObj.savedCount = await User.countDocuments({ savedRooms: it._id });
    return itemObj;
  }));

  res.json({ success: true, message: "Rooms fetched", data: { items: enriched }, items: enriched });
});

roomsRouter.get("/:id", optionalAuth, async (req, res) => {
  const item = await Room.findOne({ _id: req.params.id, status: "live" }).populate("owner", "fullName propertyName immutableId status mobile companyPhone whatsapp createdAt");
  if (!item) return sendError(res, { statusCode: 404, code: "ROOM_NOT_FOUND", message: "Room not found or pending admin review" });
  if (Math.max(0, Number(item.availableOccupancy ?? (Number(item.maxOccupancy || 1) - Number(item.occupiedOccupancy || 0)))) <= 0) {
    item.status = "closed";
    item.occupancyStatus = "full";
    await item.save();
    return sendError(res, { statusCode: 404, code: "ROOM_FULL", message: "This room is fully booked" });
  }
  item.views = Number(item.views || 0) + 1;
  await item.save();
  const obj = normalizeRoom(item, req.user ? (req.user.savedRooms || []).map(String) : []);
  obj.savedCount = await User.countDocuments({ savedRooms: item._id });
  obj.similarRooms = (await Room.find({ _id: { $ne: item._id }, status: "live", city: item.city }).limit(3).sort({ createdAt: -1 })).map((room) => normalizeRoom(room));
  return sendSuccess(res, { message: "Room fetched", data: obj });
});

roomsRouter.post("/:id/visit-requests", requireAuth, requireRole("candidate"), async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room || room.status !== "live") return sendError(res, { statusCode: 404, code: "ROOM_NOT_LIVE", message: "Room not live" });
  const availableOccupancy = Math.max(0, Number(room.availableOccupancy ?? (Number(room.maxOccupancy || 1) - Number(room.occupiedOccupancy || 0))));
  if (availableOccupancy <= 0) {
    room.status = "closed";
    room.occupancyStatus = "full";
    await room.save();
    return sendError(res, { statusCode: 400, code: "ROOM_FULL", message: "This room is fully booked" });
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const booking = await Booking.create([
      {
        room: room._id,
        user: req.user._id,
        owner: room.owner,
        visitDate: req.body.visitDate,
        visitTime: req.body.visitTime,
        message: req.body.message,
        status: "pending",
        visitStatus: "pending",
        bookingStatus: "notBooked",
      },
    ], { session });
    room.requests = Number(room.requests || 0) + 1;
    await room.save({ session });

    const notification = await createNotification({
      recipient: room.owner,
      title: "New room visit request",
      body: `A candidate requested a visit for ${room.title || room.propertyName}.`,
      channel: "inApp",
      metadata: { type: "visit_request", roomId: room._id, bookingId: booking[0]._id },
      realtime: true,
    });

    await session.commitTransaction();
    session.endSession();

    if (room.owner) {
      const owner = await User.findById(room.owner).select("email");
      if (owner?.email) {
        await sendVisitRequestMail(owner, room, booking[0], req.user);
      }
    }

    return sendSuccess(res, {
      statusCode: 201,
      message: "Visit request submitted",
      data: { booking: booking[0], notification },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});

roomsRouter.post("/:id/wishlist", requireAuth, requireRole("candidate"), async (req, res) => {
  const roomId = req.params.id;
  const user = req.user;
  const exists = (user.savedRooms || []).some(id => String(id) === String(roomId));
  if (exists) {
    user.savedRooms = (user.savedRooms || []).filter(id => String(id) !== String(roomId));
    await user.save();
    const count = await User.countDocuments({ savedRooms: roomId });
    return sendSuccess(res, { message: "Removed from saved rooms", data: { isSaved: false, savedCount: count } });
  }
  user.savedRooms = user.savedRooms || [];
  user.savedRooms.push(roomId);
  await user.save();
  const count = await User.countDocuments({ savedRooms: roomId });
  return sendSuccess(res, { statusCode: 201, message: "Room saved to wishlist", data: { isSaved: true, savedCount: count } });
});
