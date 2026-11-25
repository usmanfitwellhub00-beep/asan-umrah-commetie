"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { Field, Loading, PageInfo, RoleGate, useToast } from "@/components/ui";
import { api } from "@/lib/client";
import type { RightsMap } from "@/lib/rights";

const ADMIN_LOCKED = [
  "Edit, delete or update any lead (all fields and payment status)",
  "See which SM and which SE every lead is under",
  "Add, edit, activate/deactivate and delete SMs and SEs",
  "Verify any payment and view all commission figures",
  "Change these rights and the system limits",
];

export default function RightsPage() {
  return (
    <RoleGate roles={["admin"]}>
      <Rights />
    </RoleGate>
  );
}

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className="relative w-11 h-6 rounded-full transition-colors shrink-0" style={{ background: on ? "var(--primary)" : "var(--input-bg)", border: "1px solid var(--border)" }}>
      <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all shadow" style={{ insetInlineStart: on ? "1.35rem" : "0.15rem" }} />
    </button>
  );
}

function Rights() {
  const toast = useToast();
  const [defs, setDefs] = useState<any>(null);
  const [rights, setRights] = useState<RightsMap | null>(null);
  const [maxSM, setMaxSM] = useState("5");
  const [amount, setAmount] = useState("5000");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api("/api/rights")
      .then((d) => {
        setDefs(d.defs);
        setRights(d.settings.rights);
        setMaxSM(String(d.settings.maxSM));
        setAmount(String(d.settings.leadAmount));
      })
      .catch((e) => toast.err(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function set(role: "SM" | "SE", key: string, v: boolean) {
    setRights((r) => (r ? { ...r, [role]: { ...r[role], [key]: v } } : r));
  }

  async function save() {
    setBusy(true);
    try {
      await api("/api/rights", { method: "PUT", json: { rights, maxSM: Number(maxSM), leadAmount: Number(amount) } });
      toast.ok("Rights saved — they apply on the next page load for each user");
    } catch (e) {
      toast.err(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageInfo
        title="Rights Management"
        subtitle="Decide what Sales Managers and Sales Executives are allowed to do. Admin always has full access."
        structure={[
          "System limits — maximum number of Sales Managers and the fixed amount of one committee entry.",
          "Admin rights (locked) — what only the admin can do; these cannot be switched off.",
          "Sales Manager rights — switch each ability on/off.",
          "Sales Executive rights — switch each ability on/off. Click “Save rights” to apply.",
        ]}
      />

      {!rights || !defs ? (
        <Loading rows={4} />
      ) : (
        <div className="grid xl:grid-cols-2 gap-3 items-start">
          <div className="glass p-4 sm:p-5">
            <h2 className="font-semibold mb-3">System limits</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Maximum Sales Managers" hint="Default is 5. Existing SMs are never removed if you lower this."><input className="input" type="number" min={1} max={100} value={maxSM} onChange={(e) => setMaxSM(e.target.value)} /></Field>
              <Field label="Committee entry amount (Rs)" hint="Auto-filled on every new entry. Existing entries keep their amount."><input className="input" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
            </div>
          </div>

          <div className="glass p-4 sm:p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2"><Icon name="shield" size={18} /> Admin rights <span className="badge badge-info">Locked</span></h2>
            <ul className="grid gap-2 text-sm">
              {ADMIN_LOCKED.map((t) => (
                <li key={t} className="flex items-start gap-2"><span style={{ color: "var(--ok)" }}><Icon name="check" size={16} /></span>{t}</li>
              ))}
            </ul>
          </div>

          {(["SM", "SE"] as const).map((role) => (
            <div className="glass p-4 sm:p-5" key={role}>
              <h2 className="font-semibold mb-3">{role === "SM" ? "Sales Manager (SM) rights" : "Sales Executive (SE) rights"}</h2>
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                {defs[role].map((d: any) => (
                  <div key={d.key} className="flex items-center gap-4 py-3" style={{ borderTop: "1px solid var(--border)" }}>
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{d.label}</div>
                      <div className="text-xs" style={{ color: "var(--muted)" }}>{d.desc}</div>
                    </div>
                    <Switch on={!!rights[role][d.key]} onChange={(v) => set(role, d.key, v)} label={d.label} />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="flex justify-end xl:col-span-2">
            <button className="btn btn-primary btn-lg" onClick={save} disabled={busy}><Icon name="check" size={16} /> {busy ? "Saving…" : "Save rights"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
