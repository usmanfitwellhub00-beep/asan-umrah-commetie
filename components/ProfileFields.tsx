"use client";

import { Avatar } from "./Avatar";
import { ImageUpload } from "./ImageUpload";
import { cleanPhone, phoneError } from "@/lib/validate-shared";
import { Field } from "./ui";

export type Profile = {
  fatherName: string; gender: string; cnic: string; phone: string; whatsapp: string; whatsappSameAsPhone: boolean;
  address: string; pictureUrl: string; picturePublicId: string;
};

export const emptyProfile = (p?: Partial<Profile>): Profile => ({
  fatherName: p?.fatherName ?? "", gender: p?.gender ?? "", cnic: p?.cnic ?? "", phone: p?.phone ?? "",
  whatsapp: p?.whatsapp ?? "", whatsappSameAsPhone: p?.whatsappSameAsPhone ?? false,
  address: p?.address ?? "", pictureUrl: p?.pictureUrl ?? "", picturePublicId: p?.picturePublicId ?? "",
});

const fmtCnic = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 13);
  return [d.slice(0, 5), d.slice(5, 12), d.slice(12)].filter(Boolean).join("-");
};

export const fatherLabelFor = (gender: string) => (gender === "female" ? "Father / Husband name" : "Father / Guardian name");

/** Names of mandatory profile fields that are still empty/invalid. */
export function missingProfile(p: Profile): string[] {
  const m: string[] = [];
  if (!p.fatherName.trim()) m.push(fatherLabelFor(p.gender));
  if (!p.gender) m.push("Gender");
  if (p.cnic.replace(/\D/g, "").length !== 13) m.push("valid 13-digit CNIC");
  if (!p.phone || phoneError(p.phone)) m.push("valid Phone number");
  if (!p.whatsappSameAsPhone && (!p.whatsapp || phoneError(p.whatsapp))) m.push("valid WhatsApp number");
  if (!p.address.trim()) m.push("Address");
  return m;
}

export function ProfileFields({ value, onChange, required }: { value: Profile; onChange: (patch: Partial<Profile>) => void; required?: boolean }) {
  const v = value;
  return (
    <>
      <Field label={fatherLabelFor(v.gender)} required={required}>
        <input className="input" value={v.fatherName} onChange={(e) => onChange({ fatherName: e.target.value })} />
      </Field>
      <Field label="Gender" required={required}>
        <div className="grid grid-cols-2 gap-2">
          {(["male", "female"] as const).map((g) => (
            <button type="button" key={g} aria-pressed={v.gender === g} onClick={() => onChange({ gender: g })} className={`btn justify-start ${v.gender === g ? "btn-primary" : "btn-ghost"}`}>
              <Avatar gender={g} size={22} /> {g === "male" ? "Male" : "Female"}
            </button>
          ))}
        </div>
      </Field>
      <Field label="CNIC" required={required}>
        <input className="input" inputMode="numeric" value={v.cnic} onChange={(e) => onChange({ cnic: fmtCnic(e.target.value) })} placeholder="12345-1234567-1" />
      </Field>
      <Field label="Phone number" required={required} error={phoneError(v.phone)}>
        <input className="input" inputMode="numeric" maxLength={14} value={v.phone} onChange={(e) => onChange({ phone: cleanPhone(e.target.value) })} placeholder="03XXXXXXXXX" />
      </Field>
      <Field label="WhatsApp number" required={required} error={v.whatsappSameAsPhone ? "" : phoneError(v.whatsapp)}>
        <input className="input" inputMode="numeric" maxLength={14} value={v.whatsappSameAsPhone ? v.phone : v.whatsapp} onChange={(e) => onChange({ whatsapp: cleanPhone(e.target.value) })} disabled={v.whatsappSameAsPhone} placeholder="03XXXXXXXXX" />
        <label className="mt-1.5 flex items-center gap-2 text-xs font-semibold cursor-pointer select-none" style={{ color: "var(--muted)" }}>
          <input type="checkbox" className="accent-[var(--primary)] w-4 h-4" checked={v.whatsappSameAsPhone} onChange={(e) => onChange({ whatsappSameAsPhone: e.target.checked })} />
          Same as phone number
        </label>
      </Field>
      <ImageUpload
        compact label="Person picture" kind="picture" hint="Passport size photo · JPG, PNG or WebP"
        value={v.pictureUrl ? { url: v.pictureUrl, publicId: v.picturePublicId } : null}
        onChange={(u) => onChange({ pictureUrl: u?.url ?? "", picturePublicId: u?.publicId ?? "" })}
      />
      <div className="sm:col-span-2">
        <Field label="Address" required={required}>
          <textarea className="textarea" rows={2} value={v.address} onChange={(e) => onChange({ address: e.target.value })} placeholder="House, street, city" />
        </Field>
      </div>
    </>
  );
}
