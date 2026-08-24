import "server-only";

import { unstable_cache } from "next/cache";
import { z } from "zod";

import { TASHKENT_OFFSET_MS } from "@/lib/format";
import { regions } from "@/content/regions";
import { featuredListings } from "@/content/homepage";
import { mockListings } from "@/content/listings-mock";
import type {
  Listing,
  ListingQuery,
  ListingType,
  RegionSummary,
  SoldLot,
} from "@/types/content";

/*
  Listings access.

  Shaped for the e-auksion service from the start: `getListings` calls
  `LISTINGS_API_URL` when it is configured and falls back to local records
  otherwise, so switching to live data is an environment variable rather than
  a refactor. Filtering is applied either way — the API is asked to filter,
  the fallback filters in memory — so callers never learn which answered.

  `mapApiLot` is the single place upstream field names appear; nothing else in
  the app touches them. It is now written against real responses rather than a
  guessed shape — see the block comment above it for the service's contract.
*/

const LISTING_TYPES = [
  "noturar",
  "turar",
  "ishlab-chiqarish",
  "mamuriy",
] as const;

/** The sentinel the Radix Select uses for "no filter". */
const ALL = "all";

/** `"50-200"`, `"1000-"`, `"-500"`. Anything else yields no bound. */
const rangeSchema = z.string().regex(/^\d*-\d*$/);

/** First value only — `?hudud=a&hudud=b` should not crash the page. */
function first(raw: string | string[] | undefined): string | undefined {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v && v.length > 0 ? v : undefined;
}

function parseRange(
  raw: string | string[] | undefined,
): [number | undefined, number | undefined] {
  const value = first(raw);
  // `all` is the Select's "no filter" sentinel and reaches us on every submit
  // for any field the user did not touch.
  if (!value || value === ALL) return [undefined, undefined];

  const parsed = rangeSchema.safeParse(value);
  if (!parsed.success) return [undefined, undefined];

  const [lo, hi] = parsed.data.split("-");
  return [lo ? Number(lo) : undefined, hi ? Number(hi) : undefined];
}

/* ── Savdo kuni ───────────────────────────────────────────────────────── */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * URL key for the exact auction DATE — the catalogue's "Savdo kuni" field.
 *
 * `?savdo=2026-08-27`. ISO in the URL because it sorts, is unambiguous about
 * day-vs-month, and is what the data already carries; the field displays it as
 * 27.08.2026, which is what a citizen reads.
 */
export const AUCTION_DAY_KEY = "savdo";

/**
 * URL key for the day WINDOW — the homepage strip's chips.
 *
 * A separate key from `savdo` on purpose. The two answer different questions
 * ("auctions on this date" vs "auctions in this stretch of days") and carry
 * different grammars, and one key holding both would have to be disambiguated
 * by inspecting the value. They are also scoped differently: `savdo` is a
 * catalogue filter carried by `FILTER_KEYS`, while `muddat` belongs to the
 * upcoming-auctions strip alone and is read nowhere else.
 */
export const AUCTION_WINDOW_KEY = "muddat";

/**
 * The windows offered in the UI.
 *
 * DISJOINT and ADJACENT: 0-1, 1-3, 3-5 days. They do not overlap, so a lot
 * falls in at most one of them and the counts never contain one another —
 * nested windows ("within 1 / within 3 / within 5") were the first shape and
 * were wrong for a filter, because "3 kun" then included everything "1 kun"
 * already showed.
 *
 * They cover the first five days only, NOT the whole future. Anything further
 * out is reachable through the "Hammasi" chip, which applies no window at all
 * — so the three counts are a subset of that one and are not meant to sum to
 * it.
 *
 * `value` is the URL value and uses the same `lo-hi` range grammar as `maydon`
 * and `narx` — `parseRange` below reads all three. `labelKey` is its message
 * key under the `auctionWindow` namespace; it lives here so the dropdown and
 * the chips cannot label the same URL value differently.
 */
export const AUCTION_WINDOWS = [
  { value: "0-1", labelKey: "upTo1" },
  { value: "1-3", labelKey: "from1to3" },
  { value: "3-5", labelKey: "from3to5" },
] as const;

/**
 * The offered window the URL currently names, or null.
 *
 * Only for the CONTROLS — which chip is current, what the dropdown shows.
 * Filtering goes through `parseListingQuery`, which accepts any range the
 * grammar allows, so a hand-edited `?savdo=7-14` still narrows the results
 * even though no control can represent it.
 */
export function activeAuctionWindow(
  searchParams: Record<string, string | string[] | undefined>,
): string | null {
  const value = first(searchParams[AUCTION_WINDOW_KEY]);
  if (!value || value === ALL) return null;
  return AUCTION_WINDOWS.some((w) => w.value === value) ? value : null;
}

/**
 * `?savdo=2026-08-27` → "2026-08-27". Anything else yields no filter.
 *
 * The round-trip check is what rejects 2026-02-31: it matches the pattern and
 * `Date` silently rolls it forward to 3 March, which would filter the
 * catalogue by a day the reader never asked for. Comparing the parsed date
 * back to the string catches every such rollover.
 */
export function parseAuctionDay(
  searchParams: Record<string, string | string[] | undefined>,
): string | undefined {
  const value = first(searchParams[AUCTION_DAY_KEY]);
  if (!value || value === ALL) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;

  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10) === value ? value : undefined;
}

/**
 * When a lot's auction opens, in epoch milliseconds, or null.
 *
 * Null covers all three of "no date", "an unparseable date" and — at the call
 * sites below — is paired with a check that the moment is still ahead of us.
 * Shared so the catalogue filter and the homepage strip cannot drift into
 * disagreeing about which lots count as upcoming.
 */
function auctionAt(listing: Listing): number | null {
  if (!listing.auctionDate) return null;
  const t = new Date(listing.auctionDate).getTime();
  return Number.isFinite(t) ? t : null;
}

/**
 * Raw `searchParams` → typed query.
 *
 * Each field is validated INDEPENDENTLY, and a field that fails is simply
 * dropped. That is not a style preference — it is the fix for a real bug.
 *
 * The search form submits every control on every submit, so an untouched
 * dropdown arrives as `maydon=all`. Validating the whole object at once meant
 * that single unparseable value failed the entire schema, and the
 * `if (!success) return {}` fallback then discarded the filters the user HAD
 * chosen. Picking a region and pressing Qidirish returned the full catalogue.
 *
 * Per-field parsing also holds the original intent: a hand-edited URL should
 * narrow the results or be ignored, never produce an error page.
 */
