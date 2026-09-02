"use client";

import { useEffect } from "react";

import { usePathname } from "@/i18n/navigation";
import { withBasePath } from "@/lib/base-path";

/*
  Fires one navigator.sendBeacon() at /api/hit per page view — on first load
  and on every client-side route change. sendBeacon queues the request outside
  the page's lifecycle, so it costs the reader nothing and still arrives if
  they navigate away immediately; fetch with keepalive is the fallback for the
  rare browser without it.

  No payload — the endpoint only needs to know a browser was here. This is the
  one piece of the visitor counter that runs in the browser; it reads no
  message context and renders nothing.

  Inside NextIntlClientProvider in the layout, because `usePathname` from
  @/i18n/navigation resolves against the routing context.
*/
export function TrafficBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    const url = withBasePath("/api/hit");
    try {
      if (navigator.sendBeacon(url)) return;
    } catch {
      /* fall through to fetch */
    }
    void fetch(url, { method: "POST", keepalive: true }).catch(() => {});
  }, [pathname]);

  return null;
}
