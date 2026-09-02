"use client";

import { useEffect, useState } from "react";

import { Container } from "@/components/layout/section";
import { withBasePath } from "@/lib/base-path";
import { formatNumber } from "@/lib/format";
import type { TrafficStats } from "@/lib/data/traffic";

interface Labels {
  online: string;
  actions: string;
  visits: string;
  avgTime: string;
  /** "s" — the unit after a seconds figure. */
  secondsShort: string;
  /** "daq" — the unit after a minutes figure. */
  minutesShort: string;
}

/*
  Client half of the footer visitor band. Polls /api/traffic once a minute and
  swaps in the fresh figures, starting from the server-rendered `initial` so
  there is no flash and no layout shift on hydration. A failed poll keeps the
  last good figures rather than blanking the band.

  `import type` above is erased at build, so the "server-only" data module is
  never pulled into the client bundle. Labels arrive as plain strings from the
  server component.

  The band's navy is set in globals.css (`.footer-traffic-band`) — a deliberate
  always-navy brand strip that goes black in high contrast. davijara-ui rule 4,
  no state by hue alone: every figure is a number with its label spelled out,
  and the live dot (aria-hidden, emerald, the same treatment as the eyebrow
  pill) only decorates a line that already reads "Onlayn: N".
*/
export function SiteTrafficLive({
  initial,
  labels,
}: {
  initial: TrafficStats;
  labels: Labels;
}) {
  const [stats, setStats] = useState(initial);

  useEffect(() => {
    let alive = true;

    const tick = async () => {
      try {
        const res = await fetch(withBasePath("/api/traffic"), {
          cache: "no-store",
        });
        if (!res.ok) return;
        const next = (await res.json()) as TrafficStats;
        if (alive) setStats(next);
      } catch {
        /* keep the last good figures */
      }
    };

    const id = setInterval(tick, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const duration = (seconds: number | null): string => {
    if (seconds == null) return "—";
    if (seconds < 60) return `${seconds} ${labels.secondsShort}`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s
      ? `${m} ${labels.minutesShort} ${s} ${labels.secondsShort}`
      : `${m} ${labels.minutesShort}`;
  };

  const figure = (label: string, value: string) => (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className="text-white/70">{label}:</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </span>
  );

  return (
    <div className="footer-traffic-band">
      <Container className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2 py-3 text-sm text-white">
        <span className="inline-flex items-center gap-2 whitespace-nowrap">
          <span
            aria-hidden="true"
            className="eyebrow-pulse-dot size-2 shrink-0 rounded-full bg-emerald-400"
          />
          <span className="text-white/70">{labels.online}:</span>
          <span className="font-semibold tabular-nums">
            {formatNumber(stats.online)}
          </span>
        </span>
        {figure(labels.actions, formatNumber(stats.actions))}
        {figure(labels.visits, formatNumber(stats.visits))}
        {figure(labels.avgTime, duration(stats.avgSeconds))}
      </Container>
    </div>
  );
}
