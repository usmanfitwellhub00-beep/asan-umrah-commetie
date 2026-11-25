import { ApiError } from "./api";
import { isEmail, normCnic, normPhone } from "./validators";

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function isCloudinaryUrl(u: string) {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  return !!cloud && u.startsWith(`https://res.cloudinary.com/${cloud}/`);
}

/** Validates the profile fields of an SM / SE. `strict` = all personal fields are mandatory (picture is always optional). */
export function parseProfile(body: Record<string, any>, strict: boolean, partial = false) {
  const out: Record<string, any> = {};
  const has = (k: string) => !partial || body[k] !== undefined;

  if (has("fatherName")) {
    const v = str(body.fatherName);
    if (strict && !v) throw new ApiError(400, "Father/Guardian name is required");
    out.fatherName = v;
  }
  if (has("gender")) {
    const g = str(body.gender).toLowerCase();
    if (strict && g !== "male" && g !== "female") throw new ApiError(400, "Select gender (male or female)");
    if (g && g !== "male" && g !== "female") throw new ApiError(400, "Select gender (male or female)");
    out.gender = g;
  }
  if (has("cnic")) {
    const raw = str(body.cnic);
    if (raw || strict) {
      const c = normCnic(raw);
      if (!c) throw new ApiError(400, "CNIC must be 13 digits (e.g. 12345-1234567-1)");
      out.cnic = c;
    } else out.cnic = "";
  }
  if (has("address")) {
    const v = str(body.address);
    if (strict && !v) throw new ApiError(400, "Address is required");
    out.address = v;
  }
  if (has("phone")) {
    const raw = str(body.phone);
    if (raw || strict) {
      const p = normPhone(raw);
      if (!p) throw new ApiError(400, "Enter a valid mobile number (11 digits, e.g. 03XXXXXXXXX)");
      out.phone = p;
    } else out.phone = "";
  }
  if (has("whatsapp") || body.whatsappSameAsPhone !== undefined) {
    const same = !!body.whatsappSameAsPhone;
    out.whatsappSameAsPhone = same;
    if (same) out.whatsapp = out.phone ?? normPhone(str(body.phone)) ?? "";
    else {
      const raw = str(body.whatsapp);
      if (raw || strict) {
        const w = normPhone(raw);
        if (!w) throw new ApiError(400, "Enter a valid WhatsApp number (11 digits, e.g. 03XXXXXXXXX)");
        out.whatsapp = w;
      } else out.whatsapp = "";
    }
  }
  if (body.pictureUrl !== undefined) {
    const u = str(body.pictureUrl);
    if (u && !isCloudinaryUrl(u)) throw new ApiError(400, "Picture must be uploaded first");
    out.pictureUrl = u;
    out.picturePublicId = u ? str(body.picturePublicId) : "";
  }
  void isEmail;
  return out;
}
