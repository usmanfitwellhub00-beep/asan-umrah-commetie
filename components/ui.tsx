"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Icon, type IconName } from "./icons";
import { useUser } from "./UserContext";
import { can, type Role } from "@/lib/rights";

/* ---------- Toasts ---------- */
type Kind = "ok" | "err" | "warn" | "info";
type Toast = { id: number; kind: Kind; msg: string };
const ToastCtx = createContext<{ ok: (m: string) => void; err: (m: string) => void; warn: (m: string) => void; info: (m: string) => void }>({ ok: () => {}, err: () => {}, warn: () => {}, info: () => {} });
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((kind: Toast["kind"], msg: string) => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, kind, msg }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 4200);
  }, []);
  const value = useMemo(() => ({ ok: (m: string) => push("ok", m), err: (m: string) => push("err", m), warn: (m: string) => push("warn", m), info: (m: string) => push("info", m) }), [push]);
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="fixed z-[100] start-3 end-3 top-3 lg:top-4 lg:start-auto lg:end-4 lg:w-96 flex flex-col gap-2">
        {items.map((t) => {
          const c = { ok: "var(--ok)", err: "var(--bad)", warn: "var(--warn)", info: "var(--primary-2)" }[t.kind];
          const ic = t.kind === "ok" ? "check" : t.kind === "err" ? "x" : "info";
          return (
            <div key={t.id} className="glass glass-strong pop px-3.5 py-2.5 text-sm flex items-start gap-2.5" role="status" style={{ borderInlineStart: `4px solid ${c}`, background: `color-mix(in srgb, ${c} 10%, var(--surface-strong))` }}>
              <span className="mt-0.5 shrink-0" style={{ color: c }}><Icon name={ic as IconName} size={16} /></span>
              <span className="font-medium">{t.msg}</span>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- Modal (bottom sheet on phones) ---------- */
export function Modal({ open, onClose, title, children, wide, xl }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean; xl?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", h);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className={`glass glass-strong pop relative w-full ${xl ? "sm:max-w-5xl" : wide ? "sm:max-w-3xl" : "sm:max-w-lg"} max-h-[92dvh] flex flex-col rounded-b-none sm:rounded-b-[0.9rem]`}>
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <h3 className="font-semibold truncate">{title}</h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Close">
            <Icon name="x" size={16} />
          </button>
        </div>
        <div className="p-4 sm:p-5 overflow-y-auto" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", danger, busy, onConfirm, onCancel }: {
  open: boolean; title: string; message: string; confirmLabel?: string; danger?: boolean; busy?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-sm" style={{ color: "var(--muted)" }}>{message}</p>
      <div className="flex justify-end gap-2 mt-5">
        <button className="btn btn-ghost btn-lg" onClick={onCancel}><Icon name="x" size={16} /> Cancel</button>
        <button className={`btn btn-lg ${danger ? "btn-danger" : "btn-primary"}`} onClick={onConfirm} disabled={busy}><Icon name={danger ? "trash" : "check"} size={16} /> {busy ? "Please wait…" : confirmLabel}</button>
      </div>
    </Modal>
  );
}

/* ---------- Small pieces ---------- */
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    pending: ["badge-warn", "Pending"],
    approved: ["badge-ok", "Approved"],
    rejected: ["badge-bad", "Rejected"],
  };
  const [cls, label] = map[status] ?? ["badge-info", status];
  return <span className={`badge ${cls}`}>{label}</span>;
}

export function RoleBadge({ role }: { role: string }) {
  const label = role === "SM" ? "Sales Manager" : role === "SE" ? "Sales Executive" : "Admin";
  return <span className="badge badge-info">{label}</span>;
}

export function Stat({ label, value, hint, icon, tone }: { label: string; value: React.ReactNode; hint?: string; icon: IconName; tone?: "ok" | "warn" | "bad" }) {
  const color = tone ? `var(--${tone})` : "var(--primary-2)";
  return (
    <div className="glass p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] sm:text-xs font-semibold leading-tight" style={{ color: "var(--muted)" }}>{label}</div>
        <span className="shrink-0" style={{ color }}><Icon name={icon} size={16} /></span>
      </div>
      <div className="text-xl sm:text-2xl font-bold leading-tight mt-1.5 tnum break-words">{value}</div>
      {hint && <div className="text-[11px] mt-0.5 leading-tight" style={{ color: "var(--muted)" }}>{hint}</div>}
    </div>
  );
}

export function Field({ label, required, hint, error, children }: { label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}{required && <span className="req"> *</span>}</label>
      {children}
      {error ? <p className="text-[11px] mt-1 font-medium" style={{ color: "var(--bad)" }} role="alert">{error}</p> : hint && <p className="text-[11px] mt-1" style={{ color: "var(--muted)" }}>{hint}</p>}
    </div>
  );
}

export function Empty({ title, text }: { title: string; text?: string }) {
  return (
    <div className="text-center py-10 px-4">
      <div className="mx-auto w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ background: "var(--primary-soft)", color: "var(--primary-2)" }}>
        <Icon name="leads" size={20} />
      </div>
      <div className="font-semibold">{title}</div>
      {text && <div className="text-sm mt-1" style={{ color: "var(--muted)" }}>{text}</div>}
    </div>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return <span className={`spinner ${className}`} aria-hidden="true" />;
}

/** Full-screen branded loader (rotating ring around the logo). */
export function PortalLoader({ text = "Loading portal…" }: { text?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5" role="status" aria-live="polite">
      <div className="relative flex items-center justify-center" style={{ width: 84, height: 84 }}>
        <div className="spinner-lg absolute" />
        <div className="rounded-2xl flex items-center justify-center text-white pulse-soft" style={{ width: 44, height: 44, background: "var(--primary)" }}>
          <Icon name="kaaba" size={24} />
        </div>
      </div>
      <div className="text-sm font-semibold" style={{ color: "var(--muted)" }}>{text}</div>
    </div>
  );
}

export function Loading({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-14" />
      ))}
    </div>
  );
}

/* Page header + collapsible "page structure" guide shown at the start of every page */
export function PageInfo({ title, subtitle, structure }: { title: string; subtitle: string; structure: string[] }) {
  return (
    <div className="mb-4 sm:mb-6">
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h1>
      <p className="text-[13px] mt-0.5" style={{ color: "var(--muted)" }}>{subtitle}</p>
      <details className="glass mt-3 group">
        <summary className="flex items-center gap-2 cursor-pointer select-none px-3.5 py-2.5 text-[13px] font-semibold list-none">
          <span style={{ color: "var(--primary-2)" }}><Icon name="info" size={15} /></span>
          Page guide — how this page is structured
          <span className="ms-auto transition-transform group-open:rotate-180" style={{ color: "var(--muted)" }}><Icon name="chevron" size={15} /></span>
        </summary>
        <ol className="px-3.5 pb-3.5 text-[13px] grid gap-1.5 list-decimal list-inside" style={{ color: "var(--muted)" }}>
          {structure.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      </details>
    </div>
  );
}

export function RoleGate({ roles, right, children }: { roles: Role[]; right?: string; children: React.ReactNode }) {
  const user = useUser();
  const ok = roles.includes(user.role) && (!right || can(user, right));
  if (ok) return <>{children}</>;
  return (
    <div className="glass p-10 text-center">
      <div className="font-semibold">You don’t have access to this page</div>
      <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>Ask the admin if you need this right enabled.</p>
    </div>
  );
}
