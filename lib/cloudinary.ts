import crypto from "node:crypto";
import { ApiError } from "./api";

function cfg() {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret) {
    throw new ApiError(500, "Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to .env.local");
  }
  return { cloud, key, secret };
}

const sign = (params: string, secret: string) => crypto.createHash("sha1").update(params + secret).digest("hex");

export async function uploadImage(file: File, folder: string) {
  const { cloud, key, secret } = cfg();
  const timestamp = Math.floor(Date.now() / 1000);
  const fd = new FormData();
  fd.append("file", file);
  fd.append("api_key", key);
  fd.append("timestamp", String(timestamp));
  fd.append("folder", folder);
  fd.append("signature", sign(`folder=${folder}&timestamp=${timestamp}`, secret));
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: "POST", body: fd });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(502, `Cloudinary upload failed: ${json?.error?.message ?? res.status}`);
  return { url: json.secure_url as string, publicId: json.public_id as string };
}

/** Best-effort cleanup; never throws. */
export async function deleteImage(publicId?: string) {
  if (!publicId) return;
  try {
    const { cloud, key, secret } = cfg();
    const timestamp = Math.floor(Date.now() / 1000);
    const fd = new FormData();
    fd.append("public_id", publicId);
    fd.append("api_key", key);
    fd.append("timestamp", String(timestamp));
    fd.append("signature", sign(`public_id=${publicId}&timestamp=${timestamp}`, secret));
    await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/destroy`, { method: "POST", body: fd });
  } catch {
    /* ignore */
  }
}
