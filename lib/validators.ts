import { ApiError } from "./api";
import { PLATFORM_IDS } from "./payment-platforms";

import { cleanPhone, isPhone, isEmailValid } from "./validate-shared";

export const isEmail = (v: string) => isEmailValid(v);

export function normCnic(v: string) {
  const d = v.replace(/\D/g, "");
  return d.length === 13 ? `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}` : null;
}

export function normPhone(v: string) {
  const d = cleanPhone(v);
  return isPhone(d) ? d : null;
}

function isCloudinaryUrl(u: string) {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  return !!cloud && u.startsWith(`https://res.cloudinary.com/${cloud}/`);
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Validates lead input. partial=true (admin edit) only validates the fields that are present. */
export function parseLeadInput(body: Record<string, any>, partial = false) {
  const out: Record<string, any> = {};
  const need = (key: string, label: string) => {
    if (partial && body[key] === undefined) return false;
    if (!str(body[key])) throw new ApiError(400, `${label} is required`);
    return true;
  };

  if (need("name", "Name")) out.name = str(body.name);
  if (need("fatherHusbandName", "Father/Husband name")) out.fatherHusbandName = str(body.fatherHusbandName);
  if (need("address", "Address")) out.address = str(body.address);

  if (need("cnic", "CNIC")) {
    const c = normCnic(str(body.cnic));
    if (!c) throw new ApiError(400, "CNIC must be 13 digits (e.g. 12345-1234567-1)");
    out.cnic = c;
  }
  if (!partial || body.email !== undefined) {
    const e = str(body.email).toLowerCase();
    if (!isEmail(e)) throw new ApiError(400, "Enter a valid email address");
    out.email = e;
  }
  if (need("gender", "Gender")) {
    const g = str(body.gender).toLowerCase();
    if (g !== "male" && g !== "female") throw new ApiError(400, "Select gender (male or female)");
    out.gender = g;
  }
  if (need("phone", "Phone number")) {
    const p = normPhone(str(body.phone));
    if (!p) throw new ApiError(400, "Enter a valid mobile number (11 digits, e.g. 03XXXXXXXXX)");
    out.phone = p;
  }
  if (!partial || body.whatsapp !== undefined || body.whatsappSameAsPhone !== undefined) {
    const same = !!body.whatsappSameAsPhone;
    out.whatsappSameAsPhone = same;
    if (same) {
      const p = out.phone ?? normPhone(str(body.phone));
      if (!p) throw new ApiError(400, "Enter a valid mobile number (11 digits, e.g. 03XXXXXXXXX)");
      out.whatsapp = p;
    } else {
      if (!str(body.whatsapp)) throw new ApiError(400, "WhatsApp number is required");
      const w = normPhone(str(body.whatsapp));
      if (!w) throw new ApiError(400, "Enter a valid WhatsApp number (11 digits, e.g. 03XXXXXXXXX)");
      out.whatsapp = w;
    }
  }
  if (need("paymentPlatform", "Payment platform")) {
    if (!PLATFORM_IDS.includes(str(body.paymentPlatform))) throw new ApiError(400, "Select a valid payment platform");
    out.paymentPlatform = str(body.paymentPlatform);
  }
  if (need("paymentScreenshotUrl", "Payment screenshot")) {
    const u = str(body.paymentScreenshotUrl);
    if (!isCloudinaryUrl(u)) throw new ApiError(400, "Payment screenshot must be uploaded first");
    out.paymentScreenshotUrl = u;
    out.paymentScreenshotPublicId = str(body.paymentScreenshotPublicId);
  }
  if (body.pictureUrl !== undefined) {
    const u = str(body.pictureUrl);
    if (u && !isCloudinaryUrl(u)) throw new ApiError(400, "Picture must be uploaded first");
    out.pictureUrl = u;
    out.picturePublicId = u ? str(body.picturePublicId) : "";
  }
  return out;
}
