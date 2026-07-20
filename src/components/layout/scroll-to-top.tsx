"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Scroll-to-top button, ported from davijara-v2.html.
 *
 * Two changes from the legacy version: the scroll listener is passive (so it
 * cannot block scrolling on touch devices), and the scroll itself respects
 * prefers-reduced-motion instead of always smooth-scrolling.
 */
export function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const t = useTranslations("common");

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  const scrollUp = () => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <button
      type="button"
      onClick={scrollUp}
      aria-label={t("backToTop")}
      className="bg-accent text-accent-foreground border-border focus-visible:ring-ring fixed right-4 bottom-20 z-30 flex size-11 items-center justify-center rounded-full border shadow-lg transition-opacity hover:opacity-90 focus-visible:ring-2 lg:bottom-6"
    >
      <ArrowUp aria-hidden="true" className="size-5" />
    </button>
  );
}
