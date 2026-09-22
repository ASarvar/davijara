import "server-only";

import { unstable_cache } from "next/cache";

import { getListings } from "@/lib/data/listings";
import type { Listing } from "@/types/content";

/*
  Which lots are being bid on RIGHT NOW.

  ANSWERED BY E-AUKSION, NOT INFERRED HERE. This started as a derivation from
  the listings feed — a lot counted as live from its auction timestamp until
  the end of that Tashkent day, because the feed carries no end time and no
  in-progress flag. The window was far too generous: an e-auksion room closes
  minutes after it opens (its own page counts down in mm:ss), so a lot that
  finished at 10:12 stayed marked as live until midnight. Checked against the
  service on 16.09.2026 while lot 25472672 was in its room, our own feed still
  reported `lot_status: "Savdoda ishtirok etish uchun elektron arizalarni
  qabul qilish"` and `order_status: "Lotga chiqarilgan"` — the same values a
  lot whose auction is next week carries. Our feed only moves to
  "Auksion/Tanlov yakunlandi" after the fact, so it cannot answer this either.

  So we read the list the portal itself publishes — the one behind its own
  "Lotlar → Joriy savdolar" page, filtered to state-property rent:

    POST https://e-auksion.uz/api/front/curlots?lang=uz
    { confiscant_groups_id: 11, current_page: 1, per_page: 100, … }
    → { totalRows, totalPages, gaming_lots_cnt, rows: [ { lot_number, … } ] }

  NOT `GET /api/front/lots/current`, which was the first choice and was
  WRONG IN A WAY THAT LOOKED RIGHT. That is the short list behind the
  "Joriy savdolar" block on e-auksion's homepage, and it carries no rent lots
  at all. Measured on 21.09.2026 at 10:05 Tashkent, with 167 of our lots
  scheduled for 10:00: it listed 8 rooms — seven vehicles and a flat, every
  one a confiscated-property sale — and none of ours, so the whole live
  feature showed nothing. `curlots` for group 11 at the same minute listed
  64, and 57 of them were ours; the other 7 are enterprises' and clients'
  property leased through the same group. Found by reading which request the
  portal's own page makes, not by guessing a path.

  GROUP 11, "Davlat mulkini ijaraga berish", is where every one of our lots
  sat (category 41). Asking for the group rather than for everything keeps the
  answer to the rent rooms — the unfiltered call returned 352 that minute,
  mostly sales we have no part in — and a lot that is not ours is dropped by
  the listings match below anyway.

  `zz_md5` IS NOT SENT. The portal's page adds it to the body; the endpoint
  answers identically without it, and working out how it is derived would be
  reverse-engineering the site's own checks, which this module does not do.
  If e-auksion ever starts requiring it, this call fails, the fault branch
  below shows no live state, and the fix is to ask the operator for a
  supported feed — not to reconstruct the token.

  PUBLIC AND UNAUTHENTICATED, unlike the internal services the rest of
  lib/data talks to. It is read server-side all the same: the browser cannot
  reach it across origins, and one cached call serves every reader.

  "JORIY" MEANS TODAY, NOT OPEN. Measured 22.09.2026 at 04:33 Tashkent:
  `curlots` listed 49 lots, every one with `auction_date_str` "22.09.2026
  10:00", `lot_statuses_id` 10 and applications closing at 09:00 — five
  and a half hours before any room opened — and the site showed them all as
  live. The list is the day's auctions, from before they start. So a row
  counts as live only once ITS OWN start time, as e-auksion states it in the
  same row, has passed (`startedOnly` below). The time still comes from
  e-auksion's answer, never from our feed, and a row whose time cannot be
  read is not called live. The 21.09 check that first confirmed this list
  was taken at 10:13, after the start, which is why it looked right then.

  A FAULT MEANS "NOBODY IS LIVE", never "everybody is". `null` is returned for
  anything unexpected — a timeout, a non-200, a body that is not the shape
  above — and the caller shows no live state at all. Marking an auction as
  open when it has closed invites a citizen to a room they cannot bid in;
  missing one costs them a link they can still reach through the lot page.
*/

const CURLOTS_URL =
  process.env.EAUKSION_CURLOTS_URL ??
  "https://e-auksion.uz/api/front/curlots?lang=uz";

/** e-auksion's "Davlat mulkini ijaraga berish" group. */
const RENT_GROUP_ID = 11;

/*
  100 per page, which the endpoint accepts (its own page asks for 12): the 64
  live rent rooms of a busy morning came back in one call. A page cap is
  still kept, so a response that claimed thousands of pages could not turn
  one request into a crawl.
*/
const PER_PAGE = 100;
const MAX_PAGES = 5;

/*
  30 seconds. The rooms turn over in minutes, so a longer cache would show
  finished auctions — the bug this module exists to fix — and a shorter one
  would add requests nobody can perceive the benefit of.
*/
const REVALIDATE_SECONDS = 30;

type CurlotsResponse = {
  totalRows?: number;
  totalPages?: number;
  rows?: {
    id?: number | string;
    lot_number?: string | number;
    auction_date_str?: string;
  }[];
};

