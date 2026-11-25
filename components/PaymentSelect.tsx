"use client";

import { useEffect, useRef, useState } from "react";
import { PAYMENT_PLATFORMS, type PaymentPlatform } from "@/lib/payment-platforms";
import { Icon } from "./icons";

export function PlatformIcon({ p, size = 28 }: { p: PaymentPlatform; size?: number }) {
  // real logo (p.logo) if provided, else generated /payments/<id>.svg, else a coloured badge
  const [failed, setFailed] = useState(false);
  const real = !!p.logo;
  if (!failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={p.logo ?? `/payments/${p.id}.svg`} alt={p.name} width={size} height={size} className="rounded-lg object-contain shrink-0" style={{ width: size, height: size, background: real ? "#fff" : undefined, border: real ? "1px solid var(--border)" : undefined }} onError={() => setFailed(true)} />;
  }
  return (
    <span
      className="inline-flex items-center justify-center rounded-lg text-white font-bold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.36, background: `linear-gradient(135deg, ${p.color}, color-mix(in srgb, ${p.color} 68%, #000))` }}
    >
      {p.abbr}
    </span>
  );
}

export function PlatformLabel({ id, size = 24 }: { id: string; size?: number }) {
  const p = PAYMENT_PLATFORMS.find((x) => x.id === id);
  if (!p) return <span>{id}</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <PlatformIcon p={p} size={size} />
      <span>{p.name}</span>
    </span>
  );
}

export function PaymentSelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const selected = PAYMENT_PLATFORMS.find((p) => p.id === value);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", h);
    document.addEventListener("keydown", k);
    return () => {
      document.removeEventListener("mousedown", h);
      document.removeEventListener("keydown", k);
    };
  }, [open]);

  const list = PAYMENT_PLATFORMS.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="relative" ref={ref}>
      <button type="button" className="input flex items-center gap-2 text-start" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}>
        {selected ? (
          <>
            <PlatformIcon p={selected} size={24} />
            <span className="truncate">{selected.name}</span>
          </>
        ) : (
          <span style={{ color: "var(--muted)" }}>Select payment platform</span>
        )}
        <span className="ms-auto" style={{ color: "var(--muted)" }}>
          <Icon name="chevron" size={16} />
        </span>
      </button>

      {open && (
        <div className="glass glass-strong pop absolute z-40 mt-2 w-full overflow-hidden" role="listbox">
          <div className="p-2" style={{ borderBottom: "1px solid var(--border)" }}>
            <input className="input" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {list.length === 0 && <div className="p-3 text-sm" style={{ color: "var(--muted)" }}>No match</div>}
            {list.map((p) => (
              <button
                type="button"
                key={p.id}
                role="option"
                aria-selected={p.id === value}
                className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm text-start hover:bg-[var(--primary-soft)]"
                style={p.id === value ? { background: "var(--primary-soft)" } : undefined}
                onClick={() => {
                  onChange(p.id);
                  setOpen(false);
                  setQ("");
                }}
              >
                <PlatformIcon p={p} size={28} />
                <span className="flex-1">{p.name}</span>
                {p.id === value && <Icon name="check" size={16} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
