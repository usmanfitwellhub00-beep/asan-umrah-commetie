/** Pure validators shared by the browser forms and the API routes. */

/** Normalises anything typed/pasted into a Pakistani mobile: 03XXXXXXXXX (max 11 digits). */
export function cleanPhone(v: string) {
  let d = v.replace(/\D/g, "");
  if (d.startsWith("92") && d.length > 11) d = "0" + d.slice(2);
  else if (d.startsWith("3") && d.length === 10) d = "0" + d;
  return d.slice(0, 11);
}

export const isPhone = (v: string) => /^03\d{9}$/.test(v);

export function phoneError(v: string) {
  if (!v) return "";
  return isPhone(cleanPhone(v)) ? "" : "Enter a valid mobile number: 11 digits starting with 03 (e.g. 03XXXXXXXXX)";
}

const TYPO_DOMAINS: Record<string, string> = {
  "gmial.com": "gmail.com", "gmai.com": "gmail.com", "gmail.co": "gmail.com", "gmail.con": "gmail.com", "gmail.cm": "gmail.com",
  "gamil.com": "gmail.com", "gmal.com": "gmail.com", "gnail.com": "gmail.com", "gmil.com": "gmail.com", "gmail.comm": "gmail.com",
  "yaho.com": "yahoo.com", "yahooo.com": "yahoo.com", "yahoo.con": "yahoo.com", "hotmial.com": "hotmail.com", "hotmail.con": "hotmail.com",
  "outlok.com": "outlook.com", "outlook.con": "outlook.com",
};

export function emailError(raw: string) {
  const v = raw.trim().toLowerCase();
  if (!v) return "";
  if (!/^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(v) || v.includes("..")) return "Enter a valid email address";
  const [local, domain] = v.split("@");
  if (local.startsWith(".") || local.endsWith(".")) return "Enter a valid email address";
  if (TYPO_DOMAINS[domain]) return `Did you mean @${TYPO_DOMAINS[domain]}?`;
  if (domain === "gmail.com") {
    const base = local.split("+")[0];
    if (!/^[a-z0-9.]{6,30}$/.test(base)) return "Not a valid Gmail address (6–30 letters, numbers or dots)";
  }
  return "";
}

export const isEmailValid = (v: string) => !!v.trim() && !emailError(v);
