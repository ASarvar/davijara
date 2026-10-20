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
  /**
   * One hero card's FIGURE for one place — the number itself, not the
   * records it was counted from. See `getHeroStats` and `saveIfChanged`.
   */
  heroFigure: (card: string, scope: string) => `hero:${card}:${scope}`,
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

/**
 * Record `data` under `key` only when it differs from what is stored.
 *
 * For SMALL payloads — a hero figure is a number or three — where comparing
 * costs nothing, and where the six-hour throttle above would make the
 * fallback hours older than the page a reader saw a minute before the outage.
 *
 * WHY "CHANGED" AND NOT "EVERY TIME". The caller cannot tell a live answer
 * from a stale one: while a service is down, `unstable_cache` keeps handing
 * back its last entry as if nothing were wrong (it swallows the failed
 * revalidation — see next/dist/server/web/spec-extension/unstable-cache.js).
 * Rewriting on every render would stamp that frozen figure with a fresh time
 * for as long as the outage lasted, and the page would later print it as
 * "as of" a moment the service never confirmed it. Writing only on change
 * keeps the stamp at the moment the figure was last SEEN to move: never later
 * than the truth, at worst earlier — which understates freshness, the honest
 * direction to err in.
 */
export function saveIfChanged(key: string, data: unknown): void {
  try {
    const db = getDb();
    const next = JSON.stringify(data);
    const existing = db
      .prepare("SELECT data FROM api_snapshot WHERE key = ?")
      .get(key) as { data: string } | undefined;
    if (existing?.data === next) return;
    db.prepare(
      `INSERT INTO api_snapshot (key, data, fetched_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET data = excluded.data,
                                        fetched_at = excluded.fetched_at`,
    ).run(key, next, new Date().toISOString());
  } catch (error) {
    console.error(
      "[snapshot] save failed",
      key,
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * How long a stored answer may veto a new one. See `implausibleDrop`.
 */
const PLAUSIBILITY_WINDOW_MS = 48 * 60 * 60 * 1000;

/**
 * A description of the problem when a fresh answer has fallen below `floor`
 * times the stored one for the same scope, else null.
 *
 * WHAT IT CATCHES: a service that answers `success: true` with an empty or
 * truncated list — the failure the existing checks cannot see, because the
 * status code and the `success` flag both say all is well. Taken at face
 * value, a region would drop to 0 lots on the map and its "0" would become the
 * new last-known-good, poisoning the very fallback that exists for outages.
 * Callers THROW on a non-null result, which routes the answer down the same
 * path as an unreachable service: the cached or stored figure, dated.
 *
 * The floor is the caller's, because what counts as implausible depends on
 * what is counted. A year-to-date total (contracts signed, lots sold) only
 * grows, so a 10% fall is a fault: floor 0.9. A list of OPEN lots legitimately
 * halves in an hour — 373 privatization lots fell to 109 at 10:20 on
 * 20.10.2026, when a sitting closed — so there only "empty" is a fault:
 * floor 0.01, with `minPrevious` keeping a region that really had two lots
 * from being held hostage by them.
 *
 * SELF-HEALING: a stored answer older than two days vetoes nothing. The guard
 * never updates the snapshot it compares against, so a fall that is real — a
 * register corrected downward — is accepted two days after it first appeared
 * instead of being refused for ever.
 *
 * Like the rest of this module it never throws: a snapshot that cannot be read
 * vetoes nothing.
 */
export function implausibleDrop(
  key: string,
  fresh: number,
  measure: (stored: unknown) => number | undefined,
  { floor, minPrevious = 10 }: { floor: number; minPrevious?: number },
): string | null {
  const stored = readSnapshot<unknown>(key);
  if (!stored) return null;
  const age = Date.now() - Date.parse(stored.fetchedAt);
  if (!(age >= 0 && age < PLAUSIBILITY_WINDOW_MS)) return null;

  const previous = measure(stored.data);
  if (previous == null || !Number.isFinite(previous)) return null;
  if (previous < minPrevious || fresh >= previous * floor) return null;

  return `${key}: ${fresh} against ${previous} stored at ${stored.fetchedAt} — treated as a fault`;
}
