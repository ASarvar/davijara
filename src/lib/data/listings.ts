import "server-only";

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

  The upstream catalogue is the one behind
  https://e-auksion.uz/lots?group=11&index=1&page=1&address=&lt=0&at=0&order=0

  ⚠ That page is a client-rendered SPA, so its JSON response shape could not
  be inspected from the markup. `mapApiLot` below encodes an ASSUMED shape and
  is the single place to correct once the real payload is known — nothing
  else in the app touches the upstream field names.
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
  const tur = first(searchParams.tur);

  const [minArea, maxArea] = parseRange(searchParams.maydon);
  // The price filter is expressed in millions in the UI.
  const [minPriceM, maxPriceM] = parseRange(searchParams.narx);

  return {
    region: hudud && hudud !== ALL ? hudud : undefined,
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
    if (q.type && l.type !== q.type) return false;
    if (q.minArea != null && l.area < q.minArea) return false;
    if (q.maxArea != null && l.area > q.maxArea) return false;
    if (q.minPrice != null && l.pricePerYear < q.minPrice) return false;
    if (q.maxPrice != null && l.pricePerYear > q.maxPrice) return false;
    return true;
  });
}

/* ── Upstream adapter ─────────────────────────────────────────────────── */

/**
 * ASSUMED e-auksion lot shape. Correct this against the real response; it is
 * the only place upstream field names appear.
 */
interface ApiLot {
  id?: number | string;
  lot_id?: number | string;
  name?: string;
  address?: string;
  region_id?: number | string;
  area?: number;
  start_price?: number;
  lat?: number;
  lng?: number;
  image?: string;
}

function mapApiLot(lot: ApiLot): Listing | null {
  const lat = Number(lot.lat);
  const lng = Number(lot.lng);
  // A lot with no usable coordinates cannot go on the map; skip rather than
  // dropping a pin at (0, 0) in the Gulf of Guinea.
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const id = String(lot.lot_id ?? lot.id ?? "");
  if (!id) return null;

  return {
    id,
    lotNumber: id,
    title: lot.name ?? "Nomsiz lot",
    region: String(lot.region_id ?? ""),
    address: lot.address ?? "",
    type: "noturar",
    area: Number(lot.area) || 0,
    pricePerYear: Number(lot.start_price) || 0,
    lat,
    lng,
    image: lot.image,
    auctionUrl: `https://e-auksion.uz/lot-view?lot_id=${id}`,
  };
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
  const base = process.env.LISTINGS_API_URL;

  if (base) {
    try {
      const params = new URLSearchParams({ group: "11", index: "1", page: "1" });
      if (query.region) params.set("address", query.region);

      const res = await fetch(`${base}/lots?${params}`, {
        // Lots change through the day but not by the second.
        next: { revalidate: 300, tags: ["listings"] },
      });
      if (!res.ok) throw new Error(`Listings API responded ${res.status}`);

      const raw = (await res.json()) as { data?: ApiLot[] } | ApiLot[];
      const lots = Array.isArray(raw) ? raw : (raw.data ?? []);
      const listings = lots
        .map(mapApiLot)
        .filter((l): l is Listing => l !== null);

      return { listings: filterListings(listings, query), hasMock: false, source: "api" };
    } catch (error) {
      /*
        Never fail the page because the catalogue is unreachable. Someone
        looking for state property is better served by the fallback set plus a
        visible notice than by an error screen.
      */
      console.error("[listings] API request failed, using mock data:", error);
    }
  }

  const listings = filterListings(fallbackListings, query);
  return {
    listings,
    hasMock: listings.some((l) => l.isMock),
    source: "mock",
  };
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
    const typeCounts = new Map<ListingType, number>();
    for (const l of lots) {
      typeCounts.set(l.type, (typeCounts.get(l.type) ?? 0) + 1);
    }
    const topType = [...typeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

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
    });
  }

  // Busiest regions first — that is the useful ordering when scanning.
  return summaries.sort((a, b) => b.count - a.count);
}
