import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import multer from "multer";
import { Readable } from "stream";
import { User } from "../models/User.js";
import { makeImmutableId, makeOtp } from "../utils/id.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt.js";
import { sendPasswordResetMail, sendVerificationMail } from "../services/mail.service.js";
import { getFirebaseAdmin } from "../services/firebase.service.js";
import { asyncHandler, sendError, sendSuccess } from "../utils/apiResponse.js";
import { getBlockedStatusResponse, sanitizeUser } from "../utils/authStatus.js";
import { validate } from "../middleware/validate.js";
import { cloudinary } from "../services/cloudinary.service.js";

export const authRouter = Router();

const registrationUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 12 },
  fileFilter(_req, file, callback) {
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (allowed.includes(file.mimetype)) return callback(null, true);
    return callback(Object.assign(new Error("Only JPG, PNG, WEBP, PDF, DOC, and DOCX files are allowed."), { statusCode: 400, code: "UNSUPPORTED_FILE_TYPE" }));
  },
});

const registrationFiles = registrationUpload.fields([
  { name: "profilePhoto", maxCount: 1 },
  { name: "resume", maxCount: 1 },
  { name: "govtId", maxCount: 1 },
  { name: "companyLogo", maxCount: 1 },
  { name: "companyDocument", maxCount: 1 },
  { name: "roomPhotos", maxCount: 8 },
  { name: "propertyDocument", maxCount: 1 },
]);

const roles = ["candidate", "employer", "roomOwner", "admin", "superAdmin"];
const statuses = ["pending", "verified", "rejected", "suspended"];

const optionalString = z.string().trim().optional().or(z.literal(""));
const emailSchema = z.string().trim().email().transform((value) => value.toLowerCase());
const passwordSchema = z.string().min(8, "Password must be at least 8 characters");

