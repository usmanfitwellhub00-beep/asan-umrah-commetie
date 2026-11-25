import { NextResponse } from "next/server";
import { handle, requireUser, ApiError } from "@/lib/api";
import { uploadImage } from "@/lib/cloudinary";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

export const POST = handle(async (req) => {
  await requireUser(["SE", "SM", "admin"]);
  const fd = await req.formData();
  const file = fd.get("file");
  const kind = String(fd.get("kind") ?? "screenshot");
  if (!(file instanceof File)) throw new ApiError(400, "No file received");
  if (!TYPES.includes(file.type)) throw new ApiError(400, "Only JPG, PNG or WebP images are allowed");
  if (file.size > MAX_BYTES) throw new ApiError(400, "Image must be 5 MB or smaller");
  const folder = kind === "picture" ? "umrah-committee/pictures" : "umrah-committee/screenshots";
  const { url, publicId } = await uploadImage(file, folder);
  return NextResponse.json({ url, publicId });
});
