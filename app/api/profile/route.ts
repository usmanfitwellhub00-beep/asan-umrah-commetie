import { NextResponse } from "next/server";
import { handle, readJson, requireUser, ApiError } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { deleteImage } from "@/lib/cloudinary";

export const GET = handle(async () => {
  const me = await requireUser();
  await connectDB();
  const u: any = await User.findById(me._id).select("-passwordHash").lean();
  if (!u) throw new ApiError(404, "Profile not found");
  return NextResponse.json({
    profile: {
      userId: u.userId, role: u.role, name: u.name, email: u.email, phone: u.phone ?? "",
      fatherName: u.fatherName ?? "", gender: u.gender ?? "", cnic: u.cnic ?? "",
      whatsapp: u.whatsapp ?? "", address: u.address ?? "", pictureUrl: u.pictureUrl ?? "",
      smCode: u.smCode ?? "", seCode: u.seCode ?? "", createdAt: u.createdAt,
    },
  });
});

// Only a Sales Executive may change their own picture; nothing else is editable here.
export const PATCH = handle(async (req) => {
  const me = await requireUser(["SE"]);
  const body = await readJson(req);
  const url = String(body.pictureUrl ?? "");
  const publicId = String(body.picturePublicId ?? "");
  if (!url || !/^https:\/\//.test(url)) throw new ApiError(400, "A valid picture is required");
  await connectDB();
  const u: any = await User.findById(me._id);
  if (!u) throw new ApiError(404, "Profile not found");
  const old = u.picturePublicId;
  u.pictureUrl = url;
  u.picturePublicId = publicId;
  await u.save();
  if (old && old !== publicId) await deleteImage(old);
  return NextResponse.json({ ok: true, pictureUrl: url });
});