const registerSchema = z.object({
  body: z.object({
    fullName: optionalString,
    dateOfBirth: z.preprocess((value) => value === "" ? undefined : value, z.coerce.date().optional()),
    gender: z.preprocess((value) => value === "" ? undefined : value, z.enum(["male", "female", "other", "preferNotToSay"]).optional()),
    mobile: optionalString,
    email: emailSchema.optional(),
    password: passwordSchema,
    address: optionalString,
    pincode: optionalString,
    skills: z.array(z.string()).optional(),
    experience: optionalString,
    availability: optionalString,
    about: optionalString,
    companyName: optionalString,
    companyEmail: emailSchema.optional(),
    companyPhone: optionalString,
    whatsapp: optionalString,
    alternateNumber: optionalString,
    companyLocation: optionalString,
    propertyName: optionalString,
    googleMapLink: optionalString,
  }).passthrough(),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const loginSchema = z.object({
  body: z.object({
    identifier: z.string().trim().min(1),
    password: z.string().min(1),
    role: z.enum(roles),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const emailOtpSchema = z.object({
  body: z.object({
    email: emailSchema,
    otp: z.string().trim().length(6).optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const refreshSchema = z.object({
  body: z.object({ refreshToken: z.string().min(1) }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const googleSchema = z.object({
  body: z.object({
    idToken: z.string().min(1),
    role: z.enum(roles).default("candidate"),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const resetPasswordSchema = z.object({
  body: z.object({
    email: emailSchema,
    otp: z.string().trim().length(6),
    password: passwordSchema,
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const resetOtpVerifySchema = z.object({
  body: z.object({
    email: emailSchema,
    otp: z.string().trim().length(6),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function normalizeRegistrationBody(req, _res, next) {
  for (const [key, value] of Object.entries(req.body || {})) {
    if (value === "") delete req.body[key];
  }
  if (typeof req.body.skills === "string") {
    try {
      req.body.skills = JSON.parse(req.body.skills);
    } catch {
      req.body.skills = req.body.skills.split(",").map((skill) => skill.trim()).filter(Boolean);
    }
  }
  next();
}

function stripEmptyProfileFields(profile) {
  return Object.fromEntries(
    Object.entries(profile).filter(([_key, value]) => {
      if (value === "") return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return value !== undefined && value !== null;
    }),
  );
}

function uploadToCloudinary(file, folder) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timeoutMs = Number(process.env.CLOUDINARY_UPLOAD_TIMEOUT_MS || 60000);
    const isDocument = !file.mimetype?.startsWith("image/");
    const resourceType = isDocument ? "raw" : "image";
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(Object.assign(new Error("Document upload timed out. Please try again with smaller files."), { statusCode: 504, code: "CLOUDINARY_UPLOAD_TIMEOUT" }));
    }, timeoutMs);

    const stream = cloudinary.uploader.upload_stream({ folder, resource_type: resourceType, timeout: timeoutMs }, (error, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) {
        reject(Object.assign(error, { statusCode: error.statusCode || error.http_code || 502, code: error.code || "CLOUDINARY_UPLOAD_FAILED" }));
      } else {
        resolve(result);
      }
    });
    stream.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(Object.assign(error, { statusCode: 502, code: "CLOUDINARY_UPLOAD_FAILED" }));
    });
    Readable.from(file.buffer).pipe(stream);
  });
}

function documentFromUpload(result, type) {
  return { type, url: result.secure_url, publicId: result.public_id, resourceType: result.resource_type, format: result.format };
}

async function uploadRegistrationFiles(req, role, email) {
  const files = req.files || {};
  if (!Object.keys(files).length) return {};
  const safeEmail = email.replace(/[^a-z0-9]/gi, "-").toLowerCase();
  const folder = `rozgar-mitra/registration/${role}/${safeEmail}`;
  const uploadOne = async (field, type) => {
    const file = files[field]?.[0];
    if (!file) return null;
    return { ...documentFromUpload(await uploadToCloudinary(file, folder), type), originalName: file.originalname, mimeType: file.mimetype };
  };

  const [profilePhoto, resume, govtId, companyLogo, companyDocument, propertyDocument, roomPhotos] = await Promise.all([
    uploadOne("profilePhoto", "profile"),
    uploadOne("resume", "resume"),
    uploadOne("govtId", "government-id"),
    uploadOne("companyLogo", "company-logo"),
    uploadOne("companyDocument", "company-document"),
    uploadOne("propertyDocument", "property-document"),
    Promise.all((files.roomPhotos || []).map(async (file) => ({ ...documentFromUpload(await uploadToCloudinary(file, folder), "room-photo"), originalName: file.originalname, mimeType: file.mimetype }))),
  ]);

  return {
    ...(profilePhoto || companyLogo ? { profilePhoto: profilePhoto || companyLogo } : {}),
    ...(resume ? { resume } : {}),
    ...(govtId || propertyDocument ? { documents: [govtId, propertyDocument].filter(Boolean) } : {}),
    ...(companyDocument ? { companyDocs: [companyDocument] } : {}),
    ...(roomPhotos.length ? { roomPhotos } : {}),
  };
}

function refreshExpiryDate() {
  const days = Number(process.env.JWT_REFRESH_EXPIRES_DAYS || 7);
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function issueTokens(user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  user.refreshTokens = [
    ...(user.refreshTokens || []).filter((item) => item.expiresAt > new Date()).slice(-4),
    { tokenHash: hashToken(refreshToken), expiresAt: refreshExpiryDate() },
  ];
  await user.save();
  return { accessToken, refreshToken };
}

function authPayload(user, tokens) {
  const safeUser = sanitizeUser(user);
  return {
    success: true,
    message: "Login successful",
    data: { ...tokens, token: tokens.accessToken, user: safeUser },
    token: tokens.accessToken,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: safeUser,
  };
}

async function createAccount(req, res, role, prefix) {
  const body = req.validated.body;
  const email = (body.email || body.companyEmail || "").toLowerCase();
  if (!email) {
    return sendError(res, { statusCode: 400, code: "EMAIL_REQUIRED", message: "Email is required" });
  }

  const existing = await User.findOne({ email });
  if (existing) {
    if (!existing.emailVerified) {
      const otp = makeOtp();
      existing.verificationOtp = otp;
      existing.verificationOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      existing.status = "pending";
      await existing.save();
      await sendVerificationMail(existing);
      return sendSuccess(res, {
        statusCode: 200,
        message: "An account already exists for this email. A new verification OTP has been sent.",
        data: { email: existing.email, status: existing.status },
      });
    }
    return sendError(res, { statusCode: 409, code: "ACCOUNT_EXISTS", message: "Account already exists with this email" });
  }

  if (body.mobile) {
    const mobileExists = await User.exists({ role, mobile: body.mobile });
    if (mobileExists) {
      return sendError(res, { statusCode: 409, code: "MOBILE_EXISTS", message: "Account already exists with this mobile number" });
    }
  }

  const uploadedFiles = await uploadRegistrationFiles(req, role, email);
  const otp = makeOtp();
  const passwordHash = await bcrypt.hash(body.password, 12);
  const { password, ...profile } = body;
  const cleanProfile = stripEmptyProfileFields(profile);
  const user = await User.create({
    ...cleanProfile,
    email,
    role,
    immutableId: makeImmutableId(prefix),
    passwordHash,
    verificationOtp: otp,
    verificationOtpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    status: "pending",
    ...uploadedFiles,
  });

  let mailSent = true;
  try {
    await sendVerificationMail(user);
  } catch (error) {
    mailSent = false;
    console.error("Registration email failed", { email: user.email, error: error.message });
  }
  return sendSuccess(res, {
    statusCode: 201,
    message: mailSent ? "Verification mail sent" : "Account created. Verification mail could not be sent, please use resend OTP.",
    data: { immutableId: user.immutableId, email: user.email, status: user.status, mailSent },
  });
}

authRouter.post("/register/candidate", registrationFiles, normalizeRegistrationBody, validate(registerSchema), asyncHandler((req, res) => createAccount(req, res, "candidate", "candidateid")));
authRouter.post("/register/employer", registrationFiles, normalizeRegistrationBody, validate(registerSchema), asyncHandler((req, res) => createAccount(req, res, "employer", "companyid")));
authRouter.post("/register/room-owner", registrationFiles, normalizeRegistrationBody, validate(registerSchema), asyncHandler((req, res) => createAccount(req, res, "roomOwner", "ownerid")));

authRouter.post("/verify-email-otp", validate(emailOtpSchema), asyncHandler(async (req, res) => {
  const { email, otp } = req.validated.body;
  const user = await User.findOne({ email, verificationOtp: otp });
  if (!user || !user.verificationOtpExpiresAt || user.verificationOtpExpiresAt < new Date()) {
    return sendError(res, { statusCode: 400, code: "INVALID_OTP", message: "Invalid or expired OTP" });
  }

  user.emailVerified = true;
  user.verificationOtp = undefined;
  user.verificationOtpExpiresAt = undefined;
  await user.save();
  return sendSuccess(res, { message: "Email verified. Admin approval required.", data: { status: user.status } });
}));

authRouter.post("/resend-email-otp", validate(emailOtpSchema.omit({ body: true }).extend({ body: z.object({ email: emailSchema }) })), asyncHandler(async (req, res) => {
  const { email } = req.validated.body;
  const user = await User.findOne({ email });
  if (!user) return sendError(res, { statusCode: 404, code: "ACCOUNT_NOT_FOUND", message: "Account not found" });
  if (user.emailVerified) return sendError(res, { statusCode: 400, code: "EMAIL_ALREADY_VERIFIED", message: "Email already verified" });

  user.verificationOtp = makeOtp();
  user.verificationOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();
  await sendVerificationMail(user);
  return sendSuccess(res, { message: "Verification mail resent", data: { email: user.email } });
}));

authRouter.post("/login", validate(loginSchema), asyncHandler(async (req, res) => {
  const { identifier, password, role } = req.validated.body;
  const normalized = identifier.toLowerCase();
  const query = {
    $or: [
      { email: normalized },
      { mobile: identifier },
      { companyPhone: identifier },
      { phone: identifier },
    ],
  };

  const userByRole = await User.findOne({ role, ...query });
  const userAny = userByRole || await User.findOne(query);
  if (!userAny || !userAny.passwordHash) {
    return sendError(res, { statusCode: 401, code: "INVALID_CREDENTIALS", message: "Invalid credentials" });
  }

  const passwordMatches = await bcrypt.compare(password, userAny.passwordHash);
  if (!passwordMatches) {
    return sendError(res, { statusCode: 401, code: "INVALID_PASSWORD", message: "Password not match" });
  }

  if (!userByRole) {
    return sendError(res, {
      statusCode: 403,
      code: "ROLE_MISMATCH",
      message: `Your role is different. You are registered as ${userAny.role}. Please select the correct login role.`,
    });
  }

  const blocked = getBlockedStatusResponse(userByRole);
  if (blocked) return sendError(res, blocked);

  const tokens = await issueTokens(userByRole);
  return res.json(authPayload(userByRole, tokens));
}));

authRouter.post("/refresh-token", validate(refreshSchema), asyncHandler(async (req, res) => {
  const { refreshToken } = req.validated.body;
  const payload = verifyRefreshToken(refreshToken);
  if (payload.type && payload.type !== "refresh") {
    return sendError(res, { statusCode: 401, code: "INVALID_TOKEN_TYPE", message: "Invalid refresh token" });
  }

  const user = await User.findById(payload.id);
  if (!user) return sendError(res, { statusCode: 401, code: "INVALID_REFRESH_TOKEN", message: "Invalid refresh token" });

  const tokenHash = hashToken(refreshToken);
  const stored = (user.refreshTokens || []).find((item) => item.tokenHash === tokenHash && item.expiresAt > new Date());
  if (!stored) return sendError(res, { statusCode: 401, code: "INVALID_REFRESH_TOKEN", message: "Invalid refresh token" });

  const blocked = getBlockedStatusResponse(user);
  if (blocked) return sendError(res, blocked);

  user.refreshTokens = user.refreshTokens.filter((item) => item.tokenHash !== tokenHash);
  const tokens = await issueTokens(user);
  return sendSuccess(res, { message: "Token refreshed", data: { ...tokens, token: tokens.accessToken, user: sanitizeUser(user) } });
}));

authRouter.post("/logout", validate(refreshSchema), asyncHandler(async (req, res) => {
  const tokenHash = hashToken(req.validated.body.refreshToken);
  await User.updateOne({ "refreshTokens.tokenHash": tokenHash }, { $pull: { refreshTokens: { tokenHash } } });
  return sendSuccess(res, { message: "Logged out" });
}));

authRouter.post("/forgot-password", validate(z.object({
  body: z.object({ email: emailSchema }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
})), asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.validated.body.email });
  if (user) {
    user.passwordResetOtp = makeOtp();
    user.passwordResetOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    await sendPasswordResetMail(user);
  }
  return sendSuccess(res, { message: "If an account exists, password reset OTP has been sent" });
}));

authRouter.post("/reset-password", validate(resetPasswordSchema), asyncHandler(async (req, res) => {
  const { email, otp, password } = req.validated.body;
  const user = await User.findOne({ email, passwordResetOtp: otp });
  if (!user || !user.passwordResetOtpExpiresAt || user.passwordResetOtpExpiresAt < new Date()) {
    return sendError(res, { statusCode: 400, code: "INVALID_RESET_OTP", message: "Invalid or expired reset OTP" });
  }

  user.passwordHash = await bcrypt.hash(password, 12);
  user.passwordResetOtp = undefined;
  user.passwordResetOtpExpiresAt = undefined;
  user.refreshTokens = [];
  await user.save();
  return sendSuccess(res, { message: "Password reset successful" });
}));

authRouter.post("/verify-reset-otp", validate(resetOtpVerifySchema), asyncHandler(async (req, res) => {
  const { email, otp } = req.validated.body;
  const user = await User.findOne({ email, passwordResetOtp: otp });
  if (!user || !user.passwordResetOtpExpiresAt || user.passwordResetOtpExpiresAt < new Date()) {
    return sendError(res, { statusCode: 400, code: "INVALID_RESET_OTP", message: "Invalid or expired OTP" });
  }
  return sendSuccess(res, { message: "OTP valid" });
}));

authRouter.post("/google", validate(googleSchema), asyncHandler(async (req, res) => {
  const firebase = getFirebaseAdmin();
  if (!firebase) return sendError(res, { statusCode: 500, code: "FIREBASE_NOT_CONFIGURED", message: "Firebase admin not configured" });

  const decoded = await firebase.auth().verifyIdToken(req.validated.body.idToken);
  const email = decoded.email?.toLowerCase();
  if (!email) return sendError(res, { statusCode: 400, code: "GOOGLE_EMAIL_REQUIRED", message: "Google account email is required" });

  const user = await User.findOneAndUpdate(
    { email },
    {
      $setOnInsert: {
        role: req.validated.body.role,
        immutableId: makeImmutableId(req.validated.body.role === "roomOwner" ? "ownerid" : `${req.validated.body.role}id`),
        emailVerified: true,
        status: "pending",
      },
      $set: { fullName: decoded.name, email },
    },
    { new: true, upsert: true },
  );

  const blocked = getBlockedStatusResponse(user);
  if (blocked) return sendError(res, blocked);

  const tokens = await issueTokens(user);
  return res.json(authPayload(user, tokens));
}));

function buildGoogleAuthUrl(role, redirectTo = "/") {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`}/api/auth/google/callback`;
  const state = encodeURIComponent(JSON.stringify({ role, redirectTo }));
  return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent("openid email profile")}&access_type=offline&prompt=select_account&state=${state}`;
}

function firstConfiguredUrl(value, fallback) {
  return String(value || fallback).split(",")[0].trim().replace(/\/$/, "");
}

function parseGoogleState(state) {
  try {
    return JSON.parse(decodeURIComponent(state));
  } catch {
    return { role: "candidate", redirectTo: "/" };
  }
}

authRouter.get("/google", asyncHandler(async (req, res) => {
  const role = roles.includes(req.query.role) ? req.query.role : "candidate";
  const redirectTo = typeof req.query.redirectTo === "string" ? req.query.redirectTo : "/";
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return sendError(res, { statusCode: 500, code: "GOOGLE_OAUTH_NOT_CONFIGURED", message: "Google OAuth is not configured" });
  }
  return res.redirect(buildGoogleAuthUrl(role, redirectTo));
}));

authRouter.get("/google/callback", asyncHandler(async (req, res) => {
  const code = req.query.code;
  const error = req.query.error;
  if (error) {
    return sendError(res, { statusCode: 400, code: "GOOGLE_AUTH_ERROR", message: `Google auth error: ${String(error)}` });
  }
  if (!code) {
    return sendError(res, { statusCode: 400, code: "GOOGLE_AUTH_CODE_REQUIRED", message: "Google auth code is required" });
  }

  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`}/api/auth/google/callback`;
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: String(code),
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }).toString(),
  });
  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenData.id_token) {
    const reason = tokenData.error_description || tokenData.error || "Failed to exchange Google auth code";
    console.error("Google token exchange failed", { reason, redirectUri, status: tokenResponse.status });
    return sendError(res, { statusCode: 400, code: "GOOGLE_TOKEN_EXCHANGE_FAILED", message: `${reason}. Confirm this exact redirect URI is allowed in Google Console: ${redirectUri}` });
  }

  const verifyResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenData.id_token)}`);
  const verifyData = await verifyResponse.json();
  if (!verifyResponse.ok || !verifyData.email) {
    return sendError(res, { statusCode: 500, code: "GOOGLE_ID_TOKEN_INVALID", message: "Failed to verify Google ID token" });
  }

  const email = String(verifyData.email).toLowerCase();
  const stateData = req.query.state ? parseGoogleState(String(req.query.state)) : { role: "candidate", redirectTo: "/" };
  const userRole = roles.includes(stateData.role) ? stateData.role : "candidate";
  const user = await User.findOneAndUpdate(
    { email },
    {
      $setOnInsert: {
        role: userRole,
        immutableId: makeImmutableId(userRole === "roomOwner" ? "ownerid" : `${userRole}id`),
        emailVerified: true,
        status: "pending",
      },
      $set: {
        fullName: verifyData.name || email.split("@")[0],
        email,
      },
    },
    { new: true, upsert: true },
  );

  const blocked = getBlockedStatusResponse(user);
  if (blocked) return sendError(res, blocked);
  const tokens = await issueTokens(user);
  const redirectTo = stateData.redirectTo || "/";

  const safeUser = sanitizeUser(user);
  const query = new URLSearchParams({
    token: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: JSON.stringify(safeUser),
    redirectTo,
  }).toString();
  const frontendUrl = firstConfiguredUrl(process.env.FRONTEND_URL, "http://localhost:5173");
  return res.redirect(`${frontendUrl}/google-callback?${query}`);
}));

authRouter.get("/statuses", (_req, res) => sendSuccess(res, { data: { roles, statuses } }));
