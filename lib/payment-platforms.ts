export type PaymentPlatform = {
  id: string;
  name: string;
  type: "wallet" | "bank" | "cash" | "other";
  color: string;
  abbr: string;
  /** optional: put an official logo in /public/payments/<id>.svg and set e.g. "/payments/jazzcash.svg" */
  logo?: string;
};

export const PAYMENT_PLATFORMS: PaymentPlatform[] = [
  { id: "jazzcash", name: "JazzCash", type: "wallet", color: "#d71920", abbr: "JC", logo: "/payments/jazzcash.png" },
  { id: "easypaisa", name: "Easypaisa", type: "wallet", color: "#2db34a", abbr: "EP", logo: "/payments/easypaisa.png" },
  { id: "sadapay", name: "SadaPay", type: "wallet", color: "#00b5a5", abbr: "SP", logo: "/payments/sadapay.png" },
  { id: "nayapay", name: "NayaPay", type: "wallet", color: "#f5821f", abbr: "NP", logo: "/payments/nayapay.png" },
  { id: "zindigi", name: "Zindigi (JS Bank)", type: "wallet", color: "#0072bc", abbr: "ZG", logo: "/payments/zindigi.png" },
  { id: "upaisa", name: "UPaisa (Ufone)", type: "wallet", color: "#ff6a00", abbr: "UP", logo: "/payments/upaisa.png" },
  { id: "raast", name: "Raast (Instant Payment)", type: "wallet", color: "#00796b", abbr: "RS", logo: "/payments/raast.png" },
  { id: "meezan", name: "Meezan Bank", type: "bank", color: "#6d2077", abbr: "MZ", logo: "/payments/meezan.png" },
  { id: "hbl", name: "HBL", type: "bank", color: "#00877c", abbr: "HB", logo: "/payments/hbl.png" },
  { id: "ubl", name: "UBL (Omni / Digital)", type: "bank", color: "#0054a6", abbr: "UB", logo: "/payments/ubl.png" },
  { id: "mcb", name: "MCB Bank", type: "bank", color: "#008a45", abbr: "MC", logo: "/payments/mcb.png" },
  { id: "allied", name: "Allied Bank (ABL)", type: "bank", color: "#0a7d3b", abbr: "AB", logo: "/payments/allied.png" },
  { id: "alfalah", name: "Bank Alfalah", type: "bank", color: "#e2231a", abbr: "AL", logo: "/payments/alfalah.png" },
  { id: "faysal", name: "Faysal Bank", type: "bank", color: "#0b6e3f", abbr: "FB", logo: "/payments/faysal.png" },
  { id: "askari", name: "Askari Bank", type: "bank", color: "#003a70", abbr: "AK", logo: "/payments/askari.png" },
  { id: "bahl", name: "Bank Al Habib", type: "bank", color: "#00833e", abbr: "BH", logo: "/payments/bahl.png" },
  { id: "habibmetro", name: "Habib Metro Bank", type: "bank", color: "#c8102e", abbr: "HM", logo: "/payments/habibmetro.png" },
  { id: "scb", name: "Standard Chartered", type: "bank", color: "#0473ea", abbr: "SC", logo: "/payments/scb.png" },
  { id: "soneri", name: "Soneri Bank", type: "bank", color: "#00923f", abbr: "SN", logo: "/payments/soneri.png" },
  { id: "bop", name: "Bank of Punjab", type: "bank", color: "#006a4e", abbr: "BP", logo: "/payments/bop.png" },
  { id: "nbp", name: "National Bank of Pakistan", type: "bank", color: "#00734f", abbr: "NB", logo: "/payments/nbp.png" },
  { id: "dib", name: "Dubai Islamic Bank", type: "bank", color: "#0097a9", abbr: "DI", logo: "/payments/dib.png" },
  { id: "bankislami", name: "BankIslami", type: "bank", color: "#5b2a86", abbr: "BI" },
  { id: "other", name: "Other", type: "other", color: "#94a3b8", abbr: "•••" },
];

export const PLATFORM_IDS = PAYMENT_PLATFORMS.map((p) => p.id);

export function platformName(id: string) {
  return PAYMENT_PLATFORMS.find((p) => p.id === id)?.name ?? id;
}
