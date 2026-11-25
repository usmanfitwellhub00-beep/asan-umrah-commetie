"use client";

import { useEffect, useState } from "react";
import { Avatar } from "./Avatar";
import { Icon } from "./icons";
import { PlatformLabel } from "./PaymentSelect";
import { StatusBadge, useToast } from "./ui";
import { useUser } from "./UserContext";
import { api, dateFmt, money } from "@/lib/client";
import { can } from "@/lib/rights";

type Lead = any;
type Tab = "details" | "shot" | "photo";

/** Full-window view of one lead. Laptop: near full-window, two columns. Mobile: full-height sheet with tabs. */
export function LeadView({ lead, onClose, onStatus, busy }: {
  lead: Lead | null; onClose: () => void; onStatus?: (l: Lead, s: string) => void; busy?: boolean;
}) {
  const user = useUser();
  const [tab, setTab] = useState<Tab>("details");
  const canVerify = !!onStatus && (user.role === "admin" || (user.role === "SM" && can(user, "verifyPayments")));

  useEffect(() => {
    if (!lead) return;
    setTab("details");
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", h);
      document.body.style.overflow = prev;
    };
  }, [lead, onClose]);

  if (!lead) return null;
  const l = lead;

  const rows: [string, React.ReactNode][] = [
    ["Lead ID", <span key="i" className="font-mono">{l.leadId}</span>],
    ["Father / Husband", l.fatherHusbandName],
    ["CNIC", <span key="c" dir="ltr" className="tnum">{l.cnic}</span>],
    ["Gender", l.gender === "female" ? "Female" : "Male"],
    ["Phone", <span key="p" dir="ltr" className="tnum">{l.phone}</span>],
    ["WhatsApp", <span key="w" dir="ltr" className="tnum">{l.whatsapp}</span>],
    ["Email", l.email || "—"],
    ["Amount", <span key="a" className="tnum">Rs {money(l.amount)}</span>],
    ["Platform", <PlatformLabel key="pl" id={l.paymentPlatform} />],
    ["Date added", dateFmt(l.createdAt)],
    ...(l.verifiedAt ? ([["Verified on", dateFmt(l.verifiedAt)]] as [string, React.ReactNode][]) : []),
  ];

  const renderImg = (url: string | undefined, alt: string) =>
    url ? (
      <a href={url} target="_blank" rel="noreferrer" className="block h-full w-full" title="Tap to open full size">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={alt} className="h-full w-full object-contain rounded-xl" style={{ background: "var(--input-bg)" }} />
      </a>
    ) : (
      <div className="h-full w-full rounded-xl flex flex-col items-center justify-center gap-2 text-sm" style={{ background: "var(--input-bg)", color: "var(--muted)" }}>
        <Avatar gender={l.gender} name={l.name} size={72} />
        No picture uploaded
      </div>
    );

  const detailsBlock = (
    <div className="space-y-4">
      <div className="rounded-xl p-3 text-sm space-y-1.5" style={{ background: "var(--primary-soft)" }}>
        <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Lead hierarchy</div>
        <div className="flex items-baseline justify-between gap-3"><span style={{ color: "var(--muted)" }}>Sales Manager</span><span className="text-end font-semibold">{l.sm?.name ?? "—"} <span dir="ltr" className="font-mono text-xs font-normal" style={{ color: "var(--muted)" }}>{l.smId}</span></span></div>
        <div className="flex items-baseline justify-between gap-3"><span style={{ color: "var(--muted)" }}>Sales Executive</span><span className="text-end font-semibold">{l.se?.name ?? "—"} <span dir="ltr" className="font-mono text-xs font-normal" style={{ color: "var(--muted)" }}>{l.seId}</span></span></div>
      </div>
      <dl className="grid grid-cols-2 gap-x-5 gap-y-3.5 text-sm rounded-xl p-4" style={{ border: "1px solid var(--border)" }}>
        {rows.map(([k, v]) => (
          <div key={k} className="min-w-0"><dt className="label !mb-0">{k}</dt><dd className="font-medium break-words">{v}</dd></div>
        ))}
        <div className="col-span-2 min-w-0"><dt className="label !mb-0">Address</dt><dd className="font-medium break-words">{l.address}</dd></div>
      </dl>
    </div>
  );

  const tabs: [Tab, string][] = [["details", "Details"], ["shot", "Payment screenshot"], ["photo", "Person picture"]];

  return (
    <div className="fixed inset-0 z-50 flex lg:items-center lg:justify-center lg:p-6" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-black/55 backdrop-blur-[2px]" onClick={onClose} />
      <div className="glass glass-strong pop relative flex flex-col w-full h-[100dvh] lg:h-auto lg:max-h-[92vh] lg:max-w-6xl !rounded-none lg:!rounded-2xl overflow-hidden">
        {/* header */}
        <div className="flex items-center gap-3 px-4 lg:px-6 py-3 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <Avatar url={l.pictureUrl} gender={l.gender} name={l.name} size={44} />
          <div className="min-w-0 flex-1">
            <div className="font-semibold truncate leading-tight">{l.name}</div>
            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
              <StatusBadge status={l.paymentStatus} />
              {l.commissionGenerated && <span className="badge badge-info">Commission generated</span>}
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close"><Icon name="x" size={18} /></button>
        </div>

        {/* mobile tabs */}
        <div className="lg:hidden grid grid-cols-3 gap-1.5 p-2 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          {tabs.map(([id, label]) => (
            <button key={id} className={`btn btn-sm !px-1 text-[12px] ${tab === id ? "btn-primary" : "btn-ghost"}`} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>

        {/* body: fills the remaining height */}
        <div className="flex-1 min-h-0 lg:overflow-y-auto">
          {/* laptop: fixed layout, no scrolling */}
          <div className="hidden lg:grid grid-cols-[minmax(420px,520px)_1fr] gap-6 h-full p-6">
            <div className="flex flex-col gap-4 min-h-0">
              <div className="flex gap-4 rounded-xl p-4" style={{ background: "var(--primary-soft)" }}>
                <div className="shrink-0 rounded-lg overflow-hidden" style={{ width: 96, height: 124, background: "var(--input-bg)", border: "1px solid var(--border)" }}>
                  {l.pictureUrl ? (
                    <a href={l.pictureUrl} target="_blank" rel="noreferrer" title="Tap to open full size">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={l.pictureUrl} alt="Person" className="h-full w-full object-cover" />
                    </a>
                  ) : (
                    <div className="h-full w-full flex items-center justify-center"><Avatar gender={l.gender} name={l.name} size={72} /></div>
                  )}
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Lead hierarchy</div>
                  <div className="mt-1.5 space-y-1.5">
                    <div className="flex items-center gap-2 min-w-0"><span className="badge badge-info shrink-0">SM</span><b dir="ltr" className="shrink-0">{l.smId}</b><span className="truncate" style={{ color: "var(--muted)" }}>{l.sm?.name}</span></div>
                    <div className="flex items-center gap-2 min-w-0"><span className="badge badge-info shrink-0">SE</span><b dir="ltr" className="shrink-0">{l.seId}</b><span className="truncate" style={{ color: "var(--muted)" }}>{l.se?.name}</span></div>
                  </div>
                  <div className="mt-3 text-[11px]" style={{ color: "var(--muted)" }}>{dateFmt(l.createdAt)}{l.verifiedAt ? ` · ${dateFmt(l.verifiedAt)}` : ""}</div>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-x-5 gap-y-3 text-sm">
                {rows.filter(([k]) => k !== "Date added" && k !== "Verified on").map(([k, v]) => (
                  <div key={k} className="min-w-0 pb-2" style={{ borderBottom: "1px solid var(--border)" }}><dt className="label !mb-0.5">{k}</dt><dd className="font-semibold break-words">{v}</dd></div>
                ))}
                <div className="col-span-2 min-w-0"><dt className="label !mb-0.5">Address</dt><dd className="font-semibold break-words">{l.address}</dd></div>
              </dl>
            </div>
            <div className="flex flex-col min-h-0 min-w-0">
              <div className="label">Payment screenshot</div>
              <div className="flex-1 min-h-0 rounded-xl p-3 flex items-center justify-center" style={{ background: "var(--input-bg)", border: "1px solid var(--border)" }}>
                {l.paymentScreenshotUrl ? (
                  <a href={l.paymentScreenshotUrl} target="_blank" rel="noreferrer" className="block h-full max-w-full" title="Tap to open full size">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={l.paymentScreenshotUrl} alt="Payment screenshot" className="h-full max-w-full object-contain rounded-lg" />
                  </a>
                ) : <span className="text-sm" style={{ color: "var(--muted)" }}>—</span>}
              </div>
            </div>
          </div>
          {/* mobile */}
          <div className="lg:hidden h-full p-3">
            {tab === "details" && <div className="h-full overflow-y-auto">{detailsBlock}</div>}
            {tab === "shot" && renderImg(l.paymentScreenshotUrl, "Payment screenshot")}
            {tab === "photo" && renderImg(l.pictureUrl, "Person")}
          </div>
        </div>

        {/* actions */}
        {canVerify && (
          <div className="grid grid-cols-3 lg:flex lg:justify-end gap-2 px-4 lg:px-6 py-3 shrink-0" style={{ borderTop: "1px solid var(--border)", paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
            {l.paymentStatus !== "pending" && <button className="btn btn-ghost" disabled={busy} onClick={() => onStatus!(l, "pending")}>Pending</button>}
            {l.paymentStatus !== "rejected" && <button className="btn btn-danger" disabled={busy} onClick={() => onStatus!(l, "rejected")}>Reject</button>}
            {l.paymentStatus !== "approved" && <button className="btn btn-primary" disabled={busy} onClick={() => onStatus!(l, "approved")}>Approve</button>}
          </div>
        )}
      </div>
    </div>
  );
}

/** Opens LeadView for a lead id (fetches the full record). */
export function LeadViewLoader({ id, onClose }: { id: string | null; onClose: () => void }) {
  const toast = useToast();
  const [lead, setLead] = useState<Lead | null>(null);

  useEffect(() => {
    let live = true;
    setLead(null);
    if (!id) return;
    api(`/api/leads/${id}`)
      .then((d) => live && setLead(d.lead))
      .catch((e) => {
        toast.err(e instanceof Error ? e.message : "Could not load leads");
        onClose();
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return <LeadView lead={lead} onClose={onClose} />;
}
