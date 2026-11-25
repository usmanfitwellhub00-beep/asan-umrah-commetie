import { NextResponse } from "next/server";
import { handle, readJson, requireUser, ApiError } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { Lead } from "@/models/Lead";
import { parseLeadInput } from "@/lib/validators";
import { recomputeCommission } from "@/lib/commission";
import { deleteImage } from "@/lib/cloudinary";

async function loadScoped(id: string, me: { _id: string; role: string }) {
  await connectDB();
  const lead: any = await Lead.findById(id);
  if (!lead) throw new ApiError(404, "Lead not found");
  if (me.role === "SE" && String(lead.se) !== me._id) throw new ApiError(403, "Not your lead");
  if (me.role === "SM" && String(lead.sm) !== me._id) throw new ApiError(403, "This lead is not under your team");
  return lead;
}

export const GET = handle(async (_req, ctx) => {
  const me = await requireUser();
  const { id } = await ctx.params;
  await loadScoped(id, me);
  const lead = await Lead.findById(id).populate("se", "name userId").populate("sm", "name userId").lean();
  return NextResponse.json({ lead });
});

export const PATCH = handle(async (req, ctx) => {
  const me = await requireUser(["admin", "SM"]);
  const { id } = await ctx.params;
  const body = await readJson(req);
  const lead = await loadScoped(id, me);

  const updates: Record<string, any> = {};
  const oldImages: string[] = [];

  if (me.role === "admin") {
    Object.assign(updates, parseLeadInput(body, true));
    if (body.amount !== undefined) {
      const a = Number(body.amount);
      if (!Number.isFinite(a) || a <= 0) throw new ApiError(400, "Amount must be a positive number");
      updates.amount = a;
    }
    if (updates.paymentScreenshotPublicId && updates.paymentScreenshotUrl !== lead.paymentScreenshotUrl) {
      oldImages.push(lead.paymentScreenshotPublicId);
    }
    if (body.pictureUrl !== undefined && updates.pictureUrl !== lead.pictureUrl) oldImages.push(lead.picturePublicId);
  } else {
    if (!me.rights.verifyPayments) throw new ApiError(403, "Payment verification is disabled for Sales Managers");
    if (Object.keys(body).some((k) => k !== "paymentStatus")) throw new ApiError(403, "Sales Managers can only update the payment status");
  }

  if (body.paymentStatus !== undefined) {
    const s = String(body.paymentStatus);
    if (!["pending", "approved", "rejected"].includes(s)) throw new ApiError(400, "Invalid payment status");
    if (s !== lead.paymentStatus) {
      updates.paymentStatus = s;
      updates.verifiedBy = s === "pending" ? null : me._id;
      updates.verifiedAt = s === "pending" ? null : new Date();
    }
  }

  lead.set(updates);
  await lead.save();
  for (const pid of oldImages) await deleteImage(pid);
  await recomputeCommission(lead.se); // auto-calculate commission after any change

  const fresh = await Lead.findById(id).populate("se", "name userId").populate("sm", "name userId").lean();
  return NextResponse.json({ lead: fresh });
});

export const DELETE = handle(async (_req, ctx) => {
  const me = await requireUser(["admin"]);
  const { id } = await ctx.params;
  const lead = await loadScoped(id, me);
  await deleteImage(lead.paymentScreenshotPublicId);
  await deleteImage(lead.picturePublicId);
  await lead.deleteOne();
  await recomputeCommission(lead.se);
  return NextResponse.json({ ok: true });
});
