import "server-only";

import { unstable_cache } from "next/cache";
import { z } from "zod";

import { regions } from "@/content/regions";
import { featuredListings } from "@/content/homepage";
import { mockListings } from "@/content/listings-mock";
import type {
  Listing,
  ListingQuery,
  ListingType,
  RegionSummary,
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
export const FILTER_KEYS = ["hudud", "tuman", "tur", "maydon", "narx"] as const;

/**
 * The active filters, serialised for a link.
 *
 * `sahifa` is deliberately NOT carried: changing a filter should return the
 * reader to page 1, not to page 7 of a result set that no longer has one.
 */
export function buildFilterQuery(
  searchParams: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const value = first(searchParams[key]);
    if (value && value !== ALL) params.set(key, value);
  }
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
  return listings.filter((l) => {
    if (q.region && l.region !== q.region) return false;
    if (q.district && l.district !== q.district) return false;
    if (q.type && l.type !== q.type) return false;
    if (q.minArea != null && l.area < q.minArea) return false;
    if (q.maxArea != null && l.area > q.maxArea) return false;
    if (q.minPrice != null && l.pricePerYear < q.minPrice) return false;
    if (q.maxPrice != null && l.pricePerYear > q.maxPrice) return false;
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
  /** Decimal string, MILLIONS of so'm — see SOM_PER_UNIT. */
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
   * Not currently sent. e-auksion DOES hold photographs for these lots, at
   * https://media.e-auksion.uz/i/<hash>_T.jpg — but `<hash>` is an opaque
   * content digest with no relation to the lot number, so a URL cannot be
   * derived; the reference has to come as data. Its own lot-info endpoint is
   * behind a proof-of-work anti-bot challenge, so scraping it is not an
   * option either. If the service starts sending a photo URL under either of
   * these names it is picked up automatically — CSP already allows the host.
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
 * `start_price` is quoted in millions of so'm.
 *
 * Not a guess: at this factor the live set works out to a median ~188 000
 * so'm/m²/year, which sits inside the range of the verified records already in
 * `content/homepage.ts` (258 000 – 686 000). Read as plain so'm the same lots
 * would rent for under a so'm per square metre per year. Every other candidate
 * unit is wrong by a factor of a million, so this is the only reading the
 * portal's own verified figures support — but it IS an inference about money
 * on a state portal, so it lives here, named, rather than inline.
 */
const SOM_PER_UNIT = 1_000_000;

/**
 * How far back to ask for lots. Results saturate well inside this: widening
 * Samarqand's window from 68 days to two years returned the same 118 lots,
 * because `lot_status: "active"` is already a current-state filter. The margin
 * is for regions with slower turnover.
 */
const WINDOW_DAYS = 180;

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

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
    pricePerYear: (Number(lot.start_price) || 0) * SOM_PER_UNIT,
    auctionDate: lot.auction_date,
    lotStatus: lot.lot_status?.trim() || undefined,
    image: lot.image ?? lot.photo_url,
    lat,
    lng,
    auctionUrl: lot.lot_number
      ? `https://e-auksion.uz/lot-view?lot_id=${lot.lot_number}`
      : undefined,
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

/**
 * Tumans/shahars that currently have lots in a region.
 *
 * Derived from the lots themselves rather than from a static list, so the
 * dropdown can never offer a district with nothing behind it. Region-scoped
 * because the country has ~200 districts — one flat list would be unusable,
 * and the per-region fetch it reads from is already cached.
 */
/**
 * Districts for every region at once, keyed by region slug.
 *
 * The search panel needs this to narrow the tuman dropdown the instant a
 * region is picked, without a round-trip. It is ~200 short strings (a few KB)
 * and comes from the same cached per-region fetches the results use, so the
 * fan-out costs nothing extra.
 */
export async function getDistrictsByRegion(): Promise<Record<string, string[]>> {
  const entries = await Promise.all(
    regions.map(
      async (r) => [r.slug, await getDistricts(r.slug)] as const,
    ),
  );
  return Object.fromEntries(entries.filter(([, list]) => list.length > 0));
}

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
    const topType = [...typeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

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
