"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { Empty, Loading, PageInfo, Stat, StatusBadge, useToast } from "@/components/ui";
import { LeadViewLoader } from "@/components/LeadView";
import { useUser } from "@/components/UserContext";
import { useLive } from "@/lib/live";
import { api, dateFmt, money } from "@/lib/client";
import { can } from "@/lib/rights";

export default function DashboardPage() {
  const user = useUser();
  const toast = useToast();
  const [d, setD] = useState<any>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    api("/api/dashboard").then(setD).catch((e) => toast.err(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useLive(() => { api("/api/dashboard").then(setD).catch(() => {}); });

  const roleName = user.role === "admin" ? "Admin" : user.role === "SM" ? "Sales Manager" : "Sales Executive";

  return (
    <div>
      <PageInfo
        title={`Welcome back, ${user.name.split(" ")[0]}`}
        subtitle={`${roleName} dashboard — a live summary of entries, payments and commission.`}
        structure={[
          "Top stat cards — totals for " + (user.role === "admin" ? "the whole system (SMs, SEs, leads)." : user.role === "SM" ? "your team (SEs and their leads)." : "your own entries."),
          "Payment & commission cards — approved sales and the commission figures generated automatically from approved payments.",
          "Recent entries — the latest leads with their payment status.",
          "Use the sidebar to move to Leads, " + (user.role === "admin" ? "Persons, Commission and Rights management." : user.role === "SM" ? "your Team and Commission." : "Add Entry and Commission."),
        ]}
      />

      {!d ? (
        <Loading rows={3} />
      ) : (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {user.role === "admin" && <Stat label="Sales Managers" value={d.users?.sm ?? 0} icon="users" hint="Max 5 allowed by default" />}
            {user.role === "admin" && <Stat label="Sales Executives" value={d.users?.se ?? 0} icon="users" />}
            {user.role === "SM" && <Stat label="My Sales Executives" value={d.users?.se ?? 0} icon="users" />}
            <Stat label={user.role === "SE" ? "My entries" : "Total leads"} value={d.counts.total} icon="leads" />
            <Stat label="Pending verification" value={d.counts.pending} icon="clock" tone="warn" />
            <Stat label="Approved payments" value={d.counts.approved} icon="check" tone="ok" />
            <Stat label="Rejected" value={d.counts.rejected} icon="x" tone="bad" />
            <Stat label="Approved sales value" value={`Rs ${money(d.salesValue)}`} icon="percent" />
            {user.role === "SE" ? (
              <Stat label="My commission" value={money(d.figures.seCommission)} icon="percent" tone="ok" hint={`${d.figures.pairs} pair(s) completed`} />
            ) : (
              <>
                <Stat label="SM commission generated" value={money(d.figures.smGross)} icon="percent" tone="ok" hint={`${d.figures.pairs} pair(s) × 1,000`} />
                <Stat label="Shared to SEs" value={money(d.figures.seCommission)} icon="percent" hint={`SM net: ${money(d.figures.smNet)}`} />
              </>
            )}
          </div>

          <div className="grid lg:grid-cols-3 gap-3 mt-4">
            <div className="glass lg:col-span-2 overflow-hidden">
              <div className="flex items-center justify-between px-3.5 py-3">
                <h2 className="font-semibold">Recent entries</h2>
                {(user.role !== "SM" || can(user, "viewTeamLeads")) && <Link href="/leads" className="text-xs font-semibold" style={{ color: "var(--primary-2)" }}>View all →</Link>}
              </div>
              {d.recent.length === 0 ? (
                <Empty title="No entries yet" text={user.role === "SE" ? "Add your first entry to get started." : "Entries will show up here."} />
              ) : (
                <ul>
                  {d.recent.map((l: any) => (
                    <li key={l._id} className="flex items-center gap-3 px-3.5 py-2.5 cursor-pointer" style={{ borderTop: "1px solid var(--border)" }} onClick={() => setOpenId(l._id)}>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate">{l.name}</div>
                        <div className="text-[11px] font-mono" style={{ color: "var(--muted)" }}>{l.leadId} · {dateFmt(l.createdAt)}</div>
                      </div>
                      <div className="text-end shrink-0">
                        <div className="text-sm font-semibold tnum mb-0.5">Rs {money(l.amount)}</div>
                        <StatusBadge status={l.paymentStatus} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="glass p-4 flex flex-col gap-3">
              <h2 className="font-semibold">Quick actions</h2>
              {user.role === "SE" && can(user, "addLeads") && <Link href="/leads/new" className="btn btn-primary"><Icon name="plus" size={16} /> Add new entry</Link>}
              {(user.role === "admin" || (user.role === "SM" && can(user, "verifyPayments"))) && (
                <Link href="/leads" className="btn btn-ghost"><Icon name="check" size={16} /> Verify pending payments ({d.counts.pending})</Link>
              )}
              {(user.role === "admin" || user.role === "SM") && <Link href="/persons" className="btn btn-ghost"><Icon name="users" size={16} /> {user.role === "admin" ? "Manage persons" : "Manage my team"}</Link>}
              {(user.role === "admin" || can(user, "viewCommission")) && <Link href="/commission" className="btn btn-ghost"><Icon name="percent" size={16} /> Commission</Link>}
              {user.role === "admin" && <Link href="/rights" className="btn btn-ghost"><Icon name="shield" size={16} /> Rights management</Link>}
            </div>
          </div>
        </>
      )}
      <LeadViewLoader id={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}
