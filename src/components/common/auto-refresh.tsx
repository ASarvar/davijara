"use client";

import { useEffect } from "react";

import { useRouter } from "@/i18n/navigation";

/*
  Re-renders the current page from the server every `seconds`.

  `router.refresh()` fetches the page's Server Components again and swaps the
  result in place — no reload, no lost scroll position, no flash — so a page
  whose whole content is a moving list stays true without the reader pressing
  anything. Used on /joriy-savdolar, where rooms open and close within minutes.

  Paused while the tab is hidden: nobody is reading it, and a phone in a
  pocket should not be refreshing a page every half minute. It refreshes once
  on return so the reader never looks at a list older than they would expect.
*/
export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();

  useEffect(() => {
    let timer: number | undefined;

    const start = () => {
      if (timer !== undefined) return;
      timer = window.setInterval(() => router.refresh(), seconds * 1000);
    };
    const stop = () => {
      if (timer === undefined) return;
      window.clearInterval(timer);
      timer = undefined;
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router, seconds]);

  return null;
}
