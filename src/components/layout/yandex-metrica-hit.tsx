"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

declare global {
  interface Window {
    ym?: (id: number, action: string, ...args: unknown[]) => void;
  }
}

/*
  Sends one Metrica `hit` per page view, initial load included.

  The counter is initialised with `defer: true` (see <YandexMetrica>), so it
  fires nothing on its own — this is the single place hits come from, which is
  what keeps a client navigation counted exactly like a fresh load.

  `usePathname` from next/navigation, NOT from @/i18n/navigation: Metrica
  should see the real URL a visitor is on, locale prefix and all
  (`/uz/imtiyozlar`), not the locale-stripped path the i18n helper returns.

  Query strings are left off on purpose. Reading them needs `useSearchParams`,
  which opts the whole route out of static prerendering unless wrapped in
  Suspense — too high a price for a site that prerenders 143 pages, when the
  only query params here are filter values (`?hudud=…`) that matter far more
  in the site's own logs than in Metrica's page report. `ym('params', …)` is
  the tool for that later if it is wanted.

  Renders nothing.
*/
export function YandexMetricaHit({ id }: { id: number }) {
  const pathname = usePathname();
  /*
    `init` with `defer:true` sends no hit, so the first run here IS the
    load-time pageview and must fire. Later runs are client navigations, where
    passing the previous URL as `referer` and the new `title` is what makes
    Metrica's page report read like a normal multi-page site rather than one
    endless visit to "/".
  */
  const first = useRef(true);
  const prevUrl = useRef("");

  useEffect(() => {
    if (typeof window.ym !== "function") return;

    const url = window.location.href;

    if (first.current) {
      first.current = false;
      prevUrl.current = url;
      window.ym(id, "hit", url);
      return;
    }

    window.ym(id, "hit", url, {
      referer: prevUrl.current,
      title: document.title,
    });
    prevUrl.current = url;
  }, [id, pathname]);

  return null;
}
