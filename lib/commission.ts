import { Lead } from "@/models/Lead";

/**
 * Commission rules (figures, not real money):
 *  - every 2 APPROVED leads of one SE = 1 "pair"  (2 x 5000 = 10000 sales)
 *  - each pair adds SM_POINTS_PER_PAIR (1000) to that SE's SM
 *  - from that, SE_POINTS_PER_LEAD (250) per lead (= 500 per pair) is added to the SE
 */
export const COMMISSION = {
  LEADS_PER_PAIR: 2,
  SM_POINTS_PER_PAIR: 1000,
  SE_POINTS_PER_LEAD: 250,
};

export function figuresFromCommissionLeads(commissionLeads: number) {
  const pairs = Math.floor(commissionLeads / COMMISSION.LEADS_PER_PAIR);
  const seCommission = commissionLeads * COMMISSION.SE_POINTS_PER_LEAD;
  const smGross = pairs * COMMISSION.SM_POINTS_PER_PAIR;
  return { pairs, seCommission, smGross, smNet: smGross - seCommission };
}

/** Auto-calculation: re-mark which approved leads of an SE have generated commission. */
export async function recomputeCommission(seId: unknown) {
  if (!seId) return;
  const approved = await Lead.find({ se: seId, paymentStatus: "approved" })
    .sort({ verifiedAt: 1, _id: 1 })
    .select("_id")
    .lean();
  const pairs = Math.floor(approved.length / COMMISSION.LEADS_PER_PAIR);
  const flagged = approved.slice(0, pairs * COMMISSION.LEADS_PER_PAIR).map((l: any) => l._id);
  await Lead.updateMany({ se: seId, _id: { $in: flagged } }, { $set: { commissionGenerated: true } });
  await Lead.updateMany({ se: seId, _id: { $nin: flagged } }, { $set: { commissionGenerated: false } });
}
