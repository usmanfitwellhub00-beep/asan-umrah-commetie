import { connectDB } from "./mongodb";
import { Settings } from "@/models/Settings";
import { mergeRights } from "./rights";

export async function getSettings() {
  await connectDB();
  const doc: any = await Settings.findById("main").lean();
  return {
    maxSM: (doc?.maxSM as number) ?? 5,
    leadAmount: (doc?.leadAmount as number) ?? 5000,
    rights: mergeRights(doc?.rights),
  };
}
