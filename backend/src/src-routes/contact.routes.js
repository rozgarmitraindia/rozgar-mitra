import { Router } from "express";
import { z } from "zod";
import { Complaint } from "../models/Complaint.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler, sendSuccess } from "../utils/apiResponse.js";

export const contactRouter = Router();

const contactSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().email().transform((value) => value.toLowerCase()),
    mobile: z.string().trim().min(7).max(20),
    subject: z.string().trim().min(3).max(150),
    message: z.string().trim().min(10).max(5000),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

contactRouter.post("/", validate(contactSchema), asyncHandler(async (req, res) => {
  const { name, email, mobile, subject, message } = req.validated.body;
  const item = await Complaint.create({
    module: "contact",
    subject,
    message,
    contactName: name,
    contactEmail: email,
    contactMobile: mobile,
    status: "open",
  });
  return sendSuccess(res, {
    statusCode: 201,
    message: "Your message has been sent to the admin team.",
    data: { referenceId: String(item._id) },
  });
}));
