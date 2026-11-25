"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icons";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    setTheme((document.documentElement.getAttribute("data-theme") as "light" | "dark") ?? "dark");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("um-theme", next);
    } catch {}
    setTheme(next);
  }

  return (
    <button className="btn btn-ghost btn-icon" onClick={toggle} aria-label="Toggle light / dark theme" title="Toggle theme">
      {theme === "dark" ? <Icon name="sun" /> : <Icon name="moon" />}
    </button>
  );
}
