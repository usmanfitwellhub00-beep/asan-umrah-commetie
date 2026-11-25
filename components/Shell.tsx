"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { SessionUser } from "@/lib/auth";
import { can } from "@/lib/rights";
import { api } from "@/lib/client";
import { Icon, type IconName } from "./icons";
import { ThemeToggle } from "./ThemeToggle";
import { LangToggle } from "./LangContext";
import { Field, Modal, ToastProvider, useToast } from "./ui";
import { Avatar } from "./Avatar";
import { UserProvider } from "./UserContext";

type NavItem = { href: string; label: string; short: string; icon: IconName; show: boolean };
type Group = { key: string; label: string; icon: IconName; items: NavItem[] };

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "U";

function Initials({ name, size = 36, url, gender }: { name: string; size?: number; url?: string | null; gender?: string | null }) {
  if (url) return <Avatar url={url} name={name} size={size} />;
  if (gender === "male" || gender === "female") return <Avatar gender={gender} name={name} size={size} />;
  return (
    <div className="rounded-full flex items-center justify-center font-bold text-white shrink-0" style={{ width: size, height: size, fontSize: size * 0.36, background: "var(--primary)" }}>
      {initials(name)}
    </div>
  );
}

function ChangePassword({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next !== again) return toast.err("New passwords do not match");
    setBusy(true);
    try {
      await api("/api/auth/password", { method: "POST", json: { current: cur, next } });
      toast.ok("Password changed");
      setCur(""); setNext(""); setAgain("");
      onClose();
    } catch (err) {
      toast.err(err instanceof Error ? err.message : "Could not change password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Change password">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Current password" required><input className="input" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} required /></Field>
        <Field label="New password" required hint="At least 8 characters"><input className="input" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} minLength={8} required /></Field>
        <Field label="Confirm new password" required><input className="input" type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} minLength={8} required /></Field>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost btn-lg" onClick={onClose}><Icon name="x" size={16} /> Cancel</button>
          <button className="btn btn-primary btn-lg" disabled={busy}><Icon name="check" size={16} /> {busy ? "Saving…" : "Update password"}</button>
        </div>
      </form>
    </Modal>
  );
}

