import { NextResponse } from "next/server";
import { handle, readJson, requireUser, ApiError } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Lead } from "@/models/Lead";
import { nextSeq, pad } from "@/models/Counter";
import { hashPassword } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { isEmail } from "@/lib/validators";
import { parseProfile } from "@/lib/profile";
import { cleanReferral, referralError } from "@/lib/validate-shared";

export const GET = handle(async () => {
  const me = await requireUser(["admin", "SM"]);
  await connectDB();
  const filter: any = me.role === "admin" ? { role: { $in: ["SM", "SE"] } } : { role: "SE", sm: me._id };
  const users: any[] = await User.find(filter).select("-passwordHash").sort({ createdAt: 1 }).lean();

  const stats: any[] = await Lead.aggregate([
    {
      $group: {
        _id: "$se",
        total: { $sum: 1 },
        approved: { $sum: { $cond: [{ $eq: ["$paymentStatus", "approved"] }, 1, 0] } },
      },
    },
  ]);
  const statMap = new Map(stats.map((s) => [String(s._id), s]));
  const nameById = new Map<string, any>(users.map((u) => [String(u._id), u]));
  if (me.role === "SM") nameById.set(me._id, { name: me.name, userId: me.userId });

  const seCount = new Map<string, number>();
  for (const u of users) if (u.role === "SE" && u.sm) seCount.set(String(u.sm), (seCount.get(String(u.sm)) ?? 0) + 1);

  const out = users.map((u) => {
    const s = statMap.get(String(u._id));
    const parent = u.sm ? nameById.get(String(u.sm)) : null;
    return {
      ...u,
      smName: parent?.name ?? "",
      smUserId: parent?.userId ?? "",
      seCount: seCount.get(String(u._id)) ?? 0,
      leadCount: s?.total ?? 0,
      approvedCount: s?.approved ?? 0,
    };
  });

  const settings = await getSettings();
  const smCount = await User.countDocuments({ role: "SM" });
  return NextResponse.json({ users: out, maxSM: settings.maxSM, smCount });
});

export const POST = handle(async (req) => {
  const me = await requireUser(["admin", "SM"]);
  const body = await readJson(req);
  const settings = await getSettings();
  await connectDB();

  const role = me.role === "SM" ? "SE" : body.role;
  if (role !== "SM" && role !== "SE") throw new ApiError(400, "Choose a role (SM or SE)");
  if (me.role === "SM" && !settings.rights.SM.addSE) throw new ApiError(403, "Adding SEs is disabled for Sales Managers");

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!name) throw new ApiError(400, "Name is required");
  if (!isEmail(email)) throw new ApiError(400, "Enter a valid email address");
  if (password.length < 8) throw new ApiError(400, "Password must be at least 8 characters");
  const profile = parseProfile(body, role === "SM");
  if (await User.exists({ email })) throw new ApiError(409, "A user with this email already exists");

  let doc: any;
  if (role === "SM") {
    const count = await User.countDocuments({ role: "SM" });
    if (count >= settings.maxSM) throw new ApiError(400, `Maximum of ${settings.maxSM} Sales Managers reached`);
    const smCode = pad(await nextSeq("sm"), 4);
    doc = await User.create({
      userId: `SM-${smCode}`,
      role: "SM",
      name,
      email,
      ...profile,
      smCode,
      passwordHash: await hashPassword(password),
      createdBy: me._id,
    });
  } else {
    const smId = me.role === "SM" ? me._id : String(body.smId ?? "");
    const sm: any = smId ? await User.findOne({ _id: smId, role: "SM" }).lean() : null;
    if (!sm) throw new ApiError(400, "Select the Sales Manager this SE will be under");
    if (!sm.active) throw new ApiError(400, "This Sales Manager is deactivated");
    const referral = cleanReferral(String(body.referralCode ?? ""));
    if (!referral) throw new ApiError(400, "Referral code is required");
    const refErr = referralError(referral);
    if (refErr) throw new ApiError(400, refErr);
    if (await User.exists({ userId: referral })) throw new ApiError(409, "This referral code is already used");
    doc = await User.create({
      userId: referral,
      role: "SE",
      name,
      email,
      ...profile,
      smCode: sm.smCode,
      sm: sm._id,
      passwordHash: await hashPassword(password),
      createdBy: me._id,
    });
  }
  const out = doc.toObject();
  delete out.passwordHash;
  return NextResponse.json({ user: out }, { status: 201 });
});
