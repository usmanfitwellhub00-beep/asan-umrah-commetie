import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { handle, readJson, requireUser, ApiError } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { Lead } from "@/models/Lead";
import { User } from "@/models/User";
import { nextSeq, pad } from "@/models/Counter";
import { getSettings } from "@/lib/settings";
import { parseLeadInput } from "@/lib/validators";

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const GET = handle(async (req) => {
  const me = await requireUser();
  if (me.role === "SM" && !me.rights.viewTeamLeads) throw new ApiError(403, "Viewing team leads is disabled for Sales Managers");
  await connectDB();

  const scope: any = me.role === "SE" ? { se: me._id } : me.role === "SM" ? { sm: me._id } : {};
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "";
  const q = (url.searchParams.get("q") ?? "").trim();
  const seId = (url.searchParams.get("se") ?? "").trim();

  const filter: any = { ...scope };
  if (["pending", "approved", "rejected"].includes(status)) filter.paymentStatus = status;
  if (seId && me.role !== "SE") filter.seId = seId;
  if (q) {
    const r = new RegExp(esc(q), "i");
    filter.$or = [{ name: r }, { cnic: r }, { phone: r }, { leadId: r }, { seId: r }, { smId: r }, { email: r }];
  }

  const leads = await Lead.find(filter)
    .sort({ createdAt: -1 })
    .limit(1000)
    .populate("se", "name userId")
    .populate("sm", "name userId")
    .lean();

  const match: any = { ...scope };
  if (match.se) match.se = new mongoose.Types.ObjectId(match.se);
  if (match.sm) match.sm = new mongoose.Types.ObjectId(match.sm);
  const agg: any[] = await Lead.aggregate([{ $match: match }, { $group: { _id: "$paymentStatus", n: { $sum: 1 } } }]);
  const counts = { all: 0, pending: 0, approved: 0, rejected: 0 } as Record<string, number>;
  for (const a of agg) {
    counts[a._id] = a.n;
    counts.all += a.n;
  }
  return NextResponse.json({ leads, counts });
});

export const POST = handle(async (req) => {
  const me = await requireUser(["SE"]);
  if (!me.rights.addLeads) throw new ApiError(403, "Adding entries is disabled for your role");
  const body = await readJson(req);
  const data = parseLeadInput(body, false);
  const settings = await getSettings();
  await connectDB();

  const seDoc: any = await User.findById(me._id).lean();
  const smDoc: any = seDoc?.sm ? await User.findById(seDoc.sm).lean() : null;
  if (!smDoc) throw new ApiError(400, "Your account is not linked to a Sales Manager. Contact the admin.");

  const leadId = `LD-${pad(await nextSeq("lead"), 6)}`;
  const lead = await Lead.create({
    ...data,
    leadId,
    amount: settings.leadAmount,
    paymentStatus: "pending",
    se: me._id,
    sm: smDoc._id,
    seId: me.userId,
    smId: smDoc.userId,
  });
  return NextResponse.json({ lead }, { status: 201 });
});
