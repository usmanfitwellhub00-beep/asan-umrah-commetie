"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/icons";
import { LeadForm } from "@/components/LeadForm";
import { LeadView } from "@/components/LeadView";
import { PlatformLabel } from "@/components/PaymentSelect";
import { ConfirmDialog, Empty, Loading, Modal, PageInfo, StatusBadge, useToast } from "@/components/ui";
import { useUser } from "@/components/UserContext";
import { useLive } from "@/lib/live";
import { api, dateFmt, money } from "@/lib/client";
import { can } from "@/lib/rights";

type Lead = any;
const TABS = [
  { id: "", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

export default function LeadsPage() {
  const user = useUser();
  const toast = useToast();
  const isAdmin = user.role === "admin";
  const canVerify = isAdmin || (user.role === "SM" && can(user, "verifyPayments"));
  const showUnder = user.role !== "SE";

  const [leads, setLeads] = useState<Lead[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({ all: 0, pending: 0, approved: 0, rejected: 0 });
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<Lead | null>(null);
  const [edit, setEdit] = useState<Lead | null>(null);
  const [del, setDel] = useState<Lead | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (silent?: boolean) => {
    try {
      const p = new URLSearchParams();
      if (status) p.set("status", status);
      if (q.trim()) p.set("q", q.trim());
      const d = await api(`/api/leads?${p}`);
      setLeads(d.leads);
      setCounts(d.counts);
    } catch (e) {
      if (!silent) toast.err(e instanceof Error ? e.message : "Could not load leads");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, q]);

  useLive(() => { load(true); });

  useEffect(() => {
    const t = setTimeout(() => load(), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  async function setPay(l: Lead, s: string) {
    setBusy(true);
    try {
      await api(`/api/leads/${l._id}`, { method: "PATCH", json: { paymentStatus: s } });
      if (s === "approved") toast.ok("Payment approved — commission updated automatically");
      else if (s === "rejected") toast.err("Payment rejected");
      else toast.warn("Marked as pending");
      setView(null);
      await load();
    } catch (e) {
      toast.err(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(payload: Record<string, any>) {
    if (!edit) return;
    setBusy(true);
    try {
      await api(`/api/leads/${edit._id}`, { method: "PATCH", json: payload });
      toast.ok("Lead updated");
      setEdit(null);
      await load();
    } catch (e) {
      toast.err(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!del) return;
    setBusy(true);
    try {
      await api(`/api/leads/${del._id}`, { method: "DELETE" });
      toast.err("Lead deleted");
      setDel(null);
      await load();
    } catch (e) {
      toast.err(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  /** action buttons: icon-only on desktop table, labelled on phone cards */
  function actions(l: Lead, labelled: boolean) {
    const t = (s: string) => (labelled ? <span>{s}</span> : null);
    const cls = labelled ? "" : "btn-icon";
    return (
      <div className={`flex ${labelled ? "flex-wrap gap-2 lg:justify-end" : "justify-end gap-1.5"}`}>
        <button className={`btn btn-ghost btn-sm ${cls}`} title="View details" onClick={() => setView(l)}><Icon name="eye" size={15} />{t("View")}</button>
        {canVerify && l.paymentStatus !== "approved" && (
          <button className={`btn btn-ok btn-sm ${cls}`} title="Approve payment" disabled={busy} onClick={() => setPay(l, "approved")}><Icon name="check" size={15} />{t("Approve")}</button>
        )}
        {canVerify && l.paymentStatus !== "rejected" && (
          <button className={`btn btn-danger btn-sm ${cls}`} title="Reject payment" disabled={busy} onClick={() => setPay(l, "rejected")}><Icon name="x" size={15} />{t("Reject")}</button>
        )}
        {isAdmin && <button className={`btn btn-info btn-sm ${cls}`} title="Edit lead" onClick={() => setEdit(l)}><Icon name="edit" size={15} />{t("Edit")}</button>}
        {isAdmin && <button className={`btn btn-danger btn-sm ${cls}`} title="Delete lead" onClick={() => setDel(l)}><Icon name="trash" size={15} />{t("Delete")}</button>}
      </div>
    );
  }

  const title = isAdmin ? "All Leads" : user.role === "SM" ? "Team Leads" : "My Entries";

  return (
    <div>
      <PageInfo
        title={title}
        subtitle={isAdmin ? "Every committee entry across all Sales Managers and Executives." : user.role === "SM" ? "Entries added by the Sales Executives in your team." : "The committee entries you have submitted."}
        structure={[
          "Search box and status tabs (All / Pending / Approved / Rejected) with live counts.",
          "List — lead ID, person, payment platform + screenshot, who the lead is under (SM → SE), payment status and commission status.",
          canVerify ? "Verify payments — approve or reject. Approved entries automatically feed the commission calculation." : "Payment status is set by your Sales Manager or the admin. Approved entries count toward your commission.",
          isAdmin ? "Admin rights — view, edit, delete or update any lead and see exactly which SM and SE it belongs to." : "Tap View to see the full details and screenshot of any entry.",
        ]}
      />

      <div className="glass p-3 mb-3 flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="relative flex-1">
          <span className="absolute start-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }}><Icon name="search" size={16} /></span>
          <input className="input" style={{ paddingInlineStart: "2.3rem" }} placeholder="Search name, CNIC, phone, lead ID…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="grid grid-cols-4 lg:flex gap-1.5">
          {TABS.map((t) => (
            <button key={t.id} className={`btn btn-sm flex-col lg:flex-row !gap-0 lg:!gap-1.5 ${status === t.id ? "btn-primary" : "btn-ghost"}`} onClick={() => setStatus(t.id)}>
              <span>{t.label}</span>
              <span className="opacity-75 tnum">({counts[t.id || "all"] ?? 0})</span>
            </button>
          ))}
        </div>
        {user.role === "SE" && can(user, "addLeads") && (
          <Link href="/leads/new" className="btn btn-primary hidden lg:inline-flex"><Icon name="plus" size={16} /> Add entry</Link>
        )}
      </div>

      {loading ? (
        <div className="glass p-4"><Loading /></div>
      ) : leads.length === 0 ? (
        <div className="glass"><Empty title="No leads found" text={q || status ? "Try changing the search or filter." : user.role === "SE" ? "Add your first entry to get started." : "Entries will appear here once Sales Executives add them."} /></div>
      ) : (
        <>
          {/* desktop / tablet table */}
          <div className="glass overflow-hidden hidden md:block">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Lead</th><th>Person</th><th>Payment</th>
                  {showUnder && <th>Under</th>}
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l._id}>
                    <td>
                      <div className="font-mono text-xs font-semibold">{l.leadId}</div>
                      <div className="text-[11px]" style={{ color: "var(--muted)" }}>{dateFmt(l.createdAt)}</div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <Avatar url={l.pictureUrl} gender={l.gender} name={l.name} size={36} />
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{l.name}</div>
                          <div className="text-[11px]" style={{ color: "var(--muted)" }}>{l.cnic} · {l.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <a href={l.paymentScreenshotUrl} target="_blank" rel="noreferrer" title="Open payment screenshot" className="shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={l.paymentScreenshotUrl} alt="Payment screenshot" className="h-9 w-9 rounded-lg object-cover" />
                        </a>
                        <div>
                          <div className="font-semibold tnum">Rs {money(l.amount)}</div>
                          <div className="text-[11px]"><PlatformLabel id={l.paymentPlatform} size={16} /></div>
                        </div>
                      </div>
                    </td>
                    {showUnder && (
                      <td className="text-xs">
                        <div><span style={{ color: "var(--muted)" }}>SM</span> <b>{l.smId}</b></div>
                        <div><span style={{ color: "var(--muted)" }}>SE</span> <b>{l.seId}</b></div>
                      </td>
                    )}
                    <td>
                      <div className="flex flex-col gap-1 items-start">
                        <StatusBadge status={l.paymentStatus} />
                        {l.commissionGenerated && <span className="badge badge-info">Commission generated</span>}
                      </div>
                    </td>
                    <td>{actions(l, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* phone cards */}
          <div className="md:hidden space-y-3">
            {leads.map((l) => (
              <div key={l._id} className="glass p-3.5 space-y-3">
                <div className="flex items-start gap-3">
                  <Avatar url={l.pictureUrl} gender={l.gender} name={l.name} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{l.name}</div>
                    <div className="text-[11px]" style={{ color: "var(--muted)" }}>{l.cnic}</div>
                    <div className="text-[11px] font-mono" style={{ color: "var(--muted)" }}>{l.leadId} · {dateFmt(l.createdAt)}</div>
                  </div>
                  <StatusBadge status={l.paymentStatus} />
                </div>

                <div className="flex items-center gap-3 rounded-xl p-2.5" style={{ background: "var(--primary-soft)" }}>
                  <a href={l.paymentScreenshotUrl} target="_blank" rel="noreferrer" className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={l.paymentScreenshotUrl} alt="Payment screenshot" className="h-11 w-11 rounded-lg object-cover" />
                  </a>
                  <div className="min-w-0 flex-1 text-xs">
                    <div className="font-semibold tnum text-sm">Rs {money(l.amount)}</div>
                    <PlatformLabel id={l.paymentPlatform} size={16} />
                  </div>
                  <div className="text-end text-[11px]" style={{ color: "var(--muted)" }}>
                    <div>{l.phone}</div>
                    <div>WA: {l.whatsapp}</div>
                  </div>
                </div>

                {(showUnder || l.commissionGenerated) && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                    {showUnder && <span><span style={{ color: "var(--muted)" }}>SM</span> <b>{l.smId}</b></span>}
                    {showUnder && <span><span style={{ color: "var(--muted)" }}>SE</span> <b>{l.seId}</b></span>}
                    {l.commissionGenerated && <span className="badge badge-info">Commission generated</span>}
                  </div>
                )}

                {actions(l, true)}
              </div>
            ))}
          </div>
        </>
      )}

      {/* details */}
      <LeadView lead={view} onClose={() => setView(null)} onStatus={setPay} busy={busy} />

      {/* admin edit */}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit ? `Edit ${edit.leadId}` : ""} wide>
        {edit && <LeadForm initial={edit} amountEditable showStatus submitLabel="Save changes" busy={busy} onSubmit={saveEdit} onCancel={() => setEdit(null)} />}
      </Modal>

      <ConfirmDialog
        open={!!del}
        danger
        busy={busy}
        title="Delete this lead?"
        message={del ? `${del.leadId} (${del.name}) and its uploaded images will be permanently deleted. Commission figures will be recalculated.` : ""}
        confirmLabel="Delete lead"
        onConfirm={remove}
        onCancel={() => setDel(null)}
      />
    </div>
  );
}
