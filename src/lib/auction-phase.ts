import { TASHKENT_OFFSET_MS } from "@/lib/format";

/*
  Where a lot is in its auction, derived from the one timestamp upstream sends.

  WHAT THE SERVICE GIVES US, AND WHAT IT DOES NOT. `auction_date` is the moment
  the auction OPENS — verified against e-auksion for lot 24823151, sent as
  2026-08-21T05:00:00.000Z, whose lot page reads "Savdo boshlanish vaqti:
  21.08.2026 10:00" (UTC+5). There is no end timestamp anywhere in either
  service and no status meaning "bidding right now": an open lot carries
  "Arizalarni qabul qilish" until it carries something with "yakunlandi" in it,
  and the catalogue drops the latter entirely (isOpenForApplications in
  lib/data/listings.ts).

  SO "live" IS BOUNDED BY THE AUCTION'S OWN TASHKENT CALENDAR DAY. Past
  midnight the lot looks like every other pin again, because "this auction
  opened at 10:00 today" is a fact while "it is still running nine days later"
  is a guess — and that guess would walk a citizen into a bidding room that
  closed last week. It is the same rule that keeps the legacy site's invented
  "JONLI" countdowns out of this codebase (CLAUDE.md, "Deliberately not
  ported").

  NOTHING HERE CLAIMS BIDDING IS OPEN. The UI says the auction has started and
  offers a link to e-auksion's own live page, which is the only place that
  knows. Read `live` as "worth looking at right now", never as "you can bid".

  Client-safe on purpose: lib/data/listings.ts is `server-only` and the map is
  a client component, so this sits beside lib/listings-view.ts for the same
  reason that one does.
*/

const DAY_MS = 86_400_000;

export type AuctionPhase = "upcoming" | "live" | "past";

/** End of the Tashkent calendar day `at` falls in, epoch ms. */
function endOfTashkentDay(at: number): number {
  const local = at + TASHKENT_OFFSET_MS;
  return Math.floor(local / DAY_MS) * DAY_MS + DAY_MS - TASHKENT_OFFSET_MS;
}

export function auctionPhase(
  iso: string | undefined,
  now: number,
): AuctionPhase | null {
  if (!iso) return null;
  const at = new Date(iso).getTime();
  if (!Number.isFinite(at)) return null;
  if (now < at) return "upcoming";
  return now < endOfTashkentDay(at) ? "live" : "past";
}

/** True while the auction has opened and its own day has not run out. */
export function isAuctionLive(iso: string | undefined, now: number): boolean {
  return auctionPhase(iso, now) === "live";
}

/**
 * When this lot's phase changes next, epoch ms, or null if it never will.
 *
 * Lets a caller sleep until the boundary instead of polling: a map holding a
 * thousand pins would otherwise re-render every minute to learn that nothing
 * had changed.
 */
export function nextPhaseChange(
  iso: string | undefined,
  now: number,
): number | null {
  if (!iso) return null;
  const at = new Date(iso).getTime();
  if (!Number.isFinite(at)) return null;
  if (now < at) return at;
  const ends = endOfTashkentDay(at);
  return now < ends ? ends : null;
}
