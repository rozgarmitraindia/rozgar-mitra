import { apiFetch, API_BASE } from "./auth";

export async function getCloudinarySignature({ folder, publicId } = {}) {
  return apiFetch("/upload/sign", {
    method: "POST",
    body: JSON.stringify({ folder, publicId }),
  }).then((res) => res.data);
}

export async function uploadFileSigned(file, { folder, publicId } = {}) {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) throw new Error("Cloudinary cloud name not configured");

  const sig = await getCloudinarySignature({ folder, publicId });
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sig.api_key);
  form.append("timestamp", String(sig.timestamp));
  form.append("signature", sig.signature);
  if (sig.folder) form.append("folder", sig.folder);
  if (sig.public_id) form.append("public_id", sig.public_id);

  const response = await fetch(url, {
    method: "POST",
    body: form,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cloudinary upload failed: ${text}`);
  }
  return response.json();
}

export async function confirmUploadToBackend(result, type) {
  return apiFetch("/upload/cloudinary/complete", {
    method: "POST",
    body: JSON.stringify({ result, type }),
  }).then((res) => res.data);
}

export default { getCloudinarySignature, uploadFileSigned, confirmUploadToBackend };
