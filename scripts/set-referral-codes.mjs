// One-time: node --env-file=.env.local scripts/set-referral-codes.mjs
import mongoose from "mongoose";

const MAP = {
  "Rana Asif Ali": "UMDCA4BD-4",
};

async function doh(name, type) {
  for (const url of [`https://dns.google/resolve?name=${name}&type=${type}`, `https://cloudflare-dns.com/dns-query?name=${name}&type=${type}`]) {
    try {
      const r = await fetch(url, { headers: { accept: "application/dns-json" } });
      if (r.ok) return (await r.json()).Answer ?? [];
    } catch {}
  }
  throw new Error("DNS over HTTPS failed");
}

async function connect(uri) {
  try {
    return await mongoose.connect(uri);
  } catch (e) {
    if (!uri.startsWith("mongodb+srv://")) throw e;
    const m = uri.match(/^mongodb\+srv:\/\/([^@]+)@([^/?]+)(\/[^?]*)?(\?.*)?$/);
    const [, creds, host, path = "/", query = ""] = m;
    const [srv, txt] = await Promise.all([doh(`_mongodb._tcp.${host}`, "SRV"), doh(host, "TXT")]);
    const hosts = srv.map((a) => { const [, , port, target] = a.data.trim().split(/\s+/); return `${target.replace(/\.$/, "")}:${port}`; }).join(",");
    const params = new URLSearchParams(query.replace(/^\?/, ""));
    for (const a of txt) new URLSearchParams(a.data.replace(/^"|"$/g, "").replace(/"\s*"/g, "")).forEach((v, k) => { if (!params.has(k)) params.set(k, v); });
    if (!params.has("tls") && !params.has("ssl")) params.set("tls", "true");
    return await mongoose.connect(`mongodb://${creds}@${hosts}${path}?${params}`);
  }
}

await connect(process.env.MONGODB_URI);
const users = mongoose.connection.collection("users");
const leads = mongoose.connection.collection("leads");

for (const [name, code] of Object.entries(MAP)) {
  const u = await users.findOne({ role: "SE", name: { $regex: `^\\s*${name}\\s*$`, $options: "i" } });
  if (!u) { console.log("NOT FOUND:", name); continue; }
  if (await users.findOne({ userId: code, _id: { $ne: u._id } })) { console.log("CODE TAKEN:", code); continue; }
  await users.updateOne({ _id: u._id }, { $set: { userId: code } });
  const r = await leads.updateMany({ se: u._id }, { $set: { seId: code } });
  console.log(`${name}: ${u.userId} -> ${code} (leads updated: ${r.modifiedCount})`);
}
await mongoose.disconnect();
