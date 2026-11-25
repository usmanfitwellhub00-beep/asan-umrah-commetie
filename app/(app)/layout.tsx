import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Shell } from "@/components/Shell";

async function AuthGate({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return <Shell user={user}>{children}</Shell>;
}

function Loader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="glass px-6 py-4 text-sm" style={{ color: "var(--muted)" }}>Loading portal…</div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<Loader />}>
      <AuthGate>{children}</AuthGate>
    </Suspense>
  );
}
