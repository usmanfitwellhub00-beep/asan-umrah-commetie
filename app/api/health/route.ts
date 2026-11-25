import { NextResponse, connection } from "next/server";
import { connectDB } from "@/lib/mongodb";

export async function GET() {
  await connection();
  try {
    const conn = await connectDB();
    return NextResponse.json({ ok: true, db: conn.connection.name });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Connection failed" },
      { status: 500 }
    );
  }
}
