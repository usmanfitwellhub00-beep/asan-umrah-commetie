"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LangToggle } from "@/components/LangContext";
import { Spinner } from "@/components/ui";
import { api } from "@/lib/client";

export default function LoginPage() {
  const pathname = usePathname();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // page can be re-shown from the router cache with old state: always start clean
  useEffect(() => {
    if (pathname === "/login") {
      setBusy(false);
      setPassword("");
      setError("");
    }
  }, [pathname]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api("/api/auth/login", { method: "POST", json: { identifier, password } });
      // full page load: guarantees the new session cookie is sent and no cached "redirect to /login" is reused
      window.location.assign("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="fixed top-4 end-4 flex items-center gap-1">
        <LangToggle />
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex mb-3">
            <img src="/logo.png" alt="Asaan Umra Committee" width={96} height={96} className="rounded-3xl shadow-lg" style={{ width: 96, height: 96 }} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Asaan Umra Committee</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>Sign in to your portal</p>
        </div>

        <form onSubmit={submit} className="glass glass-strong p-5 sm:p-6 space-y-4">
          <div>
            <label className="label" htmlFor="identifier">Email, ID or number</label>
            <input id="identifier" className="input" placeholder="Email, SM-0001 or 03XX XXXXXXX" autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <div className="relative">
              <input id="password" className="input pe-16" type={show ? "text" : "password"} placeholder="••••••••" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button type="button" className="absolute end-2 top-1/2 -translate-y-1/2 text-xs font-semibold px-2 py-1 rounded-lg" style={{ color: "var(--primary-2)" }} onClick={() => setShow((s) => !s)}>
                {show ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error && (
            <div className="badge badge-bad w-full justify-start text-[13px] font-medium py-2 px-3 whitespace-normal" role="alert" style={{ borderRadius: "0.75rem" }}>
              {error}
            </div>
          )}

          <button className="btn btn-primary w-full py-3" disabled={busy}>
            {busy ? <><Spinner /> Signing in…</> : "Sign in"}
          </button>
        </form>

        <p className="text-center text-xs mt-4" style={{ color: "var(--muted)" }}>
          Admins, Sales Managers (SM) and Sales Executives (SE) sign in here.
        </p>
      </div>
    </div>
  );
}
