"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/icons";
import { LeadViewLoader } from "@/components/LeadView";
import { Empty, Loading, PageInfo, RoleGate, StatusBadge, useToast } from "@/components/ui";
import { api, dateFmt, money } from "@/lib/client";
import { useLive } from "@/lib/live";

type L = { _id: string; leadId: string; name: string; paymentStatus: string; amount: number; createdAt: string };
type N = { _id: string; userId: string; name: string; gender: string; pictureUrl: string; active: boolean };
type SE = N & { leads: L[] };
type Data = { role: string; showLeads: boolean; admin: N | null; sms: (N & { ses: SE[] })[]; orphans: SE[] };

export default function HierarchyPage() {
  return (
    <RoleGate roles={["admin", "SM"]}>
      <Hierarchy />
    </RoleGate>
  );
}

function Person({ n, size, role }: { n: N; size: number; role: string }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <Avatar url={n.pictureUrl} gender={n.gender} name={n.name} size={size} />
      <div className="min-w-0 leading-tight">
        <div className="font-semibold truncate">{n.name}</div>
        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
          <span className="badge badge-info">{role}</span>
          <span className="font-mono text-[11px] whitespace-nowrap" dir="ltr" style={{ color: "var(--muted)" }}>{n.userId}</span>
          {!n.active && <span className="badge badge-bad">Inactive</span>}
        </div>
      </div>
    </div>
  );
}

function SeRow({ e, open, onToggle, showLeads, onOpenLead }: { e: SE; open: boolean; onToggle: () => void; showLeads: boolean; onOpenLead: (id: string) => void }) {
  const approved = e.leads.filter((l) => l.paymentStatus === "approved").length;
  const pending = e.leads.filter((l) => l.paymentStatus === "pending").length;
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "var(--primary-soft)" }}>
      <button type="button" className="w-full flex items-start gap-2 px-3 py-2.5 text-start" onClick={onToggle} disabled={!showLeads} aria-expanded={open}>
        {showLeads && <span className={`mt-2.5 transition-transform shrink-0 ${open ? "" : "-rotate-90 rtl:rotate-90"}`} style={{ color: "var(--muted)" }}><Icon name="chevron" size={16} /></span>}
        <div className="min-w-0 flex-1 space-y-2">
          <Person n={e} size={36} role="SE" />
          {showLeads && (
            <div className="flex flex-wrap gap-1.5">
              <span className="badge badge-info">{e.leads.length} leads</span>
              {approved > 0 && <span className="badge badge-ok">{approved} approved</span>}
              {pending > 0 && <span className="badge badge-warn">{pending} pending</span>}
            </div>
          )}
        </div>
      </button>
      {showLeads && open && (
        <div className="px-3 pb-3">
          {e.leads.length === 0 ? (
            <div className="text-xs px-2 py-2" style={{ color: "var(--muted)" }}>No entries yet</div>
          ) : (
            <ul className="nav-sub !ms-3 !mt-0 !mb-0 gap-1.5">
              {e.leads.map((l) => (
                <li key={l._id}>
                  <button type="button" onClick={() => onOpenLead(l._id)} className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-start" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <span className="shrink-0" style={{ color: "var(--muted)" }}><Icon name="leads" size={15} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold break-words leading-snug">{l.name}</div>
                      <div className="text-[11px] font-mono leading-snug" style={{ color: "var(--muted)" }}>{l.leadId}</div>
                      <div className="text-[11px]" style={{ color: "var(--muted)" }}>{dateFmt(l.createdAt)}</div>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <span className="text-xs font-semibold tnum whitespace-nowrap">Rs {money(l.amount)}</span>
                      <StatusBadge status={l.paymentStatus} />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Hierarchy() {
  const toast = useToast();
  const [d, setD] = useState<Data | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [leadId, setLeadId] = useState<string | null>(null);

  useEffect(() => {
    api("/api/hierarchy").then(setD).catch((e) => toast.err(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useLive(() => { api("/api/hierarchy").then(setD).catch(() => {}); });

  const toggle = (id: string) => setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allSes = d ? [...d.sms.flatMap((m) => m.ses), ...d.orphans] : [];
  const isSM = d?.role === "SM";

  return (
    <div>
      <PageInfo
        title="Hierarchy"
        subtitle={isSM ? "You → your Sales Executives → their entries." : "Who is under whom: Admin → Sales Managers → Sales Executives → entries."}
        structure={[
          isSM ? "Top card — you, the Sales Manager." : "Top card — the admin, who sits above everyone.",
          "Sales Executive rows — tap a row to show or hide that SE's entries.",
          "Entries — name, lead ID, amount and payment status. Tap an entry to open its full details.",
        ]}
      />
      {!d ? <Loading /> : (
        <div className="flex flex-col">
          {d.showLeads && allSes.length > 0 && (
            <div className="flex justify-end gap-2 mb-3">
              <button className="btn btn-ghost btn-sm" onClick={() => setOpen(new Set(allSes.map((e) => e._id)))}><Icon name="chevron" size={14} /> Expand all</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setOpen(new Set())}><Icon name="chevron" size={14} className="-rotate-90" /> Collapse all</button>
            </div>
          )}

          {d.admin && (
            <div className="self-center glass glass-strong px-5 py-3.5 w-full sm:w-auto sm:min-w-[320px]" style={{ borderTop: "3px solid var(--primary)" }}>
              <Person n={d.admin} size={52} role="ADMIN" />
            </div>
          )}
          {d.admin && <div className="self-center w-px h-6" style={{ background: "var(--border)" }} />}

          {d.sms.length === 0 ? (
            <Empty title="No Sales Managers yet" text="Add a Sales Manager from Persons Management." />
          ) : (
            <div className={isSM ? "w-full" : "w-full grid gap-4 grid-cols-1 md:grid-cols-[repeat(auto-fill,minmax(380px,1fr))] items-start"}>
              {d.sms.map((m) => (
                <div key={m._id} className="glass p-4" style={isSM ? { borderTop: "3px solid var(--primary)" } : undefined}>
                  <div className="flex items-start justify-between gap-2">
                    <Person n={m} size={isSM ? 52 : 48} role="SM" />
                    <span className="badge badge-ok shrink-0">{m.ses.length} SE</span>
                  </div>
                  <div className="nav-sub !ms-3 !mt-3 !mb-0 gap-2.5">
                    {m.ses.length === 0 ? (
                      <div className="text-xs py-1" style={{ color: "var(--muted)" }}>No Sales Executives yet</div>
                    ) : m.ses.map((e) => (
                      <SeRow key={e._id} e={e} open={open.has(e._id)} onToggle={() => toggle(e._id)} showLeads={d.showLeads} onOpenLead={setLeadId} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {d.orphans.length > 0 && (
            <div className="glass p-4 mt-4 w-full">
              <div className="text-xs font-bold mb-2" style={{ color: "var(--bad)" }}>Sales Executives without a Sales Manager</div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {d.orphans.map((e) => <SeRow key={e._id} e={e} open={open.has(e._id)} onToggle={() => toggle(e._id)} showLeads={d.showLeads} onOpenLead={setLeadId} />)}
              </div>
            </div>
          )}
        </div>
      )}
      <LeadViewLoader id={leadId} onClose={() => setLeadId(null)} />
    </div>
  );
}
