import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { handle, requireUser } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { Lead } from "@/models/Lead";
import { User } from "@/models/User";
import { figuresFromCommissionLeads } from "@/lib/commission";

export const GET = handle(async () => {
  const me = await requireUser();
  await connectDB();
  const oid = new mongoose.Types.ObjectId(me._id);
  const scope: any = me.role === "SE" ? { se: oid } : me.role === "SM" ? { sm: oid } : {};

  const [g]: any[] = await Lead.aggregate([
    { $match: scope },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        pending: { $sum: { $cond: [{ $eq: ["$paymentStatus", "pending"] }, 1, 0] } },
        approved: { $sum: { $cond: [{ $eq: ["$paymentStatus", "approved"] }, 1, 0] } },
        rejected: { $sum: { $cond: [{ $eq: ["$paymentStatus", "rejected"] }, 1, 0] } },
        commissioned: { $sum: { $cond: ["$commissionGenerated", 1, 0] } },
        salesValue: { $sum: { $cond: [{ $eq: ["$paymentStatus", "approved"] }, "$amount", 0] } },
      },
    },
  ]);
  const counts = g ?? { total: 0, pending: 0, approved: 0, rejected: 0, commissioned: 0, salesValue: 0 };

  const recent = await Lead.find(scope)
    .sort({ createdAt: -1 })
    .limit(6)
    .select("leadId name paymentStatus amount createdAt seId smId")
    .lean();

  let users: { sm: number; se: number } | null = null;
  if (me.role === "admin") {
    users = { sm: await User.countDocuments({ role: "SM" }), se: await User.countDocuments({ role: "SE" }) };
  } else if (me.role === "SM") {
    users = { sm: 0, se: await User.countDocuments({ role: "SE", sm: oid }) };
  }

  return NextResponse.json({
    role: me.role,
    counts: { total: counts.total, pending: counts.pending, approved: counts.approved, rejected: counts.rejected },
    salesValue: counts.salesValue,
    commissioned: counts.commissioned,
    figures: figuresFromCommissionLeads(counts.commissioned),
    users,
    recent,
  });
});
