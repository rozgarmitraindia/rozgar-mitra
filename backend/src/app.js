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
import { sendError } from "./utils/apiResponse.js";

const app = express();

// Allow multiple comma-separated frontend origins. Normalize by removing trailing slashes.
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((item) => item.trim().replace(/\/$/, ""));

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      // For non-browser requests (cURL, server-to-server), allow when origin is undefined/null
      if (!origin) return callback(null, true);
      const normalized = origin.replace(/\/$/, "");
      if (allowedOrigins.includes(normalized)) return callback(null, true);

      // Allow common local dev hostnames (localhost, 127.0.0.1, ::1) regardless of port
      try {
        const parsed = new URL(normalized);
        const host = parsed.hostname;
        if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]") {
          return callback(null, true);
        }
      } catch (e) {
        // if URL parsing fails, fall through to deny
      }

      console.warn('Blocked CORS origin:', origin);
      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
  })
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: Number(process.env.RATE_LIMIT_MAX || 300),
    standardHeaders: "draft-7",
    legacyHeaders: false,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(mongoSanitize());

app.get("/health", (_req, res) => res.json({ ok: true, service: "rozgar-mitra-backend" }));
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/rooms", roomsRouter);
app.use("/api/employer", employerRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/user", usersRouter);

app.use((req, res) => sendError(res, { statusCode: 404, code: "NOT_FOUND", message: "Route not found" }));
app.use((err, _req, res, _next) => {
  console.error(err);
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
    message: err.message || "Something went wrong",
  });
});

export default app;
