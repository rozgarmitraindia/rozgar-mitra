import { Router } from "express";
import multer from "multer";
import { Readable } from "stream";
import { authenticate, authorize, checkStatus } from "../middleware/auth.js";
import { cloudinary } from "../services/cloudinary.service.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";

export const uploadRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(_req, file, callback) {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowed.includes(file.mimetype)) return callback(new Error("Unsupported file type"));
    callback(null, true);
  },
});

const auth = [authenticate, checkStatus];

function folderFor(type, user) {
  return `rozgar-mitra/${type}/${user.role}/${user.immutableId}`;
}

async function uploadToCloudinary(file, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder, resource_type: "auto" }, (error, uploaded) => {
      if (error) reject(error);
      else resolve(uploaded);
    });
    Readable.from(file.buffer).pipe(stream);
  });
}

function toDocument(result, type) {
  return {
    type,
    url: result.secure_url,
    publicId: result.public_id,
  };
}

async function uploadSingle(req, res, type, applyToUser) {
  if (!req.file) return sendError(res, { statusCode: 400, code: "FILE_REQUIRED", message: "File required" });
  const result = await uploadToCloudinary(req.file, folderFor(type, req.user));
  const document = toDocument(result, type);
  await applyToUser(document);
  return sendSuccess(res, { statusCode: 201, message: "File uploaded", data: { document, cloudinary: result } });
}

uploadRouter.post("/cloudinary", auth, upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return sendError(res, { statusCode: 400, code: "FILE_REQUIRED", message: "File required" });
    const folder = req.body.folder || folderFor("general", req.user);
    const result = await uploadToCloudinary(req.file, folder);
    return sendSuccess(res, { statusCode: 201, message: "File uploaded", data: result });
  } catch (err) {
    next(err);
  }
});

// Signed upload signature endpoint — returns signature + timestamp + api_key
uploadRouter.post("/cloudinary/sign", auth, async (req, res, next) => {
  try {
    const { folder, publicId } = req.body || {};
    const timestamp = Math.floor(Date.now() / 1000);
    const paramsToSign = { timestamp };
    if (folder) paramsToSign.folder = folder;
    if (publicId) paramsToSign.public_id = publicId;
    const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET);
    return sendSuccess(res, {
      statusCode: 200,
      message: "Signature generated",
      data: {
        signature,
        timestamp,
        api_key: process.env.CLOUDINARY_API_KEY,
        folder: folder || undefined,
        public_id: publicId || undefined,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Client will POST cloudinary upload result here to persist metadata to user record
uploadRouter.post("/cloudinary/complete", auth, async (req, res, next) => {
  try {
    const { result, type } = req.body || {};
    if (!result || !result.secure_url || !result.public_id) return sendError(res, { statusCode: 400, code: "INVALID_PAYLOAD", message: "Invalid cloudinary result" });
    const document = { type: type || "general", url: result.secure_url, publicId: result.public_id };
    // apply to user by type
    if (type === "profile") req.user.profilePhoto = document;
    else if (type === "resume") req.user.resume = document;
    else if (type === "company-doc") req.user.companyDocs.push(document);
    else if (type === "room-photo") req.user.roomPhotos.push(document);
    else req.user.documents.push(document);
    await req.user.save();
    return sendSuccess(res, { statusCode: 200, message: "File metadata saved", data: document });
  } catch (err) {
    next(err);
  }
});

uploadRouter.post("/profile", auth, upload.single("file"), async (req, res, next) => {
  try {
    return uploadSingle(req, res, "profile", async (document) => {
      req.user.profilePhoto = document;
      await req.user.save();
    });
  } catch (err) {
    next(err);
  }
});

uploadRouter.post("/resume", auth, authorize("candidate"), upload.single("file"), async (req, res, next) => {
  try {
    return uploadSingle(req, res, "resume", async (document) => {
      req.user.resume = document;
      await req.user.save();
    });
  } catch (err) {
    next(err);
  }
});

uploadRouter.post("/documents", auth, upload.single("file"), async (req, res, next) => {
  try {
    return uploadSingle(req, res, req.body.type || "document", async (document) => {
      req.user.documents.push(document);
      await req.user.save();
    });
  } catch (err) {
    next(err);
  }
});

uploadRouter.post("/company-docs", auth, authorize("employer"), upload.single("file"), async (req, res, next) => {
  try {
    return uploadSingle(req, res, "company-doc", async (document) => {
      req.user.companyDocs.push(document);
      await req.user.save();
    });
  } catch (err) {
    next(err);
  }
});

uploadRouter.post("/room-photos", auth, authorize("roomOwner"), upload.array("files", 8), async (req, res, next) => {
  try {
    if (!req.files?.length) return sendError(res, { statusCode: 400, code: "FILES_REQUIRED", message: "At least one file required" });
    const uploaded = await Promise.all(req.files.map((file) => uploadToCloudinary(file, folderFor("room-photo", req.user))));
    const documents = uploaded.map((result) => toDocument(result, "room-photo"));
    req.user.roomPhotos.push(...documents);
    await req.user.save();
    return sendSuccess(res, { statusCode: 201, message: "Room photos uploaded", data: { documents, cloudinary: uploaded } });
  } catch (err) {
    next(err);
  }
});
