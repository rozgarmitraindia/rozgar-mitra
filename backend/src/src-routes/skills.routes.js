import { Router } from "express";
import { Skill } from "../models/Skill.js";
import { asyncHandler } from "../utils/apiResponse.js";

export const skillsRouter = Router();

skillsRouter.get("/", asyncHandler(async (_req, res) => {
  const items = await Skill.find({ isApproved: true }).sort({ displayName: 1 }).lean();
  const skills = items.map((item) => item.displayName || item.name);
  return res.json({
    success: true,
    message: "Approved skills fetched",
    data: {
      items,
      skills,
    },
  });
}));
