export type Role = "admin" | "SM" | "SE";

export type RightDef = { key: string; label: string; desc: string; def: boolean };

export const RIGHTS_DEF: { SM: RightDef[]; SE: RightDef[] } = {
  SM: [
    { key: "addSE", label: "Add Sales Executives", desc: "SM can create new SE accounts under their own ID.", def: true },
    { key: "editSE", label: "Edit Sales Executives", desc: "SM can edit SEs after adding them (name, phone, active). Off by default.", def: false },
    { key: "viewTeamLeads", label: "View team leads", desc: "SM can see every lead entered by their SEs.", def: true },
    { key: "verifyPayments", label: "Verify payments", desc: "SM can approve / reject payment status on their team's leads.", def: true },
    { key: "viewCommission", label: "View commission screen", desc: "SM can open the Commission page for their team.", def: true },
  ],
  SE: [
    { key: "addLeads", label: "Add lead entries", desc: "SE can submit new committee entries.", def: true },
    { key: "viewCommission", label: "View commission screen", desc: "SE can open the Commission page.", def: true },
  ],
};

export type RightsMap = { SM: Record<string, boolean>; SE: Record<string, boolean> };

export function defaultRights(): RightsMap {
  const out: RightsMap = { SM: {}, SE: {} };
  for (const r of RIGHTS_DEF.SM) out.SM[r.key] = r.def;
  for (const r of RIGHTS_DEF.SE) out.SE[r.key] = r.def;
  return out;
}

export function mergeRights(saved?: Partial<RightsMap> | null): RightsMap {
  const base = defaultRights();
  for (const role of ["SM", "SE"] as const) {
    for (const k of Object.keys(base[role])) {
      const v = saved?.[role]?.[k];
      if (typeof v === "boolean") base[role][k] = v;
    }
  }
  return base;
}

export function can(user: { role: Role; rights: Record<string, boolean> }, key: string) {
  return user.role === "admin" || !!user.rights[key];
}
