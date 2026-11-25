export function Avatar({ url, gender, name = "", size = 40 }: { url?: string | null; gender?: string | null; name?: string; size?: number }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name || "Profile"} width={size} height={size} className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />;
  }

  const female = gender === "female";
  const bg = female ? "linear-gradient(135deg, #f472b6, #a855f7)" : "linear-gradient(135deg, #60a5fa, #2563eb)";

  return (
    <span
      className="inline-flex items-center justify-center rounded-full overflow-hidden shrink-0"
      style={{ width: size, height: size, background: bg }}
      role="img"
      aria-label={female ? "Female profile placeholder" : "Male profile placeholder"}
    >
      <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
        {female && <path d="M19 28c0-10 5-17 13-17s13 7 13 17v15c0 2-1 3-3 3H22c-2 0-3-1-3-3z" fill="rgba(0,0,0,0.28)" />}
        <circle cx="32" cy="26" r="10" fill="rgba(255,255,255,0.95)" />
        {female && <path d="M22 25c1-7 5-11 10-11s9 4 10 11c-4-2-8-4-10-6-3 3-6 5-10 6z" fill="rgba(0,0,0,0.28)" />}
        <path d="M11 64c0-12 9-20 21-20s21 8 21 20z" fill="rgba(255,255,255,0.95)" />
      </svg>
    </span>
  );
}
