import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable in .env.local");
}

type Cache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalWithMongoose = globalThis as typeof globalThis & { _mongoose?: Cache };
const cached: Cache = (globalWithMongoose._mongoose ??= { conn: null, promise: null });

type DohAnswer = { data: string };

// Resolve a DNS record over HTTPS (works when Node's own SRV lookup is blocked/broken).
async function doh(name: string, type: "SRV" | "TXT"): Promise<DohAnswer[]> {
  const endpoints = [
    `https://dns.google/resolve?name=${name}&type=${type}`,
    `https://cloudflare-dns.com/dns-query?name=${name}&type=${type}`,
  ];
  let lastErr: unknown;
  for (const url of endpoints) {
    try {
      const res = await fetch(url, { headers: { accept: "application/dns-json" } });
      if (!res.ok) throw new Error(`DoH ${res.status}`);
      const json = (await res.json()) as { Answer?: DohAnswer[] };
      return json.Answer ?? [];
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

// Convert mongodb+srv:// URI into a standard mongodb:// URI without using Node's SRV lookup.
async function srvToStandardUri(uri: string): Promise<string> {
  const m = uri.match(/^mongodb\+srv:\/\/([^@]+)@([^/?]+)(\/[^?]*)?(\?.*)?$/);
  if (!m) throw new Error("Unsupported MONGODB_URI format");
  const [, creds, host, path = "/", query = ""] = m;

  const [srv, txt] = await Promise.all([
    doh(`_mongodb._tcp.${host}`, "SRV"),
    doh(host, "TXT"),
  ]);
  if (!srv.length) throw new Error(`No SRV records found for ${host}`);

  const hosts = srv
    .map((a) => {
      const [, , port, target] = a.data.trim().split(/\s+/);
      return `${target.replace(/\.$/, "")}:${port}`;
    })
    .join(",");

  const params = new URLSearchParams(query.replace(/^\?/, ""));
  for (const a of txt) {
    new URLSearchParams(a.data.replace(/^"|"$/g, "").replace(/"\s*"/g, "")).forEach((v, k) => {
      if (!params.has(k)) params.set(k, v);
    });
  }
  if (!params.has("tls") && !params.has("ssl")) params.set("tls", "true");

  return `mongodb://${creds}@${hosts}${path}?${params.toString()}`;
}

async function connect(): Promise<typeof mongoose> {
  const uri = MONGODB_URI as string;
  try {
    return await mongoose.connect(uri, { bufferCommands: false });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (uri.startsWith("mongodb+srv://") && /querySrv|ECONNREFUSED|ENOTFOUND|ETIMEOUT|EAI_AGAIN/i.test(msg)) {
      const standard = await srvToStandardUri(uri);
      return await mongoose.connect(standard, { bufferCommands: false });
    }
    throw err;
  }
}

export async function connectDB() {
  if (cached.conn) return cached.conn;
  cached.promise ??= connect();
  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }
  return cached.conn;
}
