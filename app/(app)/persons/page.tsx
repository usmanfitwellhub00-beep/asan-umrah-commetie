"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { ConfirmDialog, Empty, Field, Loading, Modal, PageInfo, RoleBadge, RoleGate, Stat, useToast } from "@/components/ui";
import { useUser } from "@/components/UserContext";
import { ProfileFields, emptyProfile, missingProfile, type Profile } from "@/components/ProfileFields";
import { emailError, isEmailValid, phoneError } from "@/lib/validate-shared";
import { useLive } from "@/lib/live";
import { api } from "@/lib/client";
import { can } from "@/lib/rights";

type Person = any;

const genPassword = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#";
  const a = new Uint32Array(10);
  crypto.getRandomValues(a);
  return Array.from(a, (n) => chars[n % chars.length]).join("");
};

export default function PersonsPage() {
  return (
    <RoleGate roles={["admin", "SM"]}>
      <Persons />
    </RoleGate>
  );
}

function Persons() {
  const user = useUser();
  const toast = useToast();
  const isAdmin = user.role === "admin";
  const canAddSE = isAdmin || can(user, "addSE");
  const canEditSE = isAdmin || can(user, "editSE");

  const [users, setUsers] = useState<Person[]>([]);
  const [meta, setMeta] = useState({ maxSM: 5, smCount: 0 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"SM" | "SE">(isAdmin ? "SM" : "SE");
  const [createRole, setCreateRole] = useState<null | "SM" | "SE">(null);
  const [edit, setEdit] = useState<Person | null>(null);
  const [del, setDel] = useState<Person | null>(null);
  const [created, setCreated] = useState<CreatedInfo | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (silent?: boolean) => {
    try {
      const d = await api("/api/users");
      setUsers(d.users);
      setMeta({ maxSM: d.maxSM, smCount: d.smCount });
    } catch (e) {
      if (!silent) toast.err(e instanceof Error ? e.message : "Could not load people");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useLive(() => { load(true); });

  function rowActions(p: Person, labelled: boolean) {
    const canEdit = isAdmin || (canEditSE && p.role === "SE");
    const t = (x: string) => (labelled ? <span>{x}</span> : null);
    const cls = labelled ? "" : "btn-icon";
    if (!canEdit && !isAdmin) return <span className="text-[11px]" style={{ color: "var(--muted)" }}>View only</span>;
    return (
      <div className={`flex ${labelled ? "flex-wrap gap-2" : "justify-end gap-1.5"}`}>
        {canEdit && <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(p)}>{p.active ? "Deactivate" : "Activate"}</button>}
        {canEdit && <button className={`btn btn-ghost btn-sm ${cls}`} title="Edit" onClick={() => setEdit(p)}><Icon name="edit" size={15} />{t("Edit")}</button>}
        {isAdmin && <button className={`btn btn-danger btn-sm ${cls}`} title="Delete" onClick={() => setDel(p)}><Icon name="trash" size={15} />{t("Delete")}</button>}
      </div>
    );
  }

  const sms = users.filter((u) => u.role === "SM");
  const ses = users.filter((u) => u.role === "SE");
  const list = tab === "SM" ? sms : ses;
  const smFull = meta.smCount >= meta.maxSM;

  async function toggleActive(p: Person) {
    try {
      await api(`/api/users/${p._id}`, { method: "PATCH", json: { active: !p.active } });
      (p.active ? toast.warn : toast.ok)(p.active ? "Account deactivated" : "Account activated");
      load();
    } catch (e) {
      toast.err(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function remove() {
    if (!del) return;
    setBusy(true);
    try {
      await api(`/api/users/${del._id}`, { method: "DELETE" });
      toast.err("Account deleted");
      setDel(null);
      load();
    } catch (e) {
      toast.err(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageInfo
        title={isAdmin ? "Persons Management" : "My Team"}
        subtitle={isAdmin ? "Create and manage Sales Managers (SM) and Sales Executives (SE). Every account gets its own ID and login." : "Add Sales Executives under your ID and see how your team is performing."}
        structure={[
          isAdmin ? `Summary cards — Sales Managers used (${meta.smCount} of max ${meta.maxSM}) and total Sales Executives.` : "Summary cards — your Sales Executives and their entries.",
          isAdmin ? "Tabs — switch between Sales Managers and Sales Executives. Each SE is always under one SM." : "Table — your Sales Executives with their IDs, entries and status.",
          "IDs are generated automatically: SM → SM-0000, SE → SE-(SM code)-(6 digit SE number), e.g. SE-0001-000001.",
          isAdmin ? "Admin can add, edit, activate/deactivate and delete accounts." : canEditSE ? "You may edit your SEs (enabled by the admin)." : "After adding an SE you cannot edit them — only the admin can.",
          "Creating an account also creates the login (email or ID + the password you set).",
        ]}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
        {isAdmin && <Stat label="Sales Managers" value={`${meta.smCount} / ${meta.maxSM}`} icon="users" tone={smFull ? "warn" : undefined} hint={smFull ? "Limit reached" : `${meta.maxSM - meta.smCount} slot(s) left`} />}
        <Stat label="Sales Executives" value={ses.length} icon="users" />
        <Stat label="Total approved entries" value={ses.reduce((a, s) => a + (s.approvedCount ?? 0), 0)} icon="check" tone="ok" />
      </div>

      <div className="glass p-3 mb-3 flex flex-wrap gap-3 items-center">
        {isAdmin && (
          <div className="flex gap-1.5">
            <button className={`btn btn-sm ${tab === "SM" ? "btn-primary" : "btn-ghost"}`} onClick={() => setTab("SM")}>Sales Managers ({sms.length})</button>
            <button className={`btn btn-sm ${tab === "SE" ? "btn-primary" : "btn-ghost"}`} onClick={() => setTab("SE")}>Sales Executives ({ses.length})</button>
          </div>
        )}
        <div className="ms-auto flex gap-2">
          {isAdmin && (
            <button className="btn btn-ghost" disabled={smFull} title={smFull ? `Maximum of ${meta.maxSM} Sales Managers reached` : ""} onClick={() => setCreateRole("SM")}>
              <Icon name="plus" size={16} /> Add SM
            </button>
          )}
          {canAddSE && (
            <button className="btn btn-primary" disabled={isAdmin && sms.length === 0} title={isAdmin && sms.length === 0 ? "Create a Sales Manager first" : ""} onClick={() => setCreateRole("SE")}>
              <Icon name="plus" size={16} /> Add SE
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="glass p-4"><Loading /></div>
      ) : list.length === 0 ? (
        <div className="glass"><Empty title={tab === "SM" ? "No Sales Managers yet" : "No Sales Executives yet"} text="Use the Add button above to create the first account." /></div>
      ) : (
        <>
          <div className="glass overflow-hidden hidden md:block">
            <table className="tbl">
              <thead>
                <tr>
                  <th>ID</th><th>Name</th><th>Contact</th>
                  {tab === "SE" ? <><th>Under SM</th><th>Entries</th></> : <th>SEs</th>}
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p._id}>
                    <td className="font-mono text-xs font-bold">{p.userId}</td>
                    <td className="font-semibold">{p.name}</td>
                    <td className="text-xs">{p.email}<div style={{ color: "var(--muted)" }}>{p.phone || "—"}</div></td>
                    {tab === "SE" ? (
                      <>
                        <td className="text-xs"><b>{p.smUserId}</b> <span style={{ color: "var(--muted)" }}>{p.smName}</span></td>
                        <td className="text-xs tnum">{p.leadCount} total · <span style={{ color: "var(--ok)" }}>{p.approvedCount} approved</span></td>
                      </>
                    ) : (
                      <td className="tnum">{p.seCount}</td>
                    )}
                    <td><span className={`badge ${p.active ? "badge-ok" : "badge-bad"}`}>{p.active ? "Active" : "Inactive"}</span></td>
                    <td>{rowActions(p, false)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {list.map((p) => (
              <div key={p._id} className="glass p-3.5 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{p.name}</div>
                    <div className="font-mono text-[11px]" style={{ color: "var(--muted)" }}>{p.userId}</div>
                  </div>
                  <span className={`badge ${p.active ? "badge-ok" : "badge-bad"}`}>{p.active ? "Active" : "Inactive"}</span>
                </div>
                <div className="text-xs break-all" style={{ color: "var(--muted)" }}>{p.email}{p.phone ? ` · ${p.phone}` : ""}</div>
                <div className="text-xs">
                  {tab === "SE" ? (<>Under <b>{p.smUserId}</b> {p.smName} · {p.leadCount} entries ({p.approvedCount} approved)</>) : (<>{p.seCount} Sales Executive(s)</>)}
                </div>
                {rowActions(p, true)}
              </div>
            ))}
          </div>
        </>
      )}

      {createRole && (
        <CreateModal
          role={createRole}
          sms={sms}
          isAdmin={isAdmin}
          onClose={() => setCreateRole(null)}
          onCreated={(c) => {
            setCreateRole(null);
            setCreated(c);
            load();
          }}
        />
      )}

      {edit && <EditModal person={edit} isAdmin={isAdmin} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}

      <Modal open={!!created} onClose={() => setCreated(null)} title="Account created">
        {created && (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: "var(--muted)" }}>Share these login details with <b style={{ color: "var(--text)" }}>{created.name}</b>. The password is not shown again.</p>
            <div className="glass p-4 text-sm space-y-1.5" style={{ borderRadius: "0.9rem" }}>
              <div><span style={{ color: "var(--muted)" }}>ID:</span> <b className="font-mono">{created.userId}</b></div>
              <div><span style={{ color: "var(--muted)" }}>Email:</span> <b>{created.email}</b></div>
              <div><span style={{ color: "var(--muted)" }}>Password:</span> <b className="font-mono">{created.password}</b></div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                className="btn btn-ghost btn-lg"
                onClick={() => {
                  navigator.clipboard?.writeText(shareMessage(created));
                  toast.info("Copied");
                }}
              >
                <Icon name="copy" size={15} /> Copy
              </button>
              <a className="btn btn-ok btn-lg" href={whatsappUrl(created)} target="_blank" rel="noreferrer" onClick={() => toast.info("Opening WhatsApp…")}>
                Share on WhatsApp
              </a>
              <button className="btn btn-primary btn-lg" onClick={() => setCreated(null)}><Icon name="check" size={16} /> Done</button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!del}
        danger
        busy={busy}
        title="Delete this account?"
        message={del ? `${del.userId} (${del.name}) will be permanently deleted. Accounts that still have SEs or lead entries cannot be deleted — deactivate them instead.` : ""}
        confirmLabel="Delete"
        onConfirm={remove}
        onCancel={() => setDel(null)}
      />
    </div>
  );
}

type CreatedInfo = { name: string; userId: string; email: string; password: string; cnic?: string; phone?: string; whatsapp?: string };

function shareMessage(c: CreatedInfo) {
  const link = `${window.location.origin}/login`;
  return [
    "*Asaan Umra Committee*",
    `Assalam-o-Alaikum ${c.name},`,
    "Your portal account has been created. Login details:",
    "",
    `Portal: ${link}`,
    `Name: ${c.name}`,
    ...(c.cnic ? [`CNIC: ${c.cnic}`] : []),
    `Login ID: ${c.userId}`,
    ...(c.phone ? [`Number: ${c.phone}`] : []),
    `Email: ${c.email}`,
    `Password: ${c.password}`,
    "",
    "You can log in with your ID, email or phone number. Please change your password after the first login.",
  ].join("\n");
}

function whatsappUrl(c: CreatedInfo) {
  let n = (c.whatsapp || c.phone || "").replace(/\D/g, "");
  if (n.startsWith("0")) n = "92" + n.slice(1);
  return `https://wa.me/${n}?text=${encodeURIComponent(shareMessage(c))}`;
}

function CreateModal({ role, sms, isAdmin, onClose, onCreated }: {
  role: "SM" | "SE"; sms: Person[]; isAdmin: boolean; onClose: () => void;
  onCreated: (c: CreatedInfo) => void;
}) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [prof, setProf] = useState<Profile>(emptyProfile());
  const [password, setPassword] = useState("");
  const [smId, setSmId] = useState(sms[0]?._id ?? "");
  const [busy, setBusy] = useState(false);
  const strict = role === "SM";
  const missing: string[] = [];
  if (!name.trim()) missing.push("Name");
  if (!isEmailValid(email)) missing.push("valid Email");
  if (password.length < 8) missing.push("Password (8+ characters)");
  if (strict) missing.push(...missingProfile(prof));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (missing.length) return toast.warn(`Please provide: ${missing.join(", ")}`);
    setBusy(true);
    try {
      const d = await api("/api/users", { method: "POST", json: { role, name, email, password, smId, ...prof } });
      toast.ok(`${role} created: ${d.user.userId}`);
      onCreated({ name, userId: d.user.userId, email, password, cnic: prof.cnic, phone: prof.phone, whatsapp: prof.whatsappSameAsPhone ? prof.phone : prof.whatsapp });
    } catch (err) {
      toast.err(err instanceof Error ? err.message : "Could not create account");
      setBusy(false);
    }
  }

  return (
    <Modal open xl onClose={onClose} title={role === "SM" ? "Add Sales Manager (SM)" : "Add Sales Executive (SE)"}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
        {role === "SE" && isAdmin && (
          <Field label="Under Sales Manager" required>
            <select className="select" value={smId} onChange={(e) => setSmId(e.target.value)} required>
              {sms.map((s) => (<option key={s._id} value={s._id}>{s.userId} — {s.name}</option>))}
            </select>
          </Field>
        )}
          <Field label="Full name" required><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Email (login)" required error={emailError(email)}><input className="input" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value.replace(/\s/g, ""))} /></Field>
        <ProfileFields value={prof} onChange={(patch) => setProf((p) => ({ ...p, ...patch }))} required={strict} />
        <div className="sm:col-span-2"><Field label="Password" required hint="At least 8 characters. Sign in with email, ID or number.">
          <div className="flex gap-2">
            <input className="input font-mono" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" className="btn btn-ghost" onClick={() => setPassword(genPassword())}>Generate</button>
          </div>
        </Field></div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn btn-ghost btn-lg" onClick={onClose}><Icon name="x" size={16} /> Cancel</button>
          <button className="btn btn-primary btn-lg" disabled={busy || missing.length > 0}><Icon name="plus" size={16} /> {busy ? "Creating…" : "Create account"}</button>
        </div>
      </form>
    </Modal>
  );
}

function EditModal({ person, isAdmin, onClose, onSaved }: { person: Person; isAdmin: boolean; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [name, setName] = useState(person.name);
  const [email, setEmail] = useState(person.email);
  const [prof, setProf] = useState<Profile>(emptyProfile({ ...person, fatherName: person.fatherName }));
  const [password, setPassword] = useState("");
  const [active, setActive] = useState<boolean>(person.active);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (isAdmin && !isEmailValid(email)) return toast.warn("Please enter a valid email address");
    if ((prof.phone && phoneError(prof.phone)) || (!prof.whatsappSameAsPhone && prof.whatsapp && phoneError(prof.whatsapp))) return toast.warn("Please enter valid 11-digit mobile numbers");
    setBusy(true);
    try {
      const json: Record<string, any> = { name, active, ...prof };
      if (isAdmin) {
        json.email = email;
        if (password) json.password = password;
      }
      await api(`/api/users/${person._id}`, { method: "PATCH", json });
      toast.ok("Account updated");
      onSaved();
    } catch (err) {
      toast.err(err instanceof Error ? err.message : "Update failed");
      setBusy(false);
    }
  }

  return (
    <Modal open xl onClose={onClose} title={`Edit ${person.userId}`}>
      <form onSubmit={submit} className="space-y-4">
        <div className="flex items-center gap-2"><RoleBadge role={person.role} /><span className="text-xs" style={{ color: "var(--muted)" }}>ID cannot be changed</span></div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
        <Field label="Full name" required><input className="input" value={name} onChange={(e) => setName(e.target.value)} required /></Field>
        {isAdmin && <Field label="Email (login)" required error={emailError(email)}><input className="input" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value.replace(/\s/g, ""))} required /></Field>}
        <ProfileFields value={prof} onChange={(patch) => setProf((p) => ({ ...p, ...patch }))} required={person.role === "SM"} />
        {isAdmin && (
          <div className="sm:col-span-2"><Field label="Reset password" hint="Leave empty to keep the current password.">
            <div className="flex gap-2">
              <input className="input font-mono" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} placeholder="New password" />
              <button type="button" className="btn btn-ghost" onClick={() => setPassword(genPassword())}>Generate</button>
            </div>
          </Field></div>
        )}
        <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer self-end pb-2">
          <input type="checkbox" className="accent-[var(--primary)] w-4 h-4" checked={active} onChange={(e) => setActive(e.target.checked)} /> Account is active
        </label>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn btn-ghost btn-lg" onClick={onClose}><Icon name="x" size={16} /> Cancel</button>
          <button className="btn btn-primary btn-lg" disabled={busy}><Icon name="check" size={16} /> {busy ? "Saving…" : "Save changes"}</button>
        </div>
      </form>
    </Modal>
  );
}
