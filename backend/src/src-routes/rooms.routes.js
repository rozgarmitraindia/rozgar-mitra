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

roomsRouter.get("/", optionalAuth, async (req, res) => {
  const search = req.query.search ? new RegExp(req.query.search, "i") : null;
  const filter = { status: "live" };
  if (search) filter.$or = [{ title: search }, { address: search }, { propertyName: search }];
  const items = await Room.find(filter).sort({ createdAt: -1 });

  const userSavedIds = req.user ? (req.user.savedRooms || []).map(String) : [];

  const enriched = await Promise.all(items.map(async (it) => {
    const itemObj = it.toObject();
    itemObj.isSaved = userSavedIds.includes(String(it._id));
    itemObj.savedCount = await User.countDocuments({ savedRooms: it._id });
    return itemObj;
  }));

  res.json({ success: true, message: "Rooms fetched", data: { items: enriched }, items: enriched });
});

roomsRouter.get("/:id", optionalAuth, async (req, res) => {
  const item = await Room.findOne({ _id: req.params.id, status: "live" });
  if (!item) return sendError(res, { statusCode: 404, code: "ROOM_NOT_FOUND", message: "Room not found or pending admin review" });
  const obj = item.toObject();
  obj.isSaved = req.user ? (req.user.savedRooms || []).map(String).includes(String(item._id)) : false;
  obj.savedCount = await User.countDocuments({ savedRooms: item._id });
  return sendSuccess(res, { message: "Room fetched", data: obj });
});

roomsRouter.post("/:id/visit-requests", requireAuth, requireRole("candidate"), async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room || room.status !== "live") return sendError(res, { statusCode: 404, code: "ROOM_NOT_LIVE", message: "Room not live" });

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
      },
    ], { session });

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
        await sendVisitRequestMail(owner, room, booking[0]);
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
