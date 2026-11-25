"use client";

import { useState } from "react";
import { Field, useToast } from "./ui";
import { Icon } from "./icons";
import { cleanPhone, emailError, isEmailValid, phoneError } from "@/lib/validate-shared";
import { Avatar } from "./Avatar";
import { PaymentSelect } from "./PaymentSelect";
import { ImageUpload, type Uploaded } from "./ImageUpload";

const fmtCnic = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 13);
  return [d.slice(0, 5), d.slice(5, 12), d.slice(12)].filter(Boolean).join("-");
};

export type LeadFormInitial = Partial<{
  name: string; fatherHusbandName: string; cnic: string; email: string; phone: string; whatsapp: string;
  whatsappSameAsPhone: boolean; address: string; amount: number; paymentPlatform: string;
  paymentScreenshotUrl: string; paymentScreenshotPublicId: string; pictureUrl: string; picturePublicId: string; paymentStatus: string; gender: string;
}>;

export function LeadForm({ initial, defaultAmount = 5000, amountEditable, showStatus, submitLabel, busy, onSubmit, onCancel, wide }: {
  initial?: LeadFormInitial;
  defaultAmount?: number;
  amountEditable?: boolean;
  showStatus?: boolean;
  submitLabel: string;
  busy?: boolean;
  onSubmit: (payload: Record<string, any>) => void;
  onCancel?: () => void;
  wide?: boolean;
}) {
  const grid = wide ? "grid md:grid-cols-2 xl:grid-cols-4 gap-x-4 gap-y-3" : "grid md:grid-cols-2 gap-x-4 gap-y-3";
  const toast = useToast();
  const [name, setName] = useState(initial?.name ?? "");
  const [father, setFather] = useState(initial?.fatherHusbandName ?? "");
  const [gender, setGender] = useState(initial?.gender ?? "");
  const fatherLabel = gender === "female" ? "Father / Husband name" : "Father / Guardian name";
  const [cnic, setCnic] = useState(initial?.cnic ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [whatsapp, setWhatsapp] = useState(initial?.whatsapp ?? "");
  const [same, setSame] = useState(initial?.whatsappSameAsPhone ?? false);
  const [address, setAddress] = useState(initial?.address ?? "");
  const [amount, setAmount] = useState(String(initial?.amount ?? defaultAmount));
  const [platform, setPlatform] = useState(initial?.paymentPlatform ?? "");
  const [shot, setShot] = useState<Uploaded | null>(initial?.paymentScreenshotUrl ? { url: initial.paymentScreenshotUrl, publicId: initial.paymentScreenshotPublicId ?? "" } : null);
  const [pic, setPic] = useState<Uploaded | null>(initial?.pictureUrl ? { url: initial.pictureUrl, publicId: initial.picturePublicId ?? "" } : null);
  const [status, setStatus] = useState(initial?.paymentStatus ?? "pending");

  const missing: string[] = [];
  if (!name.trim()) missing.push("Name");
  if (!father.trim()) missing.push(fatherLabel);
  if (!gender) missing.push("Gender");
  if (cnic.replace(/\D/g, "").length !== 13) missing.push("valid 13-digit CNIC");
  if (!isEmailValid(email)) missing.push("valid Email");
  if (phoneError(phone) || !phone) missing.push("valid Phone number");
  if (!same && (phoneError(whatsapp) || !whatsapp)) missing.push("valid WhatsApp number");
  if (!address.trim()) missing.push("Address");
  if (!platform) missing.push("Payment platform");
  if (!shot) missing.push("Payment screenshot");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (missing.length) return toast.warn(`Please provide: ${missing.join(", ")}`);
    onSubmit({
      name, fatherHusbandName: father, gender, cnic, email, phone,
      whatsapp: same ? phone : whatsapp, whatsappSameAsPhone: same,
      address, paymentPlatform: platform,
      paymentScreenshotUrl: shot!.url, paymentScreenshotPublicId: shot!.publicId,
      pictureUrl: pic?.url ?? "", picturePublicId: pic?.publicId ?? "",
      ...(amountEditable ? { amount: Number(amount) } : {}),
      ...(showStatus ? { paymentStatus: status } : {}),
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className={grid}>
        <Field label="Full name" required><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="As on CNIC" /></Field>
        <Field label={fatherLabel} required><input className="input" value={father} onChange={(e) => setFather(e.target.value)} /></Field>
        <Field label="Gender" required>
          <div className="grid grid-cols-2 gap-2">
            {(["male", "female"] as const).map((g) => (
              <button type="button" key={g} aria-pressed={gender === g} onClick={() => setGender(g)} className={`btn justify-start ${gender === g ? "btn-primary" : "btn-ghost"}`}>
                <Avatar gender={g} size={22} /> {g === "male" ? "Male" : "Female"}
              </button>
            ))}
          </div>
        </Field>
        <Field label="CNIC" required><input className="input" inputMode="numeric" value={cnic} onChange={(e) => setCnic(fmtCnic(e.target.value))} placeholder="12345-1234567-1" /></Field>

        <Field label="Email" required error={emailError(email)}><input className="input" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value.replace(/\s/g, ""))} placeholder="name@example.com" /></Field>
        <Field label="Phone number" required error={phoneError(phone)}><input className="input" inputMode="numeric" maxLength={14} value={phone} onChange={(e) => setPhone(cleanPhone(e.target.value))} placeholder="03XXXXXXXXX" /></Field>
        <Field label="WhatsApp number" required error={same ? "" : phoneError(whatsapp)}>
          <input className="input" inputMode="numeric" maxLength={14} value={same ? phone : whatsapp} onChange={(e) => setWhatsapp(cleanPhone(e.target.value))} disabled={same} placeholder="03XXXXXXXXX" />
          <label className="mt-1.5 flex items-center gap-2 text-xs font-semibold cursor-pointer select-none" style={{ color: "var(--muted)" }}>
            <input type="checkbox" className="accent-[var(--primary)] w-4 h-4" checked={same} onChange={(e) => setSame(e.target.checked)} />
            Same as phone number
          </label>
        </Field>
        <Field label="Payment amount (Rs)">
          <input className="input" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} readOnly={!amountEditable} />
        </Field>

        <Field label="Payment platform" required><PaymentSelect value={platform} onChange={setPlatform} /></Field>
        <div className="md:col-span-2">
          <Field label="Address" required><textarea className="textarea" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House, street, city" /></Field>
        </div>
        {showStatus ? (
          <Field label="Payment status">
            <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </Field>
        ) : <div className="hidden xl:block" />}

        <ImageUpload compact label="Person picture" kind="picture" value={pic} onChange={setPic} hint="Passport size photo · JPG, PNG or WebP" />
        <ImageUpload compact label="Payment screenshot" kind="screenshot" value={shot} onChange={setShot} required hint="Clear transfer screenshot · JPG, PNG or WebP" />
        <div className="md:col-span-2 flex items-end justify-end gap-2">
          {missing.length > 0 && <span className="hidden xl:block text-[11px] me-auto self-end pb-3" style={{ color: "var(--muted)" }}>Required: {missing.join(", ")}</span>}
          {onCancel && <button type="button" className="btn btn-ghost btn-lg" onClick={onCancel}><Icon name="x" size={16} /> Cancel</button>}
          <button className="btn btn-primary btn-lg" disabled={busy || missing.length > 0}><Icon name="check" size={16} /> {busy ? "Saving…" : submitLabel}</button>
        </div>
      </div>
    </form>
  );
}
