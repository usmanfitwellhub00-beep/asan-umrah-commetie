import { NextResponse } from "next/server";
import { handle, readJson, requireUser, ApiError } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { hashPassword, verifyPassword } from "@/lib/auth";

export const POST = handle(async (req) => {
  const me = await requireUser();
  const body = await readJson(req);
  const current = String(body.current ?? "");
  const next = String(body.next ?? "");
  if (next.length < 8) throw new ApiError(400, "New password must be at least 8 characters");
  await connectDB();
  const user: any = await User.findById(me._id);
  if (!user || !(await verifyPassword(current, user.passwordHash))) throw new ApiError(400, "Current password is incorrect");
  user.passwordHash = await hashPassword(next);
  await user.save();
  return NextResponse.json({ ok: true });
});
