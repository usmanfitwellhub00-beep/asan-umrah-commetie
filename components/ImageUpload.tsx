"use client";

import { useState } from "react";
import { Icon } from "./icons";
import { useToast } from "./ui";

export type Uploaded = { url: string; publicId: string };

export function ImageUpload({ label, kind, value, onChange, required, hint, compact }: {
  label: string;
  kind: "screenshot" | "picture";
  value: Uploaded | null;
  onChange: (v: Uploaded | null) => void;
  required?: boolean;
  hint?: string;
  compact?: boolean;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function pick(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return toast.err("Only JPG, PNG or WebP images are allowed");
    if (file.size > 5 * 1024 * 1024) return toast.err("Image must be 5 MB or smaller");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", kind);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Upload failed");
      onChange({ url: data.url, publicId: data.publicId });
      toast.ok(kind === "picture" ? "Picture uploaded" : "Payment screenshot uploaded");
    } catch (e) {
      toast.err(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label className="label">
        {label}
        {required ? <span className="req"> *</span> : <span style={{ color: "var(--muted)" }}> (optional)</span>}
      </label>

      <div className="flex items-center gap-3">
        <label
          className="relative shrink-0 rounded-xl overflow-hidden flex items-center justify-center cursor-pointer transition-colors hover:border-[var(--primary)]"
          style={{ width: compact ? 78 : 96, height: compact ? 100 : 124, border: value?.url ? "1px solid var(--border)" : "1.5px dashed var(--border)", background: "var(--input-bg)" }}
          title={value?.url ? "Replace" : "Click to upload image"}
        >
          {value?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value.url} alt={label} className="h-full w-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-1 text-center px-1" style={{ color: "var(--primary-2)" }}>
              <Icon name="upload" size={20} />
              <span className="text-[10px] font-semibold leading-tight">{busy ? "Uploading…" : "Upload"}</span>
            </span>
          )}
          {busy && <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold bg-black/45 text-white">Uploading…</span>}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={busy} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        <div className="min-w-0 text-xs space-y-1">
          {value?.url ? (
            <>
              <div className="flex items-center gap-1 font-semibold" style={{ color: "var(--ok)" }}><Icon name="check" size={13} /> Uploaded</div>
              <label className="btn btn-ghost btn-sm cursor-pointer w-fit">
                Replace
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={busy} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
              </label>
            </>
          ) : (
            <div style={{ color: "var(--muted)" }}>{hint ?? "JPG, PNG or WebP · max 5 MB"}</div>
          )}
        </div>
      </div>
    </div>
  );
}