export function parseListingQuery(
  searchParams: Record<string, string | string[] | undefined>,
): ListingQuery {
  const hudud = first(searchParams.hudud);
  const tuman = first(searchParams.tuman);
  const tur = first(searchParams.tur);

  const [minArea, maxArea] = parseRange(searchParams.maydon);
  // The price filter is expressed in millions in the UI.
  const [minPriceM, maxPriceM] = parseRange(searchParams.narx);

  return {
    region: hudud && hudud !== ALL ? hudud : undefined,
    // Upstream's own district name, used verbatim as the URL value. There is
    // no slug to map through, so `?tuman=Jomboy tumani` is matched against
    // exactly the string the service sent.
    district: tuman && tuman !== ALL ? tuman : undefined,
    type:
      tur && tur !== ALL && (LISTING_TYPES as readonly string[]).includes(tur)
        ? (tur as ListingType)
        : undefined,
    minArea,
    maxArea,
    minPrice: minPriceM != null ? minPriceM * 1_000_000 : undefined,
    maxPrice: maxPriceM != null ? maxPriceM * 1_000_000 : undefined,
    auctionDate: parseAuctionDay(searchParams),
    /*
      Never read from the URL here. The day window is the upcoming-auctions
      strip's own filter under its own key, and `getUpcomingAuctions` sets
      these two directly — so `?muddat=` cannot narrow the catalogue behind a
      panel that has no control for it.
    */
  };
}

/**
 * Every query key the search form owns.
 *
 * Exists because it did NOT, and that caused a real bug. The list of keys to
 * carry across a navigation was written out by hand in three places — the
 * homepage "see all" link, the catalogue's pager, and the section's "Barcha
 * obyektlar" link. Adding `tuman` to the parser updated none of them, so
 * filtering to one district and paging to page 2 silently widened the results
 * from 16 lots to 116: the same page, a different search.
 *
 * Add a filter here and every link that forwards filters picks it up.
 */
export const FILTER_KEYS = [
  "hudud",
  "tuman",
  "tur",
  "maydon",
  "narx",
  AUCTION_DAY_KEY,
] as const;

/*
  `muddat` is deliberately NOT here. It belongs to the upcoming-auctions strip,
  which exists on one page and reads it directly; carrying it into the
  catalogue's links would put a parameter in every pager URL that nothing on
  that page can see, change or explain. The two places that do own it — the
  chips and the panel's hidden input — handle it explicitly.
*/

/*
  Re-exported, not defined here: this module is `server-only`, and the explorer
  is a client component that needs the key name. See lib/listings-view.ts.

  `buildFilterQuery` below carries the view despite it not being a filter,
  because the question that helper answers is "what must survive a
  navigation", and a second mechanism for that is exactly the drift its own
  comment warns about.
*/
export { VIEW_KEY, parseView, type ListingsView } from "@/lib/listings-view";

// A re-export does not bring the names into this module's own scope, and
// `buildFilterQuery` below uses both.
import { VIEW_KEY, parseView } from "@/lib/listings-view";

/**
 * The active filters, serialised for a link.
 *
 * `sahifa` is deliberately NOT carried: changing a filter should return the
 * reader to page 1, not to page 7 of a result set that no longer has one.
 *
 * The open tab IS carried — it is not a filter, but it has to survive the same
 * navigations, and every link built from this helper is one the reader expects
 * to leave them looking at the same thing.
 */
export function buildFilterQuery(
  searchParams: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const value = first(searchParams[key]);
    if (value && value !== ALL) params.set(key, value);
  }
  // Only when it differs from the default, so a plain map view stays on a
  // clean URL rather than carrying `?korinish=xarita` everywhere.
  if (parseView(searchParams) === "royxat") params.set(VIEW_KEY, "royxat");
  return params;
}

