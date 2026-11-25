"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/icons";
import { Loading, PageInfo, RoleBadge, useToast } from "@/components/ui";
import { useUser } from "@/components/UserContext";
import { api, dateFmt } from "@/lib/client";

type Profile = {
  userId: string; role: string; name: string; email: string; phone: string; fatherName: string; gender: string;
  cnic: string; whatsapp: string; address: string; pictureUrl: string; createdAt?: string;
};

export default function ProfilePage() {
  const user = useUser();
  const toast = useToast();
  const router = useRouter();
  const [p, setP] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  const isSE = user.role === "SE";

  useEffect(() => {
    api("/api/profile").then((r) => setP(r.profile)).catch((e) => toast.err(e.message));
  }, [toast]);

  async function pick(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return toast.err("Only JPG, PNG or WebP images are allowed");
    if (file.size > 5 * 1024 * 1024) return toast.err("Image must be 5 MB or smaller");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", "picture");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Upload failed");
      await api("/api/profile", { method: "PATCH", json: { pictureUrl: data.url, picturePublicId: data.publicId } });
      setP((s) => (s ? { ...s, pictureUrl: data.url } : s));
      toast.ok("Profile picture updated");
      router.refresh();
    } catch (e) {
      toast.err(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  if (!p) return <Loading />;

  const rows: [string, string][] = [
    ["User ID", p.userId],
    ["Email", p.email],
    ["Mobile number", p.phone],
    ["WhatsApp", p.whatsapp],
    [p.gender === "female" ? "Father / Husband name" : "Father name", p.fatherName],
    ["Gender", p.gender ? p.gender[0].toUpperCase() + p.gender.slice(1) : ""],
    ["CNIC", p.cnic],
    ["Address", p.address],
    ["Joined", p.createdAt ? dateFmt(p.createdAt) : ""],
  ];
  if (user.reportsTo) rows.splice(1, 0, ["Reports to", `${user.reportsTo.name} (${user.reportsTo.userId})`]);

  return (
    <div className="max-w-3xl">
      <PageInfo
        title="My Profile"
        subtitle="Your account details."
        structure={["Top: your picture, name and role", isSE ? "You can upload or replace your picture" : "Details are read-only", "Below: your account details"]}
      />
      <div className="glass p-4 sm:p-6">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="relative shrink-0">
            <Avatar url={p.pictureUrl} gender={p.gender} name={p.name} size={96} />
            {busy && <span className="absolute inset-0 rounded-full flex items-center justify-center text-[11px] font-bold bg-black/50 text-white">Uploading…</span>}
          </div>
          <div className="min-w-0">
            <div className="text-lg sm:text-xl font-bold truncate">{p.name}</div>
            <div className="mt-1"><RoleBadge role={p.role as any} /></div>
            {isSE && (
              <label className={`btn btn-primary btn-sm mt-3 w-fit cursor-pointer ${busy ? "opacity-60 pointer-events-none" : ""}`}>
                <Icon name="upload" size={15} /> {p.pictureUrl ? "Change picture" : "Upload picture"}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={busy} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
              </label>
            )}
          </div>
        </div>

        <dl className="mt-6 grid gap-x-6 gap-y-4 sm:grid-cols-2">
          {rows.map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-[12px] font-semibold" style={{ color: "var(--muted)" }}>{k}</dt>
              <dd className="mt-0.5 font-medium break-words">{v || "—"}</dd>
            </div>
          ))}
        </dl>
        {isSE && <p className="mt-5 text-xs" style={{ color: "var(--muted)" }}>Only your picture can be changed here. Ask your Sales Manager or the admin to update other details.</p>}
      </div>
    </div>
  );
}
