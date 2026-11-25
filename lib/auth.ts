import crypto from "node:crypto";
import { cookies } from "next/headers";
import { connectDB } from "./mongodb";
import { User } from "@/models/User";
import { getSettings } from "./settings";
import type { Role } from "./rights";

export const COOKIE_NAME = "um_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET is missing in .env.local");
  return s;
}

export function signToken(uid: string) {
  const body = Buffer.from(JSON.stringify({ uid, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE })).toString("base64url");
  const sig = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyToken(token: string): string | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString());
    if (typeof p.exp !== "number" || p.exp < Date.now() / 1000) return null;
    return String(p.uid);
  } catch {
    return null;
  }
}

function scrypt(pw: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) =>
    crypto.scrypt(pw, salt, 64, (err, key) => (err ? reject(err) : resolve(key)))
  );
}

export async function hashPassword(pw: string) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(pw, salt);
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

export async function verifyPassword(pw: string, stored: string) {
  const [saltHex, keyHex] = stored.split(":");
  if (!saltHex || !keyHex) return false;
  const key = await scrypt(pw, Buffer.from(saltHex, "hex"));
  const expected = Buffer.from(keyHex, "hex");
  return key.length === expected.length && crypto.timingSafeEqual(key, expected);
}

export type SessionUser = {
  _id: string;
  userId: string;
  role: Role;
  name: string;
  email: string;
  phone: string;
  smCode: string;
  seCode: string;
  sm: string | null;
  rights: Record<string, boolean>;
  leadAmount: number;
  reportsTo: { userId: string; name: string; role: Role } | null;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const uid = verifyToken(token);
  if (!uid) return null;
  await connectDB();
  const u: any = await User.findById(uid).lean();
  if (!u || !u.active) return null;
  const settings = await getSettings();
  let reportsTo: SessionUser["reportsTo"] = null;
  if (u.role === "SE" && u.sm) {
    const p: any = await User.findById(u.sm).select("userId name role").lean();
    if (p) reportsTo = { userId: p.userId, name: p.name, role: p.role };
  } else if (u.role === "SM") {
    const a: any = await User.findOne({ role: "admin" }).select("userId name role").lean();
    if (a) reportsTo = { userId: a.userId, name: a.name, role: a.role };
  }
  return {
    _id: String(u._id),
    userId: u.userId,
    role: u.role,
    name: u.name,
    email: u.email,
    phone: u.phone ?? "",
    smCode: u.smCode ?? "",
    seCode: u.seCode ?? "",
    sm: u.sm ? String(u.sm) : null,
    rights: u.role === "admin" ? {} : settings.rights[u.role as "SM" | "SE"],
    leadAmount: settings.leadAmount,
    reportsTo,
  };
}

/** Creates the first admin from ADMIN_EMAIL / ADMIN_PASSWORD (.env.local) if no admin exists yet. */
let adminChecked = false;
export async function ensureAdmin() {
  if (adminChecked) return;
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;
  await connectDB();
  const exists = await User.exists({ role: "admin" });
  if (exists) {
    adminChecked = true;
    return;
  }
  await User.create({
    userId: "ADMIN",
    role: "admin",
    name: "Administrator",
    email,
    passwordHash: await hashPassword(password),
    active: true,
  });
  adminChecked = true;
}
