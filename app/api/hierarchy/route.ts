import { NextResponse } from "next/server";
import { handle, requireUser } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Lead } from "@/models/Lead";
import { getSettings } from "@/lib/settings";

export const GET = handle(async () => {
  const me = await requireUser(["admin", "SM"]);
  await connectDB();
  const isAdmin = me.role === "admin";
  const settings = await getSettings();
  const showLeads = isAdmin || !!settings.rights.SM.viewTeamLeads;

  const pick = "userId role name gender pictureUrl active sm";
  const admin: any = isAdmin ? await User.findOne({ role: "admin" }).select(pick).lean() : null;
  const sms: any[] = await User.find(isAdmin ? { role: "SM" } : { _id: me._id }).select(pick).sort({ createdAt: 1 }).lean();
  const ses: any[] = await User.find(isAdmin ? { role: "SE" } : { role: "SE", sm: me._id }).select(pick).sort({ createdAt: 1 }).lean();
  const leads: any[] = showLeads
    ? await Lead.find(isAdmin ? {} : { sm: me._id }).select("leadId name paymentStatus amount createdAt se").sort({ createdAt: -1 }).lean()
    : [];

  const bySe = new Map<string, any[]>();
  for (const l of leads) {
    const k = String(l.se);
    const arr = bySe.get(k) ?? [];
    arr.push({ _id: String(l._id), leadId: l.leadId, name: l.name, paymentStatus: l.paymentStatus, amount: l.amount, createdAt: l.createdAt });
    bySe.set(k, arr);
  }

  const node = (u: any) => ({ _id: String(u._id), userId: u.userId, name: u.name, gender: u.gender ?? "", pictureUrl: u.pictureUrl ?? "", active: u.active });
  const seNode = (e: any) => ({ ...node(e), leads: bySe.get(String(e._id)) ?? [] });

  return NextResponse.json({
    role: me.role,
    showLeads,
    admin: admin ? node(admin) : null,
    sms: sms.map((m) => ({ ...node(m), ses: ses.filter((e) => String(e.sm) === String(m._id)).map(seNode) })),
    orphans: isAdmin ? ses.filter((e) => !e.sm || !sms.some((m) => String(m._id) === String(e.sm))).map(seNode) : [],
  });
});
