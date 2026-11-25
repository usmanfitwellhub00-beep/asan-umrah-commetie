"use client";

import { useEffect, useState } from "react";
import { Empty, Loading, PageInfo, RoleGate, Stat, StatusBadge, useToast } from "@/components/ui";
import { LeadViewLoader } from "@/components/LeadView";
import { useUser } from "@/components/UserContext";
import { useLive } from "@/lib/live";
import { api, dateFmt, money } from "@/lib/client";

export default function CommissionPage() {
  return (
    <RoleGate roles={["admin", "SM", "SE"]} right="viewCommission">
      <Commission />
    </RoleGate>
  );
}

function Kv({ k, v, strong }: { k: string; v: React.ReactNode; strong?: boolean }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>{k}</div>
      <div className={`tnum ${strong ? "font-bold" : "font-semibold"}`}>{v}</div>
    </div>
  );
}

function Commission() {
  const user = useUser();
  const toast = useToast();
  const [d, setD] = useState<any>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    api("/api/commission").then(setD).catch((e) => toast.err(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useLive(() => { api("/api/commission").then(setD).catch(() => {}); });

  const role = user.role;
  const r = d?.rates;
  const me = role === "SE" ? d?.rows?.[0] : null;

  return (
    <div>
      <PageInfo
        title={role === "admin" ? "Commission Management" : "Commission"}
        subtitle="Calculated automatically whenever a payment is approved, rejected or changed. Figures are counts, not payouts."
        structure={[
          "Rules card — how the cycle works (2 approved leads = 1 pair → SM points → SE share).",
          role === "SE" ? "Your cards — approved entries, pairs completed, your commission and what is still pending." : role === "SM" ? "Team cards — pairs completed by your SEs, commission generated for you, the part shared to SEs and your net." : "Overall cards — system-wide pairs, SM commission generated, SE share and SM net.",
          role === "SE" ? "Progress bar — how close you are to the next commission pair." : role === "admin" ? "Per Sales Manager, and per Sales Executive with the SM they are under." : "Each of your SEs with their entries, pairs and commission.",
          role === "SE" ? "Entries list — each lead with payment status and the “Commission generated” marker." : "Nothing to edit here — it updates itself from lead payment statuses.",
        ]}
      />

      <div className="glass p-3.5 mb-3 text-[13px]" style={{ color: "var(--muted)" }}>
        <div className="font-semibold mb-1" style={{ color: "var(--text)" }}>How commission is generated</div>
        Every <b style={{ color: "var(--text)" }}>2 approved leads</b> of one SE form a pair
        {d && <> (2 × Rs {money(d.leadAmount)} = Rs {money(d.leadAmount * 2)})</>} and get <span className="badge badge-info">Commission generated</span>.
        Each pair adds <b style={{ color: "var(--text)" }}>{r ? money(r.SM_POINTS_PER_PAIR) : "1,000"}</b> to that SE’s Sales Manager, and from it
        <b style={{ color: "var(--text)" }}> {r ? r.SE_POINTS_PER_LEAD : 250} per lead</b> ({r ? r.SE_POINTS_PER_LEAD * 2 : 500} per pair) is added to the SE’s commission.
      </div>

      {!d ? (
        <Loading rows={3} />
      ) : (
        <>
          {role === "SE" && me && (
            <>
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                <Stat label="Approved entries" value={me.approved} icon="check" tone="ok" />
                <Stat label="Pairs completed" value={me.pairs} icon="percent" hint="2 approved = 1 pair" />
                <Stat label="My commission" value={money(me.seCommission)} icon="percent" tone="ok" hint={`${me.commissioned} lead(s) × ${r.SE_POINTS_PER_LEAD}`} />
                <Stat label="Awaiting approval" value={me.pending} icon="clock" tone="warn" />
              </div>
              <div className="glass p-3.5 mt-3">
                <div className="flex justify-between text-sm font-semibold mb-2">
                  <span>Progress to next pair</span>
                  <span className="tnum">{me.approved % 2} / 2 approved</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--primary-soft)" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${((me.approved % 2) / 2) * 100}%`, background: "var(--primary)" }} />
                </div>
                <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
                  {me.needForNextPair} more approved {me.needForNextPair === 1 ? "entry completes" : "entries complete"} the next pair (+{r.SE_POINTS_PER_LEAD * 2} for you, +{money(r.SM_POINTS_PER_PAIR)} for your SM).
                </p>
              </div>

              <div className="glass mt-3 overflow-hidden">
                <div className="px-3.5 py-3 font-semibold">My entries & commission status</div>
                {d.leads.length === 0 ? <Empty title="No entries yet" /> : (
                  <ul>
                    {d.leads.map((l: any) => (
                      <li key={l._id} className="flex items-center gap-3 px-3.5 py-2.5 cursor-pointer" style={{ borderTop: "1px solid var(--border)" }} onClick={() => setOpenId(l._id)}>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold truncate">{l.name}</div>
                          <div className="text-[11px] font-mono" style={{ color: "var(--muted)" }}>{l.leadId} · {dateFmt(l.createdAt)} · Rs {money(l.amount)}</div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <StatusBadge status={l.paymentStatus} />
                          {l.commissionGenerated ? <span className="badge badge-info">Commission generated</span>
                            : l.paymentStatus === "approved" ? <span className="badge badge-warn">Waiting for pair</span> : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          {role !== "SE" && (
            <>
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                <Stat label="Approved entries" value={d.totals.approved} icon="check" tone="ok" hint={`${d.totals.pending} pending`} />
                <Stat label="Pairs completed" value={d.totals.pairs} icon="percent" hint={`Sales Rs ${money(d.totals.salesValue)}`} />
                <Stat label={role === "admin" ? "SM commission generated" : "My commission generated"} value={money(d.totals.smGross)} icon="percent" tone="ok" hint={`${d.totals.pairs} × ${money(r.SM_POINTS_PER_PAIR)}`} />
                <Stat label="Shared to SEs" value={money(d.totals.seCommission)} icon="users" hint={`SM net: ${money(d.totals.smNet)}`} />
              </div>

              {role === "admin" && (
                <div className="glass mt-3 overflow-hidden">
                  <div className="px-3.5 py-3 font-semibold">Sales Managers</div>
                  {d.smRows.length === 0 ? <Empty title="No Sales Managers yet" /> : (
                    <>
                      <div className="hidden md:block">
                        <table className="tbl">
                          <thead><tr><th>SM</th><th>SEs</th><th>Entries</th><th>Approved</th><th>Pairs</th><th>Generated</th><th>Shared to SEs</th><th>SM net</th></tr></thead>
                          <tbody>
                            {d.smRows.map((s: any) => (
                              <tr key={s._id}>
                                <td><b className="font-mono text-xs">{s.userId}</b> <span className="font-semibold">{s.name}</span></td>
                                <td className="tnum">{s.seCount}</td><td className="tnum">{s.total}</td><td className="tnum">{s.approved}</td><td className="tnum">{s.pairs}</td>
                                <td className="font-semibold tnum">{money(s.smGross)}</td><td className="tnum">{money(s.sharedToSE)}</td><td className="font-semibold tnum" style={{ color: "var(--ok)" }}>{money(s.smNet)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="md:hidden">
                        {d.smRows.map((s: any) => (
                          <div key={s._id} className="px-3.5 py-3 space-y-2" style={{ borderTop: "1px solid var(--border)" }}>
                            <div><b className="font-mono text-xs">{s.userId}</b> <span className="font-semibold">{s.name}</span></div>
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <Kv k="SEs" v={s.seCount} /><Kv k="Approved" v={s.approved} /><Kv k="Pairs" v={s.pairs} />
                              <Kv k="Generated" v={money(s.smGross)} /><Kv k="To SEs" v={money(s.sharedToSE)} /><Kv k="SM net" v={<span style={{ color: "var(--ok)" }}>{money(s.smNet)}</span>} strong />
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="glass mt-3 overflow-hidden">
                <div className="px-3.5 py-3 font-semibold">Sales Executives</div>
                {d.rows.length === 0 ? <Empty title="No Sales Executives yet" /> : (
                  <>
                    <div className="hidden md:block">
                      <table className="tbl">
                        <thead><tr><th>SE</th>{role === "admin" && <th>Under SM</th>}<th>Entries</th><th>Pending</th><th>Approved</th><th>Pairs</th><th>SM points</th><th>SE commission</th></tr></thead>
                        <tbody>
                          {d.rows.map((s: any) => (
                            <tr key={s._id}>
                              <td><b className="font-mono text-xs">{s.userId}</b> <span className="font-semibold">{s.name}</span></td>
                              {role === "admin" && <td className="text-xs"><b>{s.smId}</b> {s.smName}</td>}
                              <td className="tnum">{s.total}</td><td className="tnum">{s.pending}</td><td className="tnum">{s.approved}</td><td className="tnum">{s.pairs}</td>
                              <td className="tnum">{money(s.smGross)}</td><td className="font-semibold tnum" style={{ color: "var(--ok)" }}>{money(s.seCommission)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="md:hidden">
                      {d.rows.map((s: any) => (
                        <div key={s._id} className="px-3.5 py-3 space-y-2" style={{ borderTop: "1px solid var(--border)" }}>
                          <div><b className="font-mono text-xs">{s.userId}</b> <span className="font-semibold">{s.name}</span></div>
                          {role === "admin" && <div className="text-xs" style={{ color: "var(--muted)" }}>Under <b style={{ color: "var(--text)" }}>{s.smId}</b> {s.smName}</div>}
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <Kv k="Entries" v={s.total} /><Kv k="Approved" v={s.approved} /><Kv k="Pairs" v={s.pairs} />
                            <Kv k="SM points" v={money(s.smGross)} /><Kv k="SE commission" v={<span style={{ color: "var(--ok)" }}>{money(s.seCommission)}</span>} strong />
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </>
      )}
      <LeadViewLoader id={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}
