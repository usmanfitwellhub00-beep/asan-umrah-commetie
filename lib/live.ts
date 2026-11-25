"use client";

import { useEffect, useRef } from "react";

/** Calls `fn` every `ms` while the tab is visible, and again when the tab/window regains focus. */
export function useLive(fn: () => void, ms = 6000) {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  });
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") ref.current();
    };
    const id = setInterval(tick, ms);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, [ms]);
}
