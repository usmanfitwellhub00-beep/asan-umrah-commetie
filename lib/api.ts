import { NextResponse } from "next/server";
import { getSessionUser, type SessionUser } from "./auth";
import type { Role } from "./rights";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type Ctx = { params: Promise<any> };

export function handle(fn: (req: Request, ctx: Ctx) => Promise<Response>) {
  return async (req: Request, ctx: Ctx): Promise<Response> => {
    try {
      return await fn(req, ctx);
    } catch (e: any) {
      if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e?.name === "ValidationError") return NextResponse.json({ error: e.message }, { status: 400 });
      if (e?.code === 11000) {
        const key = Object.keys(e.keyPattern ?? {})[0] ?? "value";
        return NextResponse.json({ error: `A record with this ${key} already exists` }, { status: 409 });
      }
      console.error(e);
      return NextResponse.json({ error: "Something went wrong on the server" }, { status: 500 });
    }
  };
}

export async function requireUser(roles?: Role[]): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) throw new ApiError(401, "Please sign in");
  if (roles && !roles.includes(u.role)) throw new ApiError(403, "You do not have access to this");
  return u;
}

export async function readJson(req: Request): Promise<Record<string, any>> {
  try {
    const b = await req.json();
    return b && typeof b === "object" ? b : {};
  } catch {
    throw new ApiError(400, "Invalid request body");
  }
}
