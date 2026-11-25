import { NextResponse } from "next/server";
import { handle, readJson, requireUser, ApiError } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Lead } from "@/models/Lead";
import { hashPassword } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { isEmail } from "@/lib/validators";
import { parseProfile } from "@/lib/profile";

export const PATCH = handle(async (req, ctx) => {
  const me = await requireUser(["admin", "SM"]);
  const { id } = await ctx.params;
  const body = await readJson(req);
  await connectDB();
  const target: any = await User.findById(id);
  if (!target) throw new ApiError(404, "User not found");

  if (me.role === "SM") {
    const settings = await getSettings();
    if (!settings.rights.SM.editSE) throw new ApiError(403, "Sales Managers cannot edit SEs");
    if (target.role !== "SE" || String(target.sm) !== me._id) throw new ApiError(403, "You can only edit your own SEs");
  }

  if (body.name !== undefined) {
    const n = String(body.name).trim();
    if (!n) throw new ApiError(400, "Name is required");
    target.name = n;
  }
  Object.assign(target, parseProfile(body, target.role === "SM", true));
  if (body.active !== undefined) {
    if (target.role === "admin" && body.active === false) throw new ApiError(400, "The admin account cannot be deactivated");
    target.active = !!body.active;
  }
  if (me.role === "admin") {
    if (body.email !== undefined) {
      const e = String(body.email).trim().toLowerCase();
      if (!isEmail(e)) throw new ApiError(400, "Enter a valid email address");
      target.email = e;
    }
    if (body.password) {
      if (String(body.password).length < 8) throw new ApiError(400, "Password must be at least 8 characters");
      target.passwordHash = await hashPassword(String(body.password));
    }
  }
  await target.save();
  const out = target.toObject();
  delete out.passwordHash;
  return NextResponse.json({ user: out });
});

export const DELETE = handle(async (_req, ctx) => {
  await requireUser(["admin"]);
  const { id } = await ctx.params;
  await connectDB();
  const target: any = await User.findById(id);
  if (!target) throw new ApiError(404, "User not found");
  if (target.role === "admin") throw new ApiError(400, "The admin account cannot be deleted");
  if (target.role === "SM" && (await User.exists({ role: "SE", sm: target._id }))) {
    throw new ApiError(400, "This SM still has SEs under them. Delete those SEs first, or deactivate the SM instead.");
  }
  if (target.role === "SE" && (await Lead.exists({ se: target._id }))) {
    throw new ApiError(400, "This SE has lead entries. Deactivate the SE instead of deleting.");
  }
  await target.deleteOne();
  return NextResponse.json({ ok: true });
});