function ShellInner({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const isAdmin = user.role === "admin";
  const roleLabel = isAdmin ? "Admin" : user.role === "SM" ? "Sales Manager" : "Sales Executive";

  const [q, setQ] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [pwOpen, setPwOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const dashboard: NavItem = { href: "/dashboard", label: "Dashboard", short: "Home", icon: "dashboard", show: true };
  const groups: Group[] = [
    {
      key: "sales", label: "Sales", icon: "leads",
      items: [
        { href: "/leads", label: isAdmin ? "All Leads" : user.role === "SM" ? "Team Leads" : "My Entries", short: "Leads", icon: "leads", show: isAdmin || user.role === "SE" || can(user, "viewTeamLeads") },
        { href: "/leads/new", label: "Add Entry", short: "Add", icon: "plus", show: user.role === "SE" && can(user, "addLeads") },
      ],
    },
    { key: "team", label: "Team", icon: "users", items: [
      { href: "/persons", label: isAdmin ? "Persons Management" : "My Team", short: "Team", icon: "users", show: isAdmin || user.role === "SM" },
      { href: "/hierarchy", label: "Hierarchy", short: "Hierarchy", icon: "users", show: isAdmin || user.role === "SM" },
    ] },
    { key: "finance", label: "Finance", icon: "wallet", items: [{ href: "/commission", label: isAdmin ? "Commission Management" : "Commission", short: "Commission", icon: "percent", show: isAdmin || can(user, "viewCommission") }] },
    { key: "account", label: "Account", icon: "users", items: [
      { href: "/profile", label: "My Profile", short: "Profile", icon: "users", show: true },
    ] },
    { key: "admin", label: "Admin", icon: "shield", items: [
      { href: "/rights", label: "Rights Management", short: "Rights", icon: "shield", show: isAdmin },
    ] },
  ]
    .map((g) => ({ ...g, items: g.items.filter((i) => i.show) }))
    .filter((g) => g.items.length > 0);

  const flat = [dashboard, ...groups.flatMap((g) => g.items)];
  const current = flat.find((i) => i.href === pathname);

  const term = q.trim().toLowerCase();
  const match = (i: NavItem) => !term || i.label.toLowerCase().includes(term);
  const shownGroups = groups.map((g) => ({ ...g, items: g.items.filter(match) })).filter((g) => g.items.length > 0);

  function logout() {
    // clear the cookie, then hard-navigate (one request, resets all client state)
    fetch("/api/auth/logout", { method: "POST", keepalive: true }).finally(() => window.location.replace("/login"));
  }

  function copyId() {
    navigator.clipboard?.writeText(user.userId);
    toast.info("ID copied");
  }

  return (
    <div className="min-h-screen">
      {/* ================= Sidebar ================= */}
      <aside className="hidden lg:flex fixed inset-y-0 start-0 z-40 w-72 flex-col" style={{ background: "var(--side-bg)", borderInlineEnd: "1px solid var(--border)" }}>
        <div className="flex h-[72px] shrink-0 items-center gap-3 px-5" style={{ borderBottom: "1px solid var(--border)" }}>
          <img src="/logo.png" alt="Asaan Umra Committee" width={44} height={44} className="rounded-xl shrink-0" style={{ width: 44, height: 44 }} />
          <div className="leading-tight min-w-0">
            <div className="font-bold text-[17px] truncate">Asaan Umra Committee</div>
            <div className="text-[12px]" style={{ color: "var(--side-muted)" }}>{roleLabel}</div>
          </div>
        </div>

        <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="relative">
            <span className="absolute start-3 top-1/2 -translate-y-1/2" style={{ color: "var(--side-muted)" }}><Icon name="search" size={16} /></span>
            <input className="input" style={{ paddingInlineStart: "2.2rem" }} placeholder="Search menu…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>

        <nav className="side-scroll flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3 flex flex-col gap-1">
          {match(dashboard) && (
            <Link href={dashboard.href} className={`nav-item ${pathname === dashboard.href ? "active" : ""}`}>
              <Icon name={dashboard.icon} size={19} /> {dashboard.label}
            </Link>
          )}

          {shownGroups.map((g) => {
            const open = term ? true : !collapsed[g.key];
            return (
              <div key={g.key}>
                <button type="button" className="nav-item nav-group" onClick={() => setCollapsed((c) => ({ ...c, [g.key]: !c[g.key] }))} aria-expanded={open}>
                  <Icon name={g.icon} size={18} />
                  <span className="flex-1">{g.label}</span>
                  <span className={`transition-transform ${open ? "" : "-rotate-90 rtl:rotate-90"}`} style={{ color: "var(--side-muted)" }}><Icon name="chevron" size={16} /></span>
                </button>
                {open && (
                  <div className="nav-sub">
                    {g.items.map((i) => (
                      <Link key={i.href} href={i.href} className={`nav-item ${pathname === i.href ? "active" : ""}`}>
                        <Icon name={i.icon} size={18} /> {i.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {term && !match(dashboard) && shownGroups.length === 0 && (
            <div className="px-3 py-4 text-sm" style={{ color: "var(--side-muted)" }}>No menu items match “{q}”.</div>
          )}
        </nav>

        <div className="shrink-0 p-4 space-y-3" style={{ borderTop: "1px solid var(--border)" }}>
          <div role="link" tabIndex={0} title="Open my profile" onClick={() => router.push("/profile")} onKeyDown={(e) => { if (e.key === "Enter") router.push("/profile"); }} className="rounded-xl p-3 cursor-pointer transition hover:brightness-95 hover:shadow-sm" style={{ background: "var(--primary-soft)", outline: pathname === "/profile" ? "2px solid var(--primary)" : "none" }}>
            <div className="text-[11px]" style={{ color: "var(--side-muted)" }}>Signed in as</div>
            <div className="flex items-center gap-3 mt-1.5">
              <Initials name={user.name} size={40} url={user.pictureUrl} gender={user.gender} />
              <div className="min-w-0 flex-1 leading-tight">
                <div className="font-bold truncate">{user.name}</div>
                <div className="flex items-center gap-1.5 text-[12px] mt-0.5" style={{ color: "var(--side-muted)" }}>
                  <span className="truncate">ID: <b className="font-mono" style={{ color: "var(--side-text)" }}>{user.userId}</b></span>
                  <button type="button" onClick={(e) => { e.stopPropagation(); copyId(); }} aria-label="Copy ID" title="Copy ID" className="shrink-0 hover:opacity-70"><Icon name="copy" size={13} /></button>
                </div>
              </div>
            </div>
          </div>
          <button className="btn btn-danger w-full py-2.5" onClick={logout}><Icon name="logout" size={16} /> Logout</button>
        </div>
      </aside>

      {/* ================= Main ================= */}
      <div className="lg:ps-72 flex flex-col min-h-screen min-w-0">
        <header className="sticky top-0 z-30 h-14 sm:h-[72px] flex items-center gap-3 px-4 sm:px-6 lg:px-8 backdrop-blur-md" style={{ background: "var(--surface-strong)", borderBottom: "1px solid var(--border)" }}>
          {/* mobile: logo + page title */}
          <img src="/logo.png" alt="Asaan Umra Committee" width={34} height={34} className="lg:hidden rounded-lg shrink-0" style={{ width: 34, height: 34 }} />
          <div className="lg:hidden font-semibold truncate">{current?.label ?? "Portal"}</div>

          {/* desktop: Reports to */}
          <div className="hidden lg:block min-w-0 leading-tight">
            {user.reportsTo ? (
              <>
                <div className="flex items-center gap-2 text-[13px]" style={{ color: "var(--muted)" }}>
                  Reports to <span className="badge badge-info">{user.reportsTo.role === "admin" ? "ADMIN" : user.reportsTo.role}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 min-w-0">
                  <Initials name={user.reportsTo.name} size={26} url={user.reportsTo.pictureUrl} gender={user.reportsTo.gender} />
                  <span className="font-semibold truncate">{user.reportsTo.name} <span className="font-mono text-xs font-normal" style={{ color: "var(--muted)" }}>{user.reportsTo.userId}</span></span>
                </div>
              </>
            ) : (
              <>
                <div className="text-[13px]" style={{ color: "var(--muted)" }}>Role</div>
                <div className="flex items-center gap-2 mt-0.5"><span className="badge badge-info">ADMIN</span><span className="font-semibold">Full access panel</span></div>
              </>
            )}
          </div>

          {/* right actions */}
          <div className="ms-auto flex items-center gap-2">
            <button className="btn btn-ghost" onClick={() => setPwOpen(true)} title="Change password">
              <Icon name="key" size={16} /> <span className="hidden xl:inline">Change Password</span>
            </button>
            <LangToggle />
            <ThemeToggle />
            <button className="btn btn-danger" onClick={logout} title="Logout">
              <Icon name="logout" size={16} /> <span className="hidden sm:inline">Logout</span>
            </button>
            <div className="relative ms-1">
              <button type="button" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)} title="Account menu" className="flex items-center gap-2.5 rounded-full py-1 ps-1 pe-2 md:pe-3 cursor-pointer transition hover:shadow-sm" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
                <Initials name={user.name} size={34} url={user.pictureUrl} gender={user.gender} />
                <div className="hidden md:block leading-tight max-w-44 text-start">
                  <div className="text-sm font-semibold truncate">{user.name}</div>
                  <div className="text-[11px]" style={{ color: "var(--muted)" }}>{roleLabel}</div>
                </div>
                <span className="transition-transform" style={{ transform: menuOpen ? "rotate(180deg)" : "none", color: "var(--muted)" }}><Icon name="chevron" size={16} /></span>
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div role="menu" className="absolute end-0 top-full mt-2 z-50 w-56 rounded-xl p-1.5 shadow-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <Link href="/profile" role="menuitem" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-[var(--primary-soft)]">
                      <Icon name="users" size={16} /> My Profile
                    </Link>
                    <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); setPwOpen(true); }} className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-[var(--primary-soft)] text-start">
                      <Icon name="key" size={16} /> Change Password
                    </button>
                    <button type="button" role="menuitem" onClick={logout} className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-start hover:bg-[var(--primary-soft)]" style={{ color: "var(--danger, #dc2626)" }}>
                      <Icon name="logout" size={16} /> Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-5 sm:py-6 pb-28 lg:pb-8">{children}</main>
      </div>

      {/* ================= Mobile bottom navigation ================= */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 px-2 pt-2" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }} aria-label="Main">
        <div className="glass glass-strong grid" style={{ gridTemplateColumns: `repeat(${flat.filter((i) => i.href !== "/profile").length}, minmax(0, 1fr))` }}>
          {flat.filter((i) => i.href !== "/profile").map((i) => (
            <Link key={i.href} href={i.href} className={`tab-item ${pathname === i.href ? "active" : ""}`}>
              <Icon name={i.icon} size={20} />
              <span className="truncate max-w-full">{i.short}</span>
            </Link>
          ))}
        </div>
      </nav>

      <ChangePassword open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  );
}

export function Shell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return (
    <UserProvider user={user}>
      <ToastProvider>
        <ShellInner user={user}>{children}</ShellInner>
      </ToastProvider>
    </UserProvider>
  );
}
