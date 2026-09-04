"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

/*
  Time remaining until an auction opens.

  WHAT THIS COUNTS DOWN TO, AND WHY THE LABEL MATTERS
  `auction_date` is the moment the auction STARTS, not the deadline for
  entering it. Checked against e-auksion for lot 24823151: the API sends
  `2026-08-21T05:00:00.000Z` and the lot page shows "Savdo boshlanish vaqti:
  21.08.2026 10:00" (UTC+5) — while "Arizalarni qabul qilishning oxirgi
  muddati" is 09:00, a full hour EARLIER. So a countdown labelled "time left
  to apply" would be an hour wrong in the direction that costs a citizen their
  application. It is labelled "savdo boshlanishiga" by the caller for exactly
  that reason.

  WHY THE SERVER RENDERS A DATE AND NOT A DURATION
  The legacy site's countdowns ran off `data-end="7260"` — seconds from page
  load — so every "live" auction restarted its clock on refresh. This one is
  driven by a server-provided ISO instant, so it is immune to clock skew and
  to reloads.

  `remaining` starts as null and is only filled in by the effect, so the first
  client render matches the server byte for byte and there is no hydration
  mismatch. Without JavaScript the static date simply stays — which is why the
  fallback is a real date and not a spinner.
*/

function split(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

export function AuctionCountdown({
  /** ISO instant the auction opens, straight from the service. */
  iso,
  /** Shown before hydration and to anyone without JavaScript. */
  fallback,
  /**
   * Override for the "auction has opened" text. `listings-map` passes its own
   * because it already builds a label bag on the server; everything else takes
   * the translated default below.
   */
  startedLabel,
  className,
}: {
  iso: string;
  fallback: string;
  startedLabel?: string;
  className?: string;
}) {
  /* `common`, because this is a client component — see the i18n note in
     CLAUDE.md for why the client provider carries only three namespaces. */
  const t = useTranslations("common");
  const started = startedLabel ?? t("auctionStarted");
  const dayUnit = t("dayShort");
  const [remaining, setRemaining] = useState<string | null>(null);

  useEffect(() => {
    const target = new Date(iso).getTime();
    if (!Number.isFinite(target)) return;

    const p = (n: number) => String(n).padStart(2, "0");

    const tick = () => {
      const left = target - Date.now();
      if (left <= 0) {
        setRemaining(started);
        return true; // stop
      }
      const { days, hours, minutes, seconds } = split(left);
      setRemaining(
        days > 0
          ? `${days} ${dayUnit} ${p(hours)}:${p(minutes)}:${p(seconds)}`
          : `${p(hours)}:${p(minutes)}:${p(seconds)}`,
      );
      return false;
    };

    if (tick()) return;
    const id = window.setInterval(() => {
      if (tick()) window.clearInterval(id);
    }, 1000);
    return () => window.clearInterval(id);
  }, [iso, started, dayUnit]);

  return (
    <span
      className={className}
      // The value changes every second; announcing each tick would make the
      // page unusable with a screen reader, so the live region is off and the
      // accessible name carries the absolute time instead.
      aria-live="off"
      title={fallback}
    >
      {remaining ?? fallback}
    </span>
  );
}
