import "server-only";

import { getDb } from "@/lib/db";

/*
  The last successful answer from each upstream service.

  ┌──────────────────────────────────────────────────────────────────────────┐
  │ THE FALLBACK CHAIN, AND WHY IT IS IN THIS ORDER.                         │
  │                                                                          │
  │     live service  ->  snapshot  ->  sample lots / operator's static      │
  │                                                                          │
  │ Every reader of an upstream service walks it. The middle step is what    │
  │ this module adds: before this, a listings feed on an unreachable         │
  │ internal address put GENERATED sample lots in front of a citizen looking │
  │ for state property. Real figures from an hour ago are a better answer    │
  │ than invented ones from never.                                           │
  │                                                                          │
  │ The last step is kept rather than removed. The static hero figures are   │
  │ the OPERATOR'S OWN reported totals — verified numbers, not mock data —   │
  │ and the sample set still covers the one case a snapshot cannot: a server │
  │ that has never once reached the service, so there is nothing to fall     │
  │ back to.                                                                 │
  └──────────────────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────────────────┐
  │ A SNAPSHOT MUST NEVER BE SERVED UNLABELLED.                              │
  │                                                                          │
  │ `fetchedAt` is not diagnostics — it is the thing that keeps this honest. │
  │ CLAUDE.md non-negotiable 6 forbids inventing facts, and printing         │
  │ yesterday's lot count in the place a live figure normally sits claims    │
  │ something untrue about today just as surely as typing a number would.    │
  │ Every caller that can return snapshot data returns this timestamp with   │
  │ it, and the components print it. Do not add a read path that drops it.   │
  └──────────────────────────────────────────────────────────────────────────┘

  NOTHING HERE THROWS. A counter or a cache failing must not be able to take
  down a page that would otherwise have rendered — the whole point of this
  module is to make an outage survivable, so it cannot itself be a new way to
  fail. Both functions swallow their errors and report "no snapshot", which
  every caller already handles because it is the same answer a cold server
  gives.

  DURING `next build` THIS IS A NO-OP, for free: getDb() hands back an
  in-memory database in that phase (see lib/db/index.ts), so writes go nowhere
  and reads find nothing. A prerendered page falls to its static fallback and
  is replaced on the first revalidation, exactly as it was before.
*/

export interface Snapshot<T> {
  data: T;
  /** ISO 8601 UTC — when the service actually answered. Always surfaced. */
  fetchedAt: string;
}

/** Keys are scopes, not moments — a refresh REPLACES the row. */
export const snapshotKeys = {
  listingsRegion: (slug: string) => `listings:region:${slug}`,
  soldYear: (apiId: number, year: number) => `listings:sold:${apiId}:${year}`,
  register: (apiId: number, year: number) => `register:${apiId}:${year}`,
} as const;

/**
 * How stale a stored row may get before a successful call replaces it.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ THIS IS NOT THE CACHE WINDOW, AND THE TWO MUST NOT BE MERGED.            │
 * │                                                                          │
 * │ `unstable_cache` decides how fresh the LIVE site is — 300s for the       │
 * │ catalogue, 600s for the sold year, an hour for the register. Those stay  │
 * │ exactly as they are: a portal whose lot list is six hours old would send │
 * │ a citizen to an auction that closed this morning.                        │
 * │                                                                          │
 * │ This decides how often that fresh answer is also written to DISK, and    │
 * │ the two questions have different right answers. The snapshot only has to │
 * │ be good enough to stand in during an outage, and six-hour-old real lots  │
 * │ serve that just as well as five-minute-old ones — while writing them 72  │
 * │ times a day instead of 288 takes the store from ~2MB per ten minutes to  │
 * │ ~2MB per six hours on a box with one CPU and a WAL to checkpoint.        │
 * │                                                                          │
 * │ WHAT IT COSTS is bounded and visible: a snapshot served during an outage │
 * │ can now be up to six hours older than it would have been. It is real     │
 * │ data either way, and `fetchedAt` states the age on the page, so the      │
 * │ trade is between a slightly older honest figure and constant disk churn. │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * The first write for a key is never throttled — there is nothing to fall back
 * to until it lands.
 */
export const SNAPSHOT_MIN_INTERVAL_MS = 6 * 60 * 60 * 1000;

/**
 * Record an upstream answer as the new last-known-good for `key`.
 *
 * Call this ONLY after the response has been validated and mapped — a body
 * that parsed but reported `success: false` is not an answer, and storing it
 * would poison the fallback with the failure it exists to survive.
 *
 * Throttled by `SNAPSHOT_MIN_INTERVAL_MS`, which is the DEFAULT rather than a
 * value each call site passes: a caller that forgot it would quietly put the
 * write rate back where it was, and nothing on screen would show it.
 */
export function saveSnapshot(
  key: string,
  data: unknown,
  minIntervalMs: number = SNAPSHOT_MIN_INTERVAL_MS,
): void {
  try {
    const db = getDb();

    /*
      One primary-key lookup of a single short column, so the guard costs
      nothing next to the write it usually skips. Reading `fetched_at` rather
      than comparing the payload: comparing would mean pulling the old ~150KB
      blob back out to decide whether to write ~150KB, which is the cost this
      is here to avoid.
    */
    if (minIntervalMs > 0) {
      const existing = db
        .prepare("SELECT fetched_at FROM api_snapshot WHERE key = ?")
        .get(key) as { fetched_at: string } | undefined;

      if (existing) {
        const age = Date.now() - Date.parse(existing.fetched_at);
        // `age < 0` means a clock step or a hand-edited row — rewrite rather
        // than trust a timestamp in the future and freeze the row for ever.
        if (age >= 0 && age < minIntervalMs) return;
      }
    }

    db.prepare(
      `INSERT INTO api_snapshot (key, data, fetched_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET data = excluded.data,
                                        fetched_at = excluded.fetched_at`,
    ).run(key, JSON.stringify(data), new Date().toISOString());
  } catch (error) {
    /*
      Logged, not thrown. A snapshot that cannot be written costs the site its
      fallback the NEXT time the service is down — worth knowing about in the
      journal, never worth failing a request that otherwise succeeded.
    */
    console.error(
      "[snapshot] save failed",
      key,
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * The last good answer for `key`, or null if there has never been one.
 *
 * A row whose JSON no longer parses is treated as absent rather than repaired:
 * the caller then drops to its own fallback, which is the same path a cold
 * server takes. That is what keeps a change to the shapes in types/content.ts
 * from turning old rows into a crash.
 */
export function readSnapshot<T>(key: string): Snapshot<T> | null {
  try {
    const row = getDb()
      .prepare("SELECT data, fetched_at FROM api_snapshot WHERE key = ?")
      .get(key) as { data: string; fetched_at: string } | undefined;
    if (!row) return null;

    return { data: JSON.parse(row.data) as T, fetchedAt: row.fetched_at };
  } catch (error) {
    console.error(
      "[snapshot] read failed",
      key,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

/**
 * The older of two timestamps, either of which may be absent.
 *
 * Callers assemble one view out of several snapshots — fourteen regions, say —
 * and the line the page prints has to name the OLDEST of them. Claiming the
 * freshest would date the whole view by its most recent part.
 */
export function olderOf(
  a: string | undefined,
  b: string | undefined,
): string | undefined {
  if (!a) return b;
  if (!b) return a;
  return a < b ? a : b;
}