/** `basePath` with the active filters appended, if there are any. */
export function withFilters(
  basePath: string,
  searchParams: Record<string, string | string[] | undefined>,
): string {
  const qs = buildFilterQuery(searchParams).toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/** Page number from `?sahifa=`, clamped to a sane lower bound. */
export function parsePage(
  searchParams: Record<string, string | string[] | undefined>,
): number {
  const raw = first(searchParams.sahifa);
  const n = raw ? Number(raw) : 1;
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

/** True when nothing narrows the set — the "show everything" case. */
export function isEmptyQuery(q: ListingQuery): boolean {
  return Object.values(q).every((v) => v === undefined);
}

function filterListings(listings: Listing[], q: ListingQuery): Listing[] {
  /*
    Both bounds resolved once, not per lot. `Date.now()` moving between
    elements would be immaterial at this scale, but a filter whose predicate
    is not constant across the array is the kind of thing that only misbehaves
    under load. Nothing here is cached — the caches sit at `fetchRegion`, on
    data with no clock in it — so reading the clock at request time is safe.
  */
  const now = Date.now();
  /*
    The bounds as instants rather than day counts, so the predicate is two
    comparisons per lot instead of a division. The MINIMUM number of days is
    the LATER instant — three days out is further away than one — which is why
    these are named for the moment, not for the bound.
  */
  const notBefore =
    q.minDaysToAuction != null ? now + q.minDaysToAuction * DAY_MS : undefined;
  const notAfter =
    q.maxDaysToAuction != null ? now + q.maxDaysToAuction * DAY_MS : undefined;

  return listings.filter((l) => {
    if (q.region && l.region !== q.region) return false;
    if (q.district && l.district !== q.district) return false;
    if (q.type && l.type !== q.type) return false;
    if (q.minArea != null && l.area < q.minArea) return false;
    if (q.maxArea != null && l.area > q.maxArea) return false;
    if (q.minPrice != null && l.pricePerYear < q.minPrice) return false;
    if (q.maxPrice != null && l.pricePerYear > q.maxPrice) return false;
    if (q.auctionDate) {
      const at = auctionAt(l);
      // Compared as a Tashkent calendar day, not as an instant: an auction at
      // 10:00 local is 05:00Z, so a naive UTC comparison puts every early
      // morning lot on the previous day.
      if (at == null || auctionDay(at) !== q.auctionDate) return false;
    }
    if (notBefore != null || notAfter != null) {
      const at = auctionAt(l);
      // Past auctions are excluded as well as out-of-range ones: "savdosiga 3
      // kun qoldi" is a claim about the future, and a lot that has already
      // opened is not something a citizen can still prepare an application
      // for.
      if (at == null || at <= now) return false;
      // Exclusive lower, inclusive upper — that pairing is what makes 0-3 and
      // 3-5 meet exactly once, with no lot in both and none in neither.
      if (notBefore != null && at <= notBefore) return false;
      if (notAfter != null && at > notAfter) return false;
    }
    return true;
  });
}

/* ── Upstream adapter ─────────────────────────────────────────────────── */

/*
  The auction service, verified against live responses.

  POST <LISTINGS_API_URL>   HTTP Basic, body:
    { region: 1718, adate: "2026-06-01", bdate: "2026-08-07",
      lot_status: "active" }

  →  { success, title, summary: { name, total_lots, total_start_price,
       total_sold_price, total_rent_area }, data: [ ApiLot… ] }

  Three properties of the service that shape everything below:

  1. `region` is MANDATORY and single. Omitting it, or sending null/0/"",
     returns `success: false` — there is no "whole country" call, so the map's
     national view is a fan-out over all fourteen ids.
  2. The response is NOT paginated: `data.length` equalled `summary.total_lots`
     for every region checked, and `summary.total_start_price` /
     `total_rent_area` matched the sums computed from `data` exactly. That is
     also a useful integrity check if the shape ever drifts.
  3. `adate`/`bdate` bound when a lot was PUBLISHED, not when its auction runs
     — lots dated inside the window carry `auction_date`s after `bdate`.
*/
interface ApiLot {
  order_id?: string;
  lot_number?: string;
  auction_date?: string;
  name?: string;
  /** Decimal string, m². */
  rent_area?: string;
  /**
   * Decimal string, plain so'm — e.g. "1095412.50", not "1.10" mln.
   *
   * Was millions, rounded to 2 decimals (±5,000 so'm of imprecision); the
   * service switched to raw so'm at some point after this integration was
   * first verified. Confirmed both ways against the SAME lot: 24823151 sent
   * "1.10" before, sends "1095412.50" now, and e-auksion's own page for that
   * lot has always shown the exact figure, 1 095 412.50 UZS/year — so this is
   * not a guess, and the new format is strictly more precise than the old one.
   */
  start_price?: string;
  sold_price?: string | null;
  order_status?: string;
  lot_status?: string;
  district_name?: string;
  region_title?: string;
  /** Decimal strings, WGS84. */
  lat?: string;
  lng?: string;
  /**
   * Not sent by THIS endpoint, and that is now handled elsewhere rather than
   * being a gap. Photographs come from the order endpoint, one lot at a time
   * — see lib/data/lot-images.ts for why they cannot be derived from the lot
   * number and why they are fetched lazily instead of with the list.
   *
   * These two names are kept because they cost nothing: if the list ever does
   * start carrying a photo URL, it is picked up with no further change and
   * saves the extra request.
   */
  image?: string;
  photo_url?: string;
}

interface ApiResponse {
  success?: boolean;
  message?: string;
  summary?: { name?: string; total_lots?: number };
  data?: ApiLot[];
}

/**
 * How far back to ask for lots. Results saturate well inside this: widening
 * Samarqand's window from 68 days to two years returned the same 118 lots,
 * because `lot_status: "active"` is already a current-state filter. The margin
 * is for regions with slower turnover.
 */
const WINDOW_DAYS = 180;

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/*
  e-auksion has TWO pages per lot and they are not interchangeable.

    /lot-view?lot_id=…        the offer — terms, documents, "Ariza berish"
    /auction-result?lots_id=… the outcome — what it went for

  Note the parameter is `lot_id` on one and `lots_id` on the other; that is
  their spelling, not a typo here. Both were checked against the live site
  (HTTP 200 for lot 24823145).

  Which one a card links to follows what the card is claiming. An open lot
  sends a citizen to the page where they can still bid; a concluded one sends
  them to the result, because /lot-view for a finished lot shows an offer they
  can no longer take up.
*/
const lotOfferUrl = (lotNumber: string | undefined) =>
  lotNumber ? `https://e-auksion.uz/lot-view?lot_id=${lotNumber}` : undefined;

const lotResultUrl = (lotNumber: string | undefined) =>
  lotNumber
    ? `https://e-auksion.uz/auction-result?lots_id=${lotNumber}`
    : undefined;

function mapApiLot(lot: ApiLot, regionSlug: string): Listing | null {
  const lat = Number(lot.lat);
  const lng = Number(lot.lng);
  // A lot with no usable coordinates cannot go on the map; skip it rather
  // than drop a pin at (0, 0) in the Gulf of Guinea.
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat === 0 && lng === 0) return null;

  // `order_id` is the row; `lot_number` is what a citizen sees on e-auksion.
  const id = lot.order_id ?? lot.lot_number;
  if (!id) return null;

  return {
    id: String(id),
    lotNumber: lot.lot_number,
    /*
      Only ever `order_id` — deliberately NOT the `id` fallback above. The
      photo endpoint keys on the order id, so a lot missing one must carry
      nothing here rather than a lot number that would never match.
    */
    orderId: lot.order_id != null ? String(lot.order_id) : undefined,
    title: lot.name?.trim() || "Nomsiz lot",
    /*
      Region comes from the id we ASKED for, never from `region_title`. The
      service spells names its own way ("Toshkent sh.", "Farg`ona viloyati"
      with a backtick), so matching those strings against our own would fail
      for several regions and silently drop their lots.
    */
    region: regionSlug,
    district: lot.district_name?.trim() || undefined,
    /*
      Left empty rather than filled with the district. e-auksion does hold a
      street address for these lots ("Sherkurgon MFY Ogajon qishlogi 68-uy"),
      but this endpoint does not send it, and repeating the district under a
      field named `address` would claim a precision we do not have.
    */
    address: "",
    // No `type` — upstream does not classify lots. See the note on Listing.
    area: Number(lot.rent_area) || 0,
    // Already plain so'm — see the note on ApiLot.start_price. No scaling.
    pricePerYear: Number(lot.start_price) || 0,
    auctionDate: lot.auction_date,
    lotStatus: lot.lot_status?.trim() || undefined,
    image: lot.image ?? lot.photo_url,
    lat,
    lng,
    auctionUrl: lotOfferUrl(lot.lot_number),
  };
}

/**
 * One region's lots.
 *
 * Cached rather than `fetch`-cached because this is a POST, which Next's fetch
 * cache does not cover. Per region, so the fan-out and the single-region view
 * share entries: filtering to Samarqand reuses what the national map fetched.
 */
const fetchRegion = unstable_cache(
  async (slug: string, apiId: number): Promise<Listing[]> => {
    const base = process.env.LISTINGS_API_URL;
    const user = process.env.API_USER;
    const password = process.env.API_PASSWORD;
    if (!base) return [];

    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - WINDOW_DAYS);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (user && password) {
      headers.Authorization = `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
    }

    const res = await fetch(base, {
      method: "POST",
      headers,
      body: JSON.stringify({
        region: apiId,
        adate: isoDate(from),
        bdate: isoDate(now),
        lot_status: "active",
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`Listings API responded ${res.status}`);

    const json = (await res.json()) as ApiResponse;
    // The service answers 200 with `success: false` for a bad region id, so
    // the status code alone is not enough to trust the body.
    if (!json.success) {
      throw new Error(json.message ?? `Region ${apiId} returned success:false`);
    }

    return (json.data ?? [])
      .map((lot) => mapApiLot(lot, slug))
      .filter((l): l is Listing => l !== null);
  },
  ["listings-by-region"],
  { revalidate: 300, tags: ["listings"] },
);

/* ── Lot status ───────────────────────────────────────────────────────── */

/*
  `lot_status: "active"` is not "still biddable" — 22 of the 1 319 lots it
  returns nationally have in fact concluded. Listing those as available state
  property would send a citizen to bid on something that is already gone, so
  they are excluded from the catalogue.

  Matched on distinctive words rather than whole strings, because upstream
  writes the status as a sentence and punctuation drifts:

    Auksion/Tanlov yakunlandi              13
    Arizalarni qabul qilish yakunlandi      7
    Zaxiradagi g'olibga taklif              1   (offered to the reserve winner)
    Mol-mulk (obyekt) sotilmadi             1

  Deliberately NOT an allowlist of the one open status. An allowlist fails
  closed — reword the open status upstream and the portal shows an empty
  country. This fails open, so the worst case is a concluded lot reappearing,
  and `reportUnknownStatuses` below makes that visible in the logs instead of
  silent. The lots themselves are kept on the Listing with `lotStatus` intact,
  ready for the "so'nggi o'tib ketgan lotlar" section.
*/
const CLOSED_STATUS_MARKERS = ["yakunlandi", "sotilmadi", "zaxiradagi"];

/** The status every open lot currently carries; used only to detect drift. */
const KNOWN_OPEN_STATUS = "arizalarni qabul qilish";

export function isOpenForApplications(listing: Listing): boolean {
  // Fallback records carry no status; they are sample data, not auctions.
  if (!listing.lotStatus) return true;
  const status = listing.lotStatus.toLowerCase();
  return !CLOSED_STATUS_MARKERS.some((marker) => status.includes(marker));
}

/**
 * Logs statuses that are neither recognisably open nor recognisably closed.
 *
 * This is the tripwire for the fail-open choice above: if upstream introduces
 * a new terminal status, its lots stay visible but the wording shows up here
 * rather than nowhere.
 */
function reportUnknownStatuses(listings: Listing[]): void {
  const unknown = new Set<string>();
  for (const l of listings) {
    if (!l.lotStatus) continue;
    const s = l.lotStatus.toLowerCase();
    if (s.includes(KNOWN_OPEN_STATUS)) continue;
    if (CLOSED_STATUS_MARKERS.some((m) => s.includes(m))) continue;
    unknown.add(l.lotStatus);
  }
  if (unknown.size > 0) {
    console.warn(
      "[listings] unrecognised lot_status, shown as available:",
      [...unknown].join(" | "),
    );
  }
}

/* ── Public API ───────────────────────────────────────────────────────── */

/** Verified records first, so real lots outrank mock ones in any ordering. */
const fallbackListings: Listing[] = [...featuredListings, ...mockListings];

export interface ListingsResult {
  listings: Listing[];
  /** True when any record on screen is generated rather than verified. */
  hasMock: boolean;
  source: "api" | "mock";
}

export async function getListings(
  query: ListingQuery = {},
): Promise<ListingsResult> {
  if (process.env.LISTINGS_API_URL) {
    /*
      Ask only for the region in play. With no region filter that is all
      fourteen, in parallel — the service has no national endpoint, so this is
      the national view. Each leg is cached separately, so the expensive case
      warms the cheap one.
    */
    const wanted = query.region
      ? regions.filter((r) => r.slug === query.region)
      : regions;

    const settled = await Promise.allSettled(
      wanted.map((r) => fetchRegion(r.slug, r.apiId)),
    );

    const listings: Listing[] = [];
    const failed: string[] = [];
    for (const [i, result] of settled.entries()) {
      if (result.status === "fulfilled") listings.push(...result.value);
      else failed.push(wanted[i].slug);
    }

    if (failed.length > 0) {
      console.error("[listings] region request(s) failed:", failed.join(", "));
    }

    /*
      One region being down must not empty the whole map, but every region
      being down means we have nothing — fall through to the sample set and
      its visible notice rather than claim the country has no property.
    */
    if (listings.length > 0) {
      reportUnknownStatuses(listings);
      const open = listings.filter(isOpenForApplications);
      return {
        listings: filterListings(open, query),
        hasMock: false,
        source: "api",
      };
    }
  }

  /*
    Never fail the page because the catalogue is unreachable. Someone looking
    for state property is better served by the fallback set plus a visible
    notice than by an error screen.
  */
  const listings = filterListings(fallbackListings, query);
  return {
    listings,
    hasMock: listings.some((l) => l.isMock),
    source: "mock",
  };
}

interface UpcomingLot {
  listing: Listing;
  /** When its auction opens, epoch ms. Parsed once and carried. */
  at: number;
}

/** Lots whose auction is still ahead, with their timestamps resolved. */
function upcomingLots(listings: Listing[], now: number): UpcomingLot[] {
  const out: UpcomingLot[] = [];
  for (const listing of listings) {
    const at = auctionAt(listing);
    if (at == null || at <= now) continue;
    out.push({ listing, at });
  }
  return out;
}

/** The Tashkent calendar day an auction falls on, as "YYYY-MM-DD". */
function auctionDay(at: number): string {
  return new Date(at + TASHKENT_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * Lots from the next auction day, or from an explicit window, as a pool for
 * the homepage rotator.
 *
 * "Next" means the soonest day that still has an auction ahead of it —
 * including today. A day is only ever considered because a lot is actually
 * scheduled on it, so weekends need no special handling: the service simply
 * never returns Saturday or Sunday auctions, and those days fall out on their
 * own rather than by a rule here that could drift out of step with the
 * calendar the auctions actually run on.
 *
 * By default only that one day is returned. Mixing "in 1 day" with "in 12
 * days" made the three cards look arbitrary — the point of the section is
 * imminence, and a card twelve days out is not imminent.
 *
 * WHY A POOL AND NOT THREE
 * The caller shows three at a time and rotates. Sending a pool lets that
 * rotation happen without another request, and the pool is capped because the
 * nearest day can hold hundreds of lots — every one of them would otherwise be
 * serialised into the page.
 *
 * WHY THE SHUFFLE IS SEEDED
 * The legacy site shuffled its region markers with `Math.random()` on every
 * page load, so the page rearranged itself on every refresh and nothing could
 * be pointed at. The seed here is a five-minute bucket — the same window the
 * upstream fetch is cached for — so the pool is stable for as long as the data
 * behind it is, every visitor in that window sees the same thing, and there is
 * no hydration risk.
 *
 * ORDER: SOONEST FIRST, TIES SHUFFLED — one path, whether a window is set or
 * not. The two rules are doing different jobs and neither replaces the other:
 *
 * - Sorting by time is the information. Burying tomorrow's auction below next
 *   week's would answer "what is coming up" backwards.
 * - Shuffling the ties is the variety. Most lots on a given day carry the
 *   SAME timestamp — upstream schedules them all at 10:00 — so without it the
 *   rotator would cycle the same twelve rows of one morning forever, in
 *   whatever order the service happened to return them.
 *
 * The shuffle runs first and the sort is stable (guaranteed since ES2019), so
 * equal timestamps keep their shuffled order while unequal ones are put right.
 *
 * The window is applied by `getListings` rather than here, so the strip and
 * the catalogue decide "is this lot in the 1-3 day bucket" with one predicate
 * instead of two that can disagree at the boundary.
 */
export async function getUpcomingAuctions(
  poolSize = 12,
  /**
   * One of `AUCTION_WINDOWS`’ values, e.g. `"1-3"`. Omit (or pass null) for
   * every upcoming lot — the "Hammasi" chip. Taken as the raw URL value
   * rather than parsed bounds so the range grammar stays inside this module.
   */
  window?: string | null,
): Promise<ListingsResult> {
  const [minDays, maxDays] = window
    ? parseRange(window)
    : [undefined, undefined];
  const windowed = minDays != null || maxDays != null;
  const { listings, source } = await getListings(
    windowed ? { minDaysToAuction: minDays, maxDaysToAuction: maxDays } : {},
  );

  const now = Date.now();
  const pool = upcomingLots(listings, now);
  if (pool.length === 0) {
    return { listings: [], hasMock: false, source };
  }

  /* Mulberry32 — small, fast, and identical everywhere it runs. */
  let state = Math.floor(now / 300_000) >>> 0;
  const rand = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // Fisher-Yates in place; sorting by a random comparator is biased.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // Stable, so the shuffle above survives among equal timestamps — which is
  // most of them, since a day's lots are all scheduled at the same hour.
  pool.sort((a, b) => a.at - b.at);

  const picked = pool.slice(0, poolSize).map((u) => u.listing);
  return {
    listings: picked,
    hasMock: picked.some((l) => l.isMock),
    source,
  };
}

/**
 * How many lots each filter chip would show, keyed by window value.
 *
 * Printed ON the chips, and that is the point rather than decoration: the one
 * real risk with a window filter is pressing a chip, landing on an empty
 * section, and having no way to tell a broken filter from a quiet week. A
 * visible `0` answers that before the click.
 *
 * Counted through `filterListings` rather than by a predicate of its own, so
 * a chip can never advertise a number the results then disagree with.
 *
 * Reads the same cached listing set the section itself does, so this is a few
 * extra passes over an array already in memory — no additional upstream
 * request.
 */
export async function getUpcomingAuctionCounts(): Promise<{
  /** Every upcoming lot — what the "Hammasi" chip shows. */
  all: number;
  byWindow: Record<string, number>;
}> {
  const { listings } = await getListings();

  const byWindow: Record<string, number> = {};
  for (const window of AUCTION_WINDOWS) {
    const [minDays, maxDays] = parseRange(window.value);
    byWindow[window.value] = filterListings(listings, {
      minDaysToAuction: minDays,
      maxDaysToAuction: maxDays,
    }).length;
  }

  return { all: upcomingLots(listings, Date.now()).length, byWindow };
}

/* ── Sold lots ────────────────────────────────────────────────────────── */

/*
  How many lots actually went to a buyer in a calendar year.

  A DIFFERENT QUERY from everything else in this file, in two ways:

  1. No `lot_status`. The catalogue asks for "active" and then drops the
     concluded ones; here the concluded ones ARE the answer.
  2. A window that starts three months before the year. `adate`/`bdate` bound
     the PUBLICATION date, not the auction, so a lot announced in December and
     auctioned in January would fall outside a same-year window. Measured
     against the live service, widening from 2026-01-01 to 2024-01-01 returned
     the identical count (2 977) — so nothing is currently published that far
     ahead — but the lead keeps that true across a new year for 512ms and
     2.7MB instead of 352ms and 2.0MB.

  A SALE is `sold_price > 0`, not a status string. Of 4 468 lots auctioned in
  2026, 2 977 carry a price and the rest concluded without one — unsold,
  withdrawn, or still being formalised. Reading the status instead would mean
  matching nine different Uzbek phrases and re-matching them whenever upstream
  rewords one; a price is unambiguous and it is the thing being claimed.
*/
const SOLD_LEAD_MONTHS = 3;

/**
 * How far back the sold-lot DETAIL is kept from the same response.
 *
 * The hero only needs counts, but "So'nggi savdo kunida sotilgan obyektlar"
 * needs the lots themselves — and it would be absurd to fetch the same 2.7MB
 * twice for that. So one request feeds both.
 *
 * THE WHOLE YEAR, not a rolling window. A six-week cut was tried and was the
 * wrong shape: the hero counts the year, so a results page that quietly
 * covered the last six weeks of it disagreed with the figure directly above
 * it. The cost is small because these entries are PER REGION — a region sells
 * on the order of 200 lots a year, so an entry holds ~50KB rather than the
 * megabyte the national total suggests.
 */
export const fetchSoldYear = unstable_cache(
  async (
    apiId: number,
    year: number,
  ): Promise<{
    total: number;
    /** Lots whose auction has not been held yet. */
    pending: number;
    /** Lots whose auction concluded without a buyer. */
    unsold: number;
    byDistrict: Record<string, number>;
    sales: SoldLot[];
  }> => {
    const base = process.env.LISTINGS_API_URL;
    if (!base)
      return { total: 0, pending: 0, unsold: 0, byDistrict: {}, sales: [] };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const user = process.env.API_USER;
    const password = process.env.API_PASSWORD;
    if (user && password) {
      headers.Authorization = `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
    }

    const lead = new Date(Date.UTC(year, -SOLD_LEAD_MONTHS, 1));

    const res = await fetch(base, {
      method: "POST",
      headers,
      body: JSON.stringify({
        region: apiId,
        adate: isoDate(lead),
        bdate: `${year}-12-31`,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`Listings API responded ${res.status}`);

    const json = (await res.json()) as ApiResponse;
    if (!json.success) {
      throw new Error(json.message ?? `Region ${apiId} returned success:false`);
    }

    /*
    Counted per district as well as in total, because the hero narrows to a
    tuman and re-fetching the same 2.7MB once per district would be absurd.
    The key is upstream's own `district_name`, used verbatim — the same
    string `?tuman=` carries, so the two cannot disagree about spelling.
  */
    const slug = regions.find((r) => r.apiId === apiId)?.slug ?? String(apiId);

    let sold = 0;
    let pending = 0;
    let unsold = 0;
    const byDistrict: Record<string, number> = {};
    const sales: SoldLot[] = [];
    for (const lot of json.data ?? []) {
      if (!lot.auction_date) continue;
      const at = new Date(lot.auction_date).getTime();
      if (!Number.isFinite(at)) continue;
      // The Tashkent calendar year, for the same reason the day filter uses
      // Tashkent: a 10:00 auction on 1 January is 05:00Z, still the 1st, but
      // a 10:00 auction on 31 December is 05:00Z on the 31st either way —
      // it is the January edge that a UTC year would file under the previous
      // one.
      if (auctionDay(at).slice(0, 4) !== String(year)) continue;
      const price = Number(lot.sold_price);

      /*
        THREE OUTCOMES, and conflating any two of them produces a wrong
        headline. Measured over the 4 518 lots the 2026 window returns:

          3 034  sold                 `sold_price > 0`
          1 454  still taking bids    lot_status "…elektron arizalarni qabul
                                      qilish", auction date in the future
             30  ended with no buyer  concluded, no price

        The obvious shortcut — "not sold" — makes the other 1 484 one bucket
        and yields a 67% sale rate, which is simply the wrong number: it
        counts auctions that HAVE NOT HAPPENED YET as failures. Among lots
        that actually concluded the rate is 3 034 of 3 064, or 99.0%.

        Pending is identified by `lot_status` rather than by comparing the
        auction date to now, because a cached entry outlives the moment it
        was computed — a date comparison inside a day-long cache would keep
        answering as though it were still yesterday.
      */
      if (!Number.isFinite(price) || price <= 0) {
        if (lot.lot_status?.includes("arizalarni qabul qilish")) pending++;
        else unsold++;
        continue;
      }

      sold++;
      const district = lot.district_name?.trim();
      if (district) byDistrict[district] = (byDistrict[district] ?? 0) + 1;

      const id = lot.order_id ?? lot.lot_number;
      const start = Number(lot.start_price);
      if (!id) continue;
      sales.push({
        id: String(id),
        title: lot.name?.trim() || "Nomsiz lot",
        // The region we ASKED for, never `region_title` — upstream spells
        // those its own way. Same rule as `mapApiLot`.
        region: slug,
        district,
        area: Number(lot.rent_area) || 0,
        startPrice: Number.isFinite(start) ? start : 0,
        soldPrice: price,
        auctionDate: lot.auction_date,
        lotNumber: lot.lot_number,
        orderId: lot.order_id != null ? String(lot.order_id) : undefined,
        // The RESULT page, not the offer: this lot is already sold.
        auctionUrl: lotResultUrl(lot.lot_number),
      });
    }
    return { total: sold, pending, unsold, byDistrict, sales };
  },
  // v3: `recent` (six weeks) became `sales` (the whole year).
  // v4: added `pending` / `unsold` for the statistics page.
  ["listings-sold-v4"],
  /*
    A day, not the five minutes the catalogue uses. This is a year-to-date
    total that moves by a few lots a day, and the query is the heaviest one
    the app makes — 14 regions, ~2.7MB. Nothing on screen depends on it being
    fresher than that.
  */
  { revalidate: 86_400, tags: ["listings"] },
);

/**
 * Lots sold at auction in `year` — nationally, in one region, or in one
 * district of one region.
 *
 * Null rather than a number when the service is not configured, or when ANY
 * region's request fails. A partial sum would be a wrong figure presented as
 * a fact on a state portal, which is worse than the card not being there —
 * so the caller drops the card instead of showing a total it cannot stand
 * behind.
 *
 * `districtName` is upstream's own string and needs no region to be given
 * with it, but passing one avoids fanning out over fourteen.
 */
export async function getSoldCount(
  year: number,
  regionSlug?: string,
  districtName?: string,
): Promise<number | null> {
  if (!process.env.LISTINGS_API_URL) return null;

  const wanted = regionSlug
    ? regions.filter((r) => r.slug === regionSlug)
    : regions;
  if (wanted.length === 0) return null;

  const settled = await Promise.allSettled(
    wanted.map((r) => fetchSoldYear(r.apiId, year)),
  );

  const failed = wanted
    .filter((_, i) => settled[i].status === "rejected")
    .map((r) => r.slug);
  if (failed.length > 0) {
    console.error(
      "[listings] sold-count request(s) failed:",
      failed.join(", "),
    );
    return null;
  }

  const results = settled.flatMap((r) =>
    r.status === "fulfilled" ? [r.value] : [],
  );

  if (districtName) {
    return results.reduce(
      (sum, r) => sum + (r.byDistrict[districtName] ?? 0),
      0,
    );
  }
  return results.reduce((sum, r) => sum + r.total, 0);
}

/**
 * URL keys for the sold-lot date RANGE.
 *
 * A range, not the catalogue's single `savdo` day, because the two pages are
 * asked different questions. "What is being sold on the 27th" is a plan; "what
 * went in July" is a record, and a record is read across a stretch of days.
 * Same ISO grammar either way, so a date means the same thing on both pages.
 */
export const SOLD_FROM_KEY = "dan";
export const SOLD_TO_KEY = "gacha";

export interface SoldQuery {
  region?: string;
  district?: string;
  /** Inclusive, "YYYY-MM-DD" in Tashkent time. */
  from?: string;
  to?: string;
}

/** Reads the sold page's filters, dropping anything unparseable. */
export function parseSoldQuery(
  searchParams: Record<string, string | string[] | undefined>,
): SoldQuery {
  const hudud = first(searchParams.hudud);
  const tuman = first(searchParams.tuman);
  const from = parseAuctionDay({
    [AUCTION_DAY_KEY]: searchParams[SOLD_FROM_KEY],
  });
  const to = parseAuctionDay({ [AUCTION_DAY_KEY]: searchParams[SOLD_TO_KEY] });

  return {
    region: hudud && hudud !== ALL ? hudud : undefined,
    district: tuman && tuman !== ALL ? tuman : undefined,
    /*
      Swapped rather than rejected when the reader picks them the wrong way
      round. Two calendars invite exactly that, and a page that answers "no
      results" to a range it could obviously have read is worse than one that
      simply reads it.
    */
    from: from && to && from > to ? to : from,
    to: from && to && from > to ? from : to,
  };
}

/**
 * Every sale of the current year, newest auction first.
 *
 * The list page's source. `getRecentlySold` below picks one day out of the
 * same data for the homepage strip — one upstream fetch serves both, and the
 * two can never disagree about what sold for how much, nor about how many.
 *
 * Date bounds are matched on the TASHKENT calendar day, the same way the
 * catalogue's `savdo` filter is: a 10:00 auction is 05:00Z, so a UTC
 * comparison would file every morning sitting under the previous date.
 */
export async function getSoldLots(query: SoldQuery = {}): Promise<SoldLot[]> {
  if (!process.env.LISTINGS_API_URL) return [];

  const year = new Date(Date.now() + TASHKENT_OFFSET_MS).getUTCFullYear();
  const wanted = query.region
    ? regions.filter((r) => r.slug === query.region)
    : regions;
  if (wanted.length === 0) return [];

  const settled = await Promise.allSettled(
    wanted.map((r) => fetchSoldYear(r.apiId, year)),
  );

  const failed = wanted
    .filter((_, i) => settled[i].status === "rejected")
    .map((r) => r.slug);
  if (failed.length > 0) {
    console.error("[listings] sold-lot request(s) failed:", failed.join(", "));
  }

  return settled
    .flatMap((r) => (r.status === "fulfilled" ? r.value.sales : []))
    .filter((lot) => {
      if (query.district && lot.district !== query.district) return false;
      if (!query.from && !query.to) return true;
      const day = auctionDay(new Date(lot.auctionDate).getTime());
      if (query.from && day < query.from) return false;
      if (query.to && day > query.to) return false;
      return true;
    })
    .sort((a, b) => {
      const byDate =
        new Date(b.auctionDate).getTime() - new Date(a.auctionDate).getTime();
      // Same sitting: the biggest sale leads, as on the homepage strip.
      return byDate !== 0 ? byDate : b.soldPrice - a.soldPrice;
    });
}

/**
 * Every day that produced a sale, with how many, ascending.
 *
 * What the two calendars on the sold page grey out against. Its own function
 * rather than `getAuctionDays`, which answers the opposite question — the days
 * that have lots still FOR sale.
 *
 * Scoped by region and district but NOT by the dates themselves: a picker that
 * only offered the days already inside the chosen range could never widen it.
 */
export async function getSoldDays(
  query: SoldQuery = {},
): Promise<Array<{ date: string; count: number }>> {
  const lots = await getSoldLots({
    region: query.region,
    district: query.district,
  });

  const counts = new Map<string, number>();
  for (const lot of lots) {
    const day = auctionDay(new Date(lot.auctionDate).getTime());
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Districts that have produced a sale this year, keyed by region slug. */
export async function getSoldDistrictsByRegion(): Promise<
  Record<string, string[]>
> {
  const lots = await getSoldLots();
  const byRegion = new Map<string, Set<string>>();
  for (const lot of lots) {
    if (!lot.district) continue;
    const set = byRegion.get(lot.region) ?? new Set<string>();
    set.add(lot.district);
    byRegion.set(lot.region, set);
  }
  return Object.fromEntries(
    [...byRegion.entries()].map(([slug, set]) => [
      slug,
      // Uzbek collation, same as getDistricts — "sh" and "ch" sort after "t".
      [...set].sort((a, b) => a.localeCompare(b, "uz")),
    ]),
  );
}

/**
 * The most recent auction day that produced sales, and what went on it.
 *
 * WHY A WHOLE DAY rather than "the last N sales": the auction calendar runs in
 * sittings, not continuously — 55 lots went on 21 August, none on the 20th,
 * five on the 19th. "The last 12 sales" would silently splice two or three
 * different sittings together and the section's heading would stop being true.
 *
 * WHAT IS NOT HERE, and must not be added: the order endpoint returns the
 * winner's full name, passport number, PINFL, phone and home address for every
 * one of these lots. None of it is on `SoldLot`, and publishing any of it on a
 * public portal would be a personal-data breach. The sale is public; the buyer
 * is not.
 *
 * NO BID COUNT EITHER. Neither service reports how many raises a lot took —
 * there is no bid history, participant count or step field anywhere in either
 * response. The card shows the rise from the start price instead, which is
 * arithmetic on two published numbers rather than an inference about how the
 * auction ran. (The raises do land on a 10%-of-start grid in 906 of 997 sales,
 * so a step count could be reverse-engineered — but 91 sales do not fit it,
 * and a derived number printed as fact is not something this portal does.)
 *
 * Reads the same cached per-region fetch the hero's sold counter does, so this
 * section costs no additional upstream request.
 */
export async function getRecentlySold(
  limit = 12,
): Promise<{ day: string; lots: SoldLot[] } | null> {
  if (!process.env.LISTINGS_API_URL) return null;

  const year = new Date(Date.now() + TASHKENT_OFFSET_MS).getUTCFullYear();
  const settled = await Promise.allSettled(
    regions.map((r) => fetchSoldYear(r.apiId, year)),
  );

  const sales = settled.flatMap((r) =>
    r.status === "fulfilled" ? r.value.sales : [],
  );
  if (sales.length === 0) return null;

  /*
    Grouped by the TASHKENT calendar day. A 10:00 auction is 05:00Z, so a UTC
    day would file every morning sitting under the previous date — and the
    heading names that date.
  */
  const withDay = sales.map((lot) => ({
    lot,
    at: new Date(lot.auctionDate).getTime(),
  }));
  const latest = withDay.reduce(
    (max, s) => (auctionDay(s.at) > max ? auctionDay(s.at) : max),
    auctionDay(withDay[0].at),
  );

  const lots = withDay
    .filter((s) => auctionDay(s.at) === latest)
    // Biggest sale first: on a day of 55 lots the ones worth showing are the
    // ones that actually went somewhere.
    .sort((a, b) => b.lot.soldPrice - a.lot.soldPrice)
    .slice(0, limit)
    .map((s) => s.lot);

  return { day: latest, lots };
}

/**
 * Every day that has at least one lot, with how many, ascending.
 *
 * What the "Savdo kuni" calendar renders. e-auksion lets a citizen pick any
 * square on the calendar and most of them return nothing — auctions cluster on
 * the working days the service schedules them for. Passing the real days lets
 * the picker grey out the rest, so the control cannot produce an empty result
 * at all.
 *
 * `query` is the REST of the active search, so the days offered are the days
 * that have lots matching it. Its own `auctionDate` is dropped: a picker that
 * only offered the day already chosen could never be changed.
 *
 * Reads through the same cached per-region fetches the results do.
 */
export async function getAuctionDays(
  query: ListingQuery = {},
): Promise<Array<{ date: string; count: number }>> {
  const { listings } = await getListings({ ...query, auctionDate: undefined });

  const counts = new Map<string, number>();
  for (const listing of listings) {
    const at = auctionAt(listing);
    if (at == null) continue;
    const day = auctionDay(at);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }

  // ISO dates sort correctly as plain strings — that is most of why the URL
  // carries them in this form rather than as 27.08.2026.
  return [...counts.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Districts for every region at once, keyed by region slug.
 *
 * The search panel needs this to narrow the tuman dropdown the instant a
 * region is picked, without a round-trip. It is ~200 short strings (a few KB)
 * and comes from the same cached per-region fetches the results use, so the
 * fan-out costs nothing extra.
 */
export async function getDistrictsByRegion(): Promise<
  Record<string, string[]>
> {
  const entries = await Promise.all(
    regions.map(async (r) => [r.slug, await getDistricts(r.slug)] as const),
  );
  return Object.fromEntries(entries.filter(([, list]) => list.length > 0));
}

/**
 * Tumans/shahars that currently have lots in a region.
 *
 * Derived from the lots themselves rather than from a static list, so the
 * dropdown can never offer a district with nothing behind it. Region-scoped
 * because the country has ~200 districts — one flat list would be unusable,
 * and the per-region fetch it reads from is already cached.
 */
export async function getDistricts(regionSlug: string): Promise<string[]> {
  const { listings } = await getListings({ region: regionSlug });
  const names = new Set(
    listings.map((l) => l.district).filter((d): d is string => Boolean(d)),
  );
  /*
    Sorted with the Uzbek collation, not the default one. In the Uzbek Latin
    alphabet `sh` and `ch` are single letters placed after `t`, so
    "Samarqand shahri" correctly follows "Samarqand tumani". That looks like a
    sorting bug next to English expectations and is not one — leave it.
  */
  return [...names].sort((a, b) => a.localeCompare(b, "uz"));
}

/**
 * Collapses a set of lots into one row per region.
 *
 * This is what the "Ro'yxat" tab shows: a region-level overview rather than a
 * wall of individual cards. Regions with no matching lot are dropped, so the
 * list always reflects the active filters.
 */
export function summariseByRegion(listings: Listing[]): RegionSummary[] {
  const byRegion = new Map<string, Listing[]>();
  for (const l of listings) {
    const arr = byRegion.get(l.region);
    if (arr) arr.push(l);
    else byRegion.set(l.region, [l]);
  }

  const summaries: RegionSummary[] = [];

  for (const region of regions) {
    const lots = byRegion.get(region.slug);
    if (!lots || lots.length === 0) continue;

    const prices = lots.map((l) => l.pricePerYear);

    /*
      `topType` only exists where the source classifies lots — the live service
      does not, so for API data this is undefined and the row falls back to the
      district count. Counting only lots that HAVE a type keeps the label
      honest: "mostly Ma'muriy bino" must not be decided by three typed sample
      records standing in for ninety untyped real ones.
    */
    const typeCounts = new Map<ListingType, number>();
    for (const l of lots) {
      if (!l.type) continue;
      typeCounts.set(l.type, (typeCounts.get(l.type) ?? 0) + 1);
    }
    const topType = [...typeCounts.entries()].sort(
      (a, b) => b[1] - a[1],
    )[0]?.[0];

    const districts = new Set(
      lots.map((l) => l.district).filter((d): d is string => Boolean(d)),
    );

    summaries.push({
      slug: region.slug,
      name: region.name,
      lat: region.lat,
      lng: region.lng,
      count: lots.length,
      totalArea: lots.reduce((s, l) => s + l.area, 0),
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      avgPrice: Math.round(prices.reduce((s, p) => s + p, 0) / prices.length),
      topType,
      districtCount: districts.size || undefined,
    });
  }

  // Busiest regions first — that is the useful ordering when scanning.
  return summaries.sort((a, b) => b.count - a.count);
}
