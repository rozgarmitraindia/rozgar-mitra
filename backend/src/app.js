import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import { authRouter } from "./src-routes/auth.routes.js";
import { adminRouter } from "./src-routes/admin.routes.js";
import { jobsRouter } from "./src-routes/jobs.routes.js";
import { roomsRouter } from "./src-routes/rooms.routes.js";
import { employerRouter } from "./src-routes/employer.routes.js";
import { uploadRouter } from "./src-routes/upload.routes.js";
import { notificationsRouter } from "./src-routes/notifications.routes.js";
import { bootstrapAdmin } from "./utils/bootstrapAdmin.js";
import { usersRouter } from "./src-routes/users.routes.js";
import { contactRouter } from "./src-routes/contact.routes.js";
import { skillsRouter } from "./src-routes/skills.routes.js";
import { sendError } from "./utils/apiResponse.js";
import mongoose from "mongoose";
import crypto from "node:crypto";
import { isProduction } from "./utils/env.js";

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");

// Allow multiple comma-separated frontend origins. Normalize by removing trailing slashes.
const defaultOrigins = "https://rozgarmitra-india.netlify.app,http://localhost:5173,http://localhost:5174";
const allowedOrigins = `${defaultOrigins},${process.env.FRONTEND_URL || ""},${process.env.CORS_ORIGINS || ""}`
  .split(",")
  .map((item) => item.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      // For non-browser requests (cURL, server-to-server), allow when origin is undefined/null
      if (!origin) return callback(null, true);
      const normalized = origin.replace(/\/$/, "");
      if (allowedOrigins.includes(normalized)) return callback(null, true);

      console.warn('Blocked CORS origin:', origin);
      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
  })
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: Number(process.env.RATE_LIMIT_MAX || 1500),
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: (req) => req.path === "/health" || req.path.startsWith("/api/auth/google"),
    handler: (_req, res) => sendError(res, {
      statusCode: 429,
      code: "RATE_LIMITED",
      message: "Server busy hai. Please kuch seconds baad retry karein.",
    }),
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));
app.use(mongoSanitize());

app.use((req, res, next) => {
  req.id = String(req.headers["x-request-id"] || crypto.randomUUID());
  res.setHeader("X-Request-Id", req.id);
  res.setHeader("Cache-Control", "no-store");
  next();
});

app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on("finish", () => {
    if (req.path === "/health") return;
    const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "log";
    console[level](JSON.stringify({ requestId: req.id, method: req.method, path: req.originalUrl, status: res.statusCode, durationMs: Date.now() - startedAt }));
  });
  next();
});

app.get("/health", (_req, res) => res.json({ ok: true, service: "rozgar-mitra-backend", uptimeSeconds: Math.floor(process.uptime()) }));
app.get("/api/health", (_req, res) => res.json({ ok: true, service: "rozgar-mitra-backend", uptimeSeconds: Math.floor(process.uptime()) }));
app.get("/ready", (_req, res) => {
  const ready = mongoose.connection.readyState === 1;
  return res.status(ready ? 200 : 503).json({ ok: ready, database: ready ? "connected" : "unavailable" });
});
app.use("/api/auth", rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.AUTH_RATE_LIMIT_MAX || 60),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req, res) => sendError(res, { statusCode: 429, code: "AUTH_RATE_LIMITED", message: "Too many authentication attempts. Please try again later." }),
}), authRouter);
app.use("/api/skills", skillsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/rooms", roomsRouter);
app.use("/api/employer", employerRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/user", usersRouter);
app.use("/api/contact", rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: Number(process.env.CONTACT_RATE_LIMIT_MAX || 10),
  standardHeaders: "draft-7",
  legacyHeaders: false,
}), contactRouter);

app.use((req, res) => sendError(res, { statusCode: 404, code: "NOT_FOUND", message: "Route not found" }));
app.use((err, req, res, _next) => {
  console.error(JSON.stringify({ requestId: req.id, error: err.message, stack: isProduction() ? undefined : err.stack }));
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || "field";
    return sendError(res, {
      statusCode: 409,
      code: "DUPLICATE_FIELD",
      message: `Account already exists with this ${field}.`,
    });
  }
  if (err.name === "MulterError") {
    return sendError(res, {
      statusCode: 400,
      code: err.code || "UPLOAD_ERROR",
      message: err.code === "LIMIT_FILE_SIZE" ? "Each file must be 10MB or smaller." : err.message,
    });
  }
  return sendError(res, {
    statusCode: err.statusCode || 500,
    code: err.code || "SERVER_ERROR",
    message: err.statusCode || !isProduction() ? (err.message || "Something went wrong") : "Internal server error",
    details: isProduction() ? null : { requestId: req.id },
  });
});

export default app;
