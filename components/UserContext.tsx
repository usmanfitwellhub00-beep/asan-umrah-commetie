"use client";

import { createContext, useContext } from "react";
import type { SessionUser } from "@/lib/auth";

const Ctx = createContext<SessionUser | null>(null);

export function UserProvider({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return <Ctx.Provider value={user}>{children}</Ctx.Provider>;
}

export function useUser() {
  const u = useContext(Ctx);
  if (!u) throw new Error("useUser must be used inside <UserProvider>");
  return u;
}
