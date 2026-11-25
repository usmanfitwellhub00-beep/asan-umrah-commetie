import { NextResponse } from "next/server";
import { handle, readJson, ApiError } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { COOKIE_NAME, SESSION_MAX_AGE, signToken, verifyPassword, ensureAdmin } from "@/lib/auth";

export const POST = handle(async (req) => {
  const body = await readJson(req);
  const identifier = String(body.identifier ?? "").trim();
  const password = String(body.password ?? "");
  if (!identifier || !password) throw new ApiError(400, "Enter your email / ID / number and password");

  await connectDB();
  await ensureAdmin();

  const digits = identifier.replace(/[\s-]/g, "");
  const or: any[] = [{ email: identifier.toLowerCase() }, { userId: identifier.toUpperCase() }];
  if (/^\+?\d{10,13}$/.test(digits)) {
    const last10 = digits.replace(/\D/g, "").slice(-10);
    or.push({ phone: { $regex: `^\\+?(92|0)?${last10}$` } });
  }
  const candidates: any[] = await User.find({ $or: or });
  let user: any = null;
  for (const c of candidates) {
    if (await verifyPassword(password, c.passwordHash)) {
      user = c;
      break;
    }
  }
  if (!user) throw new ApiError(401, "Invalid email / ID / number or password");
  if (!user.active) throw new ApiError(403, "This account is deactivated. Please contact the admin.");

  const res = NextResponse.json({ ok: true, role: user.role });
  res.cookies.set(COOKIE_NAME, signToken(String(user._id)), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
});
