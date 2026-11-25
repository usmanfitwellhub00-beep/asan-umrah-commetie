import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { handle, requireUser, ApiError } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Lead } from "@/models/Lead";
import { COMMISSION, figuresFromCommissionLeads } from "@/lib/commission";
import { getSettings } from "@/lib/settings";

export const GET = handle(async () => {
  const me = await requireUser();
  if (me.role !== "admin" && !me.rights.viewCommission) throw new ApiError(403, "The commission screen is disabled for your role");
  await connectDB();
  const oid = new mongoose.Types.ObjectId(me._id);

  const seFilter: any = me.role === "SE" ? { _id: oid } : me.role === "SM" ? { sm: oid } : {};
  const match: any = me.role === "SE" ? { se: oid } : me.role === "SM" ? { sm: oid } : {};

  const ses: any[] = await User.find({ role: "SE", ...seFilter }).select("name userId sm active").lean();
  const sms: any[] = me.role === "admin" ? await User.find({ role: "SM" }).select("name userId active").lean() : [{ _id: oid, name: me.name, userId: me.userId }];
  const smById = new Map(sms.map((s) => [String(s._id), s]));

  const stats: any[] = await Lead.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$se",
        total: { $sum: 1 },
        pending: { $sum: { $cond: [{ $eq: ["$paymentStatus", "pending"] }, 1, 0] } },
        approved: { $sum: { $cond: [{ $eq: ["$paymentStatus", "approved"] }, 1, 0] } },
        rejected: { $sum: { $cond: [{ $eq: ["$paymentStatus", "rejected"] }, 1, 0] } },
        commissioned: { $sum: { $cond: ["$commissionGenerated", 1, 0] } },
        salesValue: { $sum: { $cond: [{ $eq: ["$paymentStatus", "approved"] }, "$amount", 0] } },
      },
    },
  ]);
  const statMap = new Map(stats.map((s) => [String(s._id), s]));

  const rows = ses.map((se) => {
    const s = statMap.get(String(se._id)) ?? { total: 0, pending: 0, approved: 0, rejected: 0, commissioned: 0, salesValue: 0 };
    const f = figuresFromCommissionLeads(s.commissioned);
    const sm = smById.get(String(se.sm));
    return {
      _id: String(se._id),
      userId: se.userId,
      name: se.name,
      active: se.active,
      smId: sm?.userId ?? "",
      smName: sm?.name ?? "",
      smObjectId: String(se.sm ?? ""),
      total: s.total,
      pending: s.pending,
      approved: s.approved,
      rejected: s.rejected,
      commissioned: s.commissioned,
      salesValue: s.salesValue,
      needForNextPair: s.approved % COMMISSION.LEADS_PER_PAIR === 0 ? COMMISSION.LEADS_PER_PAIR : 1,
      ...f,
    };
  });

  const smRows = sms.map((sm) => {
    const mine = rows.filter((r) => r.smObjectId === String(sm._id));
    const sum = (k: "total" | "approved" | "pending" | "commissioned" | "pairs" | "smGross" | "seCommission" | "salesValue") =>
      mine.reduce((a, r) => a + (r[k] as number), 0);
    const smGross = sum("smGross");
    const shared = sum("seCommission");
    return {
      _id: String(sm._id),
      userId: sm.userId,
      name: sm.name,
      seCount: mine.length,
      total: sum("total"),
      pending: sum("pending"),
      approved: sum("approved"),
      pairs: sum("pairs"),
      salesValue: sum("salesValue"),
      smGross,
      sharedToSE: shared,
      smNet: smGross - shared,
    };
  });

  const totals = {
    total: rows.reduce((a, r) => a + r.total, 0),
    pending: rows.reduce((a, r) => a + r.pending, 0),
    approved: rows.reduce((a, r) => a + r.approved, 0),
    pairs: rows.reduce((a, r) => a + r.pairs, 0),
    salesValue: rows.reduce((a, r) => a + r.salesValue, 0),
    smGross: rows.reduce((a, r) => a + r.smGross, 0),
    seCommission: rows.reduce((a, r) => a + r.seCommission, 0),
    smNet: rows.reduce((a, r) => a + r.smNet, 0),
  };

  let leads: any[] = [];
  if (me.role === "SE") {
    leads = await Lead.find({ se: oid })
      .sort({ createdAt: -1 })
      .limit(300)
      .select("leadId name paymentStatus commissionGenerated amount createdAt verifiedAt")
      .lean();
  }

  const settings = await getSettings();
  return NextResponse.json({ role: me.role, rows, smRows, totals, leads, rates: COMMISSION, leadAmount: settings.leadAmount });
});
