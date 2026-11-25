import { NextResponse } from "next/server";
import { handle, readJson, requireUser, ApiError } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Lead } from "@/models/Lead";
import { Counter } from "@/models/Counter";
import { deleteImage } from "@/lib/cloudinary";

/** Admin only: wipes all SMs, SEs and leads (+ their Cloudinary images) and restarts the ID counters. Keeps the admin account and settings/rights. */
export const POST = handle(async (req) => {
  await requireUser(["admin"]);
  const body = await readJson(req);
  if (body.confirm !== "DELETE ALL") throw new ApiError(400, 'Type "DELETE ALL" to confirm');
  await connectDB();

  const leads: any[] = await Lead.find().select("pictureUrl picturePublicId paymentScreenshotPublicId").lean();
  const users: any[] = await User.find({ role: { $ne: "admin" } }).select("picturePublicId").lean();
  const ids = [
    ...leads.flatMap((l) => [l.picturePublicId, l.paymentScreenshotPublicId]),
    ...users.map((u) => u.picturePublicId),
  ].filter(Boolean) as string[];

  for (let i = 0; i < ids.length; i += 10) await Promise.allSettled(ids.slice(i, i + 10).map((id) => deleteImage(id)));

  const l = await Lead.deleteMany({});
  const u = await User.deleteMany({ role: { $ne: "admin" } });
  await Counter.deleteMany({});

  return NextResponse.json({ ok: true, leads: l.deletedCount, users: u.deletedCount, images: ids.length });
});