/** e-auksion's "DD.MM.YYYY HH:mm", Tashkent time, as epoch ms; null if unreadable. */
function parseStart(raw: unknown): number | null {
  const m = /^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})$/.exec(
    String(raw ?? "").trim(),
  );
  if (!m) return null;
  const [, d, mo, y, h, mi] = m.map(Number);
  // Tashkent is UTC+5 all year — no daylight saving.
  const ms = Date.UTC(y, mo - 1, d, h - 5, mi);
  return Number.isFinite(ms) ? ms : null;
}

interface CurrentLot {
  lot: string;
  /** When e-auksion says the auction starts; null if it gave no readable time. */
  startsAt: number | null;
}

function curlotsBody(page: number): string {
  return JSON.stringify({
    sort_type: 3,
    confiscant_groups_id: RENT_GROUP_ID,
    confiscant_categories_id: null,
    regions_id: null,
    areas_id: null,
    mahallas_id: null,
    address: "",
    lot_number: "",
    hashtag: "",
    date_from: null,
    date_to: null,
    auction_date: null,
    is_term_order: -1,
    exec_order_type: 0,
    lot_type: 0,
    auction_type: 0,
    finished_auction_status: 0,
    filtered_auction_status: 0,
    is_ownership: -1,
    orderby_: 0,
    current_page: page,
    per_page: PER_PAGE,
    dynamic_filters: [],
    bank_id: null,
  });
}

/*
  Cached with `unstable_cache` rather than fetch's own cache, because this is
  a POST — the same choice listings.ts and rent-contracts.ts make for theirs.
  A failure THROWS instead of returning an empty answer, so an outage is never
  written into the cache as "nothing is live" for the next 30 seconds.
*/
const fetchLiveRentLots = unstable_cache(
  async (): Promise<CurrentLot[]> => {
    const lots = new Map<string, CurrentLot>();

    for (let page = 1; page <= MAX_PAGES; page++) {
      const res = await fetch(CURLOTS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: curlotsBody(page),
        signal: AbortSignal.timeout(8_000),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`curlots responded ${res.status}`);

      const json = (await res.json()) as CurlotsResponse;
      if (!Array.isArray(json.rows)) {
        throw new Error("curlots response carried no rows array");
      }

      /*
        `lot_number` is what our own listings carry, and `id` repeats it in
        the responses seen so far — kept as a fallback, but neither is trusted
        to be a number: anything that is not a plain lot id is dropped rather
        than passed to the browser.
      */
      for (const row of json.rows) {
        const raw = String(row.lot_number ?? row.id ?? "").trim();
        if (/^\d{1,18}$/.test(raw)) {
          lots.set(raw, {
            lot: raw,
            startsAt: parseStart(row.auction_date_str),
          });
        }
      }

      const totalPages = Number(json.totalPages ?? 1);
      if (!Number.isFinite(totalPages) || page >= totalPages) break;
    }

    return [...lots.values()];
  },
  ["live-rent-lots"],
  { revalidate: REVALIDATE_SECONDS },
);

/**
 * The day's lots whose start time has come. Filtered on every read, not
 * inside the 30-second cache, so a room turns live at its own minute rather
 * than up to half a minute later.
 */
function startedOnly(lots: CurrentLot[], now = Date.now()): string[] {
  return lots
    .filter((l) => l.startsAt != null && l.startsAt <= now)
    .map((l) => l.lot);
}

/**
 * Lot numbers whose bidding room is open, or `null` if the list cannot be
 * read. Numbers only — this call is about WHICH lots, and everything else
 * about a lot already comes from our own feed.
 */
export async function getLiveAuctionLots(): Promise<string[] | null> {
  try {
    return startedOnly(await fetchLiveRentLots());
  } catch (error) {
    console.warn(
      "[live-auctions] current lots unavailable:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

/**
 * The lots being bid on right now, as full listings.
 *
 * TWO SERVICES, EACH ANSWERING WHAT ONLY IT CAN. e-auksion says WHICH lots
 * are in a room; our own feed says what each lot IS — its title, place, area,
 * price and photograph. So the list above is used as a filter over the
 * listings we already hold, and nothing is rendered from the current-lots
 * rows themselves.
 *
 * A LIVE LOT WE DO NOT HOLD IS DROPPED, not half-drawn from the other
 * service's row. e-auksion runs sales we have no part in — vehicles, movable
 * property, other agencies' assets — and its row carries a name and a date
 * but no area, no region slug and no order id, so a card built from one would
 * be a different, thinner card claiming to be the same thing. Our feed is
 * also cached for minutes at a time, so a lot listed in the last few minutes
 * can be missing; it appears on the next revalidation.
 *
 * Returns an empty array when nothing is live AND when the list cannot be
 * read — the caller cannot tell those apart, deliberately: both mean "show no
 * live auctions", and the alternative is inviting a citizen into a room that
 * has closed.
 */
export async function getLiveAuctionListings(): Promise<Listing[]> {
  const live = await getLiveAuctionLots();
  if (!live || live.length === 0) return [];

  const wanted = new Set(live);
  const { listings } = await getListings({});

  /*
    Every match, uncut. The homepage strip shows the first
    `LIVE_STRIP_LIMIT` and needs the full count to decide whether to link to
    /joriy-savdolar; that page shows them all. A cap here would make the count
    lie to both.
  */
  return listings.filter(
    (listing) =>
      (listing.lotNumber && wanted.has(listing.lotNumber)) ||
      wanted.has(listing.id),
  );
}
