"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { translate, type Lang } from "@/lib/i18n";

type LangCtx = { lang: Lang; setLang: (l: Lang) => void; t: (s: string) => string };
const Ctx = createContext<LangCtx>({ lang: "en", setLang: () => {}, t: (s) => s });

const textOrig = new WeakMap<Text, { en: string; shown: string }>();
const attrOrig = new WeakMap<Element, Record<string, { en: string; shown: string }>>();
const ATTRS = ["placeholder", "title", "aria-label"];

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  const pathname = usePathname();

  useEffect(() => {
    try {
      const l = localStorage.getItem("um-lang");
      if (l === "ur") setLangState("ur");
    } catch {}
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("um-lang", l);
    } catch {}
  }, []);

  // direction + language on <html>
  useEffect(() => {
    const el = document.documentElement;
    el.setAttribute("lang", lang);
    el.setAttribute("dir", lang === "ur" && !pathname.startsWith("/login") ? "rtl" : "ltr");
  }, [lang, pathname]);

  // Live DOM translation (text nodes + placeholder/title/aria-label), reversible.
  useEffect(() => {
    let busy = false;

    const doText = (n: Text) => {
      const cur = n.nodeValue ?? "";
      const rec = textOrig.get(n);
      let en = cur;
      if (rec && cur === rec.shown) en = rec.en; // unchanged by React
      if (!en.trim()) return;
      const lead = en.match(/^\s*/)![0];
      const trail = en.match(/\s*$/)![0];
      const out = lang === "ur" ? lead + translate("ur", en.trim()) + trail : en;
      textOrig.set(n, { en, shown: out });
      if (out !== cur) n.nodeValue = out;
    };

    const doEl = (el: Element) => {
      for (const a of ATTRS) {
        const cur = el.getAttribute(a);
        if (cur == null) continue;
        const map = attrOrig.get(el) ?? {};
        const rec = map[a];
        let en = cur;
        if (rec && cur === rec.shown) en = rec.en;
        const out = lang === "ur" ? translate("ur", en) : en;
        map[a] = { en, shown: out };
        attrOrig.set(el, map);
        if (out !== cur) el.setAttribute(a, out);
      }
    };

    const walk = (root: Node) => {
      if (root.nodeType === Node.TEXT_NODE) {
        const p = root.parentElement;
        if (p && !["SCRIPT", "STYLE", "TEXTAREA", "CODE"].includes(p.tagName) && !p.closest("[data-no-tr]")) doText(root as Text);
        return;
      }
      if (root.nodeType !== Node.ELEMENT_NODE) return;
      const el = root as Element;
      if (["SCRIPT", "STYLE"].includes(el.tagName) || el.closest("[data-no-tr]")) return;
      doEl(el);
      el.childNodes.forEach(walk);
    };

    const run = (fn: () => void) => {
      busy = true;
      try {
        fn();
      } finally {
        busy = false;
      }
    };

    run(() => walk(document.body));

    const mo = new MutationObserver((muts) => {
      if (busy) return;
      run(() => {
        for (const m of muts) {
          if (m.type === "childList") m.addedNodes.forEach(walk);
          else if (m.type === "characterData") walk(m.target);
          else if (m.type === "attributes" && m.target.nodeType === 1) doEl(m.target as Element);
        }
      });
    });
    mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });

    return () => mo.disconnect();
  }, [lang]);

  const t = useCallback((s: string) => translate(lang, s), [lang]);
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);

export function LangToggle({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <button
      type="button"
      data-no-tr
      className={`btn btn-ghost ${className}`}
      style={{ minWidth: "3.2rem", fontWeight: 700 }}
      onClick={() => setLang(lang === "ur" ? "en" : "ur")}
      aria-label="Language"
      title={lang === "ur" ? "English" : "اردو"}
    >
      {lang === "ur" ? "EN" : "اردو"}
    </button>
  );
}
