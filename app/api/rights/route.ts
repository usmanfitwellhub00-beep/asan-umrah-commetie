import { NextResponse } from "next/server";
import { handle, readJson, requireUser, ApiError } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { Settings } from "@/models/Settings";
import { getSettings } from "@/lib/settings";
import { RIGHTS_DEF, mergeRights } from "@/lib/rights";

export const GET = handle(async () => {
  await requireUser(["admin"]);
  return NextResponse.json({ settings: await getSettings(), defs: RIGHTS_DEF });
});

export const PUT = handle(async (req) => {
  await requireUser(["admin"]);
  const body = await readJson(req);
  const maxSM = Number(body.maxSM);
  const leadAmount = Number(body.leadAmount);
  if (!Number.isInteger(maxSM) || maxSM < 1 || maxSM > 100) throw new ApiError(400, "Max Sales Managers must be between 1 and 100");
  if (!Number.isFinite(leadAmount) || leadAmount <= 0) throw new ApiError(400, "Entry amount must be a positive number");
  const rights = mergeRights(body.rights);
  await connectDB();
  await Settings.findByIdAndUpdate("main", { $set: { maxSM, leadAmount, rights } }, { upsert: true, new: true });
  return NextResponse.json({ settings: await getSettings() });
});
