import "server-only";

import { getDb } from "@/lib/db";
import { TASHKENT_OFFSET_MS } from "@/lib/format";

export interface TrafficStats {
  /** Distinct visitors whose last page view was in the last 5 minutes. */
  online: number;
  /** Page views so far today (Tashkent calendar day). */
  actions: number;
  /** Distinct visitors so far today. */
  visits: number;
  /**
   * Mean visit length today, in seconds — over visits of 2+ page views only
   * (a single-page visit has no measurable dwell), each capped at 30 minutes.
   * Null until there is at least one such visit.
   */
  avgSeconds: number | null;
}

const ONLINE_WINDOW_MS = 5 * 60 * 1000;
const VISIT_CAP_MS = 30 * 60 * 1000;

function tashkentDay(now: number): string {
  return new Date(now + TASHKENT_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * The four figures the footer band shows, written by src/app/api/hit.
 *
 * Null on any failure and during `next build` (the in-memory database is empty
 * then, and so is a server that has taken no traffic yet) — the footer then
 * renders nothing rather than a band of zeros. Never throws: a visitor counter
 * must not be able to take down the layout it sits in.
 */
export async function getTrafficStats(): Promise<TrafficStats | null> {
  try {
    const db = getDb();
    const now = Date.now();
    const day = tashkentDay(now);

    const online = (
      db
        .prepare("SELECT COUNT(*) AS n FROM traffic_visit WHERE last_ts > ?")
        .get(now - ONLINE_WINDOW_MS) as { n: number }
    ).n;

    const dayRow = db
      .prepare("SELECT hits, visitors FROM traffic_day WHERE day = ?")
      .get(day) as { hits: number; visitors: number } | undefined;
    const actions = dayRow?.hits ?? 0;
    const visits = dayRow?.visitors ?? 0;

    const avgMs = (
      db
        .prepare(
          "SELECT AVG(MIN(last_ts - first_ts, ?)) AS ms FROM traffic_visit WHERE day = ? AND hits >= 2",
        )
        .get(VISIT_CAP_MS, day) as { ms: number | null }
    ).ms;
    const avgSeconds = avgMs == null ? null : Math.round(avgMs / 1000);

    /* Nothing recorded yet — say so by rendering nothing. */
    if (actions === 0 && online === 0) return null;

    return { online, actions, visits, avgSeconds };
  } catch {
    return null;
  }
}
