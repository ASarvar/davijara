import "server-only";

import { unstable_cache } from "next/cache";

import { readSnapshot, saveSnapshot } from "@/lib/data/snapshot";
import { auctionDay } from "@/lib/data/listings";
import type { Listing, ListingQuery } from "@/types/content";

/*
  Xususiylashtirishga taklif etilayotgan obyektlar — state property offered
  for SALE, shown apart from the lease lots everywhere on the site.

  SOURCE: the "davlat mulki monitoring" dashboard (the /obyektlar app on this
  same domain), NOT e-auksion and not the listings feed. The dashboard already
  walks every object on the Markaz's balance through API 3 (cadastre → lot) and
  API 4 (order → details) and keeps the answer in its own database; this reads
  that answer through one endpoint it publishes for us:

    GET <PRIVATIZATION_API_URL>          x-davijara-token: <PRIVATIZATION_API_TOKEN>
    → { success, generatedAt, count, objects: [ { cadNumber, name, regionCode,
        lat, lng, lot: { lotNumber, startPrice, auctionDate, lotStatus … } } ] }

  Re-walking API 3 for tens of thousands of cadastres here would duplicate that
  work and let the two systems disagree. In production the URL is the
  dashboard's container on the host, http://127.0.0.1:3000/obyektlar/api/…

  SCOPE, stated because it is narrower than e-auksion's: these are the
  privatization lots of objects on the MARKAZ's balance. e-auksion's group 5
  ("Davlat aktivlari") also sells assets held elsewhere, which this does not
  show — the operator chose this scope on 09.10.2026.

  "TAKLIF ETILAYOTGAN" IS DECIDED HERE, not by the dashboard. Its "has a
  privatization lot" flag is not "open": on 06.09.2026 it covered 631 objects
  of which 488 carried "Mol-mulk (obyekt) sotilmadi", 38 "Vaqtincha
  to`xtatildi", 20 "Lot bekor qilindi" — and 71 were taking applications. So a
  lot is offered only when BOTH hold:

    · its status says applications are being accepted (or "Савдода"), and
    · its auction moment is still ahead.

  The second is not a guess about the room (live-auctions.ts carries why the
  site never infers that): applications close an hour before the auction, so a
  lot whose time has passed cannot be applied for whatever a stale status says,
  and the dashboard refreshes statuses on its own schedule. Failing either
  test hides the lot — a citizen sent to a sale that has ended is the worse
  error.

  NO PERSONAL DATA arrives: the endpoint selects object and lot fields only.
  PHOTOGRAPHS come by `orderId`, through a different service from the lease
  lots': a privatization order is filed under the Agency's account, which the
  regional order accounts cannot see — see getSaleLotImage in lot-images.ts.
*/

interface ApiObject {
  cadNumber?: string;
  name?: string | null;
  address?: string | null;
  regionCode?: string;
  districtName?: string | null;
  lat?: number | null;
  lng?: number | null;
  isLand?: boolean;
  landArea?: number | null;
  buildingArea?: number | null;
  lot?: {
    lotNumber?: string | null;
    orderId?: number | null;
    area?: number | null;
    startPrice?: number | null;
    auctionDate?: string | null;
    lotStatus?: string | null;
  } | null;
}

interface ApiResponse {
  success?: boolean;
  generatedAt?: string;
  objects?: ApiObject[];
}

/** The dashboard's region codes → this site's slugs (content/regions.ts). */
const REGION_BY_CODE: Record<string, string> = {
  QQR: "qoraqalpogiston",
  AND: "andijon",
  BUX: "buxoro",
  JIZ: "jizzax",
  QAS: "qashqadaryo",
  NAV: "navoiy",
  NAM: "namangan",
  SAM: "samarqand",
  SUR: "surxondaryo",
  SIR: "sirdaryo",
  TAS: "toshkent",
  FAR: "fargona",
  XOR: "xorazm",
  TAS_CITY: "toshkent-shahri",
};

/** Same box as lib/data/listings.ts: a pin outside it is a typo, not a place. */
const inUzbekistan = (lat: number, lng: number) =>
  lat >= 36.6 && lat <= 46.1 && lng >= 55.4 && lng <= 73.7;

const positive = (n: number | null | undefined): number | undefined =>
  typeof n === "number" && Number.isFinite(n) && n > 0 ? n : undefined;

/*
  The dashboard spells a CITY five ways — "Samarqand", "Guliston sh.",
  "Buxoro shahar", "Nukus shaxar", "Jizzax shahri" (09.10.2026) — where the
  listings feed always writes "<name> shahri". A city named differently from
  the lease side never matched a `?tuman=` carried from the search panel or
  the hero: Samarqand shahri counted 0 sale lots against 11 on the
  dashboard. Every name that is not a "tumani" is a city in this data, so
  each is brought to the feed's form; a district keeps its own name.
*/
function cityForm(name: string | null | undefined): string | undefined {
  const n = name?.trim();
  if (!n) return undefined;
  if (/\stumani$/i.test(n)) return n;
  const base = n.replace(/\s+(shahri|shahar|shaxar|sh\.)$/i, "").trim();
  return `${base} shahri`;
}

/**
 * One dashboard object as a Listing, or null if it cannot be placed or named.
 * Status and date are NOT judged here — this is what is cached and snapshot,
 * and "open" depends on the clock at read time (see `isOffered`).
 */
function toListing(o: ApiObject): Listing | null {
  const region = o.regionCode ? REGION_BY_CODE[o.regionCode] : undefined;
  const lat = Number(o.lat);
  const lng = Number(o.lng);
  const lotNumber = o.lot?.lotNumber?.trim();
  if (!region || !lotNumber) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (!inUzbekistan(lat, lng)) return null;

  return {
    id: `x-${lotNumber}`,
    kind: "privatization",
    title: o.name?.trim() || lotNumber,
    region,
    address: o.address?.trim() ?? "",
    district: cityForm(o.districtName),
    /*
      The lot's own area first — that is what is on sale. A building's floor
      area next, and the land plot only for an object that IS land: printing a
      2-hectare plot under a 150 m² office would overstate it a hundredfold.
    */
    area:
      positive(o.lot?.area) ??
      positive(o.buildingArea) ??
      (o.isLand ? positive(o.landArea) : undefined) ??
      0,
    pricePerYear: positive(o.lot?.startPrice) ?? 0,
    auctionDate: o.lot?.auctionDate ?? undefined,
    lotStatus: o.lot?.lotStatus?.trim() || undefined,
    lat,
    lng,
    lotNumber,
    orderId: o.lot?.orderId != null ? String(o.lot.orderId) : undefined,
    auctionUrl: `https://e-auksion.uz/lot-view?lot_id=${encodeURIComponent(lotNumber)}`,
  };
}

const OPEN_STATUS = /arizalarni qabul qilish|^савдода$/i;

/** Taking applications, and its auction still ahead — see the header. */
export function isOffered(listing: Listing, now = Date.now()): boolean {
  if (!listing.lotStatus || !OPEN_STATUS.test(listing.lotStatus)) return false;
  const at = listing.auctionDate ? Date.parse(listing.auctionDate) : NaN;
  return Number.isFinite(at) && at > now;
}

/*
  Development only: PRIVATIZATION_AS_OF pins the clock `isOffered` reads, so
  the page can be reviewed against a dashboard whose statuses are days old.
  Ignored in production, where an auction that has passed must never be
  shown as open.
*/
function offeredClock(): number {
  const pinned =
    process.env.NODE_ENV !== "production"
      ? process.env.PRIVATIZATION_AS_OF
      : undefined;
  const at = pinned ? Date.parse(pinned) : NaN;
  return Number.isFinite(at) ? at : Date.now();
}

const SNAPSHOT_KEY = "privatization:all";

/*
  Ten minutes. The dashboard's own statuses move on its sync schedule, not by
  the minute, so a shorter window would only add load to an internal system;
  the date test in `isOffered` runs on every read and is what keeps a lot from
  outliving its auction.

  A failure THROWS so it is never cached as "nothing is for sale".
*/
const fetchAll = unstable_cache(
  async (): Promise<Listing[]> => {
    const url = process.env.PRIVATIZATION_API_URL;
    const token = process.env.PRIVATIZATION_API_TOKEN;
    if (!url || !token) return [];

    const res = await fetch(url, {
      headers: { "x-davijara-token": token, Accept: "application/json" },
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`privatization API responded ${res.status}`);

    const json = (await res.json()) as ApiResponse;
    if (!json.success || !Array.isArray(json.objects)) {
      throw new Error("privatization API returned no objects array");
    }

    // One object can surface under two cadastres (new and old); key on the lot.
    const byLot = new Map<string, Listing>();
    for (const o of json.objects) {
      const listing = toListing(o);
      if (listing) byLot.set(listing.id, listing);
    }
    const mapped = [...byLot.values()];
    saveSnapshot(SNAPSHOT_KEY, mapped);
    return mapped;
  },
  // v3: listings carry `orderId` (v2) and city names in the feed's form
  // (v3). A new key per shape change, so a deploy does not serve ten minutes
  // of cached lots in the old one.
  ["privatization-all-v3"],
  { revalidate: 600, tags: ["privatization"] },
);

export interface PrivatizationResult {
  listings: Listing[];
  /** Set when the endpoint failed and these are its last stored answer. */
  asOf?: string;
  /** False when the endpoint is not configured — the UI then shows nothing. */
  configured: boolean;
  /**
   * True when the endpoint failed AND no stored answer exists, so `listings`
   * is empty for want of data rather than because nothing is on offer. A
   * count must not be printed from that — see getHeroStats.
   */
  unavailable?: boolean;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[ʻʼ'`‘’]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * The privatization lots open for applications, soonest auction first,
 * narrowed by the same search as the lease catalogue.
 *
 * `hudud`, `tuman`, `maydon`, `narx` and `savdo` all apply. `narx` is read as
 * the sale's STARTING price here — the search panel offers sale-sized bands
 * when it is drawn for this page (search-widget.tsx, `market`), so a lease
 * band never meets a sale price. `tur` does not apply: no object type is
 * published for these lots.
 */
export async function getPrivatizationListings(
  query: ListingQuery = {},
): Promise<PrivatizationResult> {
  const configured = Boolean(
    process.env.PRIVATIZATION_API_URL && process.env.PRIVATIZATION_API_TOKEN,
  );
  if (!configured) return { listings: [], configured };

  let all: Listing[];
  let asOf: string | undefined;
  try {
    all = await fetchAll();
  } catch (error) {
    console.warn(
      "[privatization] endpoint unavailable:",
      error instanceof Error ? error.message : error,
    );
    const snap = readSnapshot<Listing[]>(SNAPSHOT_KEY);
    if (!snap) return { listings: [], configured, unavailable: true };
    all = snap.data;
    asOf = snap.fetchedAt;
  }

  const now = offeredClock();
  const district = query.district ? norm(query.district) : undefined;
  const listings = all
    .filter((l) => isOffered(l, now))
    .filter((l) => matches(l, query, district))
    .sort((a, b) => (a.auctionDate ?? "").localeCompare(b.auctionDate ?? ""));

  return { listings, asOf, configured };
}

/**
 * Every privatization lot the dashboard returned, offered or not — for
 * matching against e-auksion's live list (live-auctions.ts), where a lot has
 * to be found AFTER its auction time, the moment `isOffered` lets it go.
 * Not for display on its own: most of these are not on offer.
 */
export async function getAllPrivatizationListings(): Promise<Listing[]> {
  if (
    !process.env.PRIVATIZATION_API_URL ||
    !process.env.PRIVATIZATION_API_TOKEN
  ) {
    return [];
  }
  try {
    return await fetchAll();
  } catch {
    return readSnapshot<Listing[]>(SNAPSHOT_KEY)?.data ?? [];
  }
}

function matches(
  l: Listing,
  q: ListingQuery,
  district: string | undefined,
): boolean {
  if (q.region && l.region !== q.region) return false;
  if (district && (!l.district || norm(l.district) !== district)) return false;
  if (q.minArea != null && l.area < q.minArea) return false;
  if (q.maxArea != null && l.area > q.maxArea) return false;
  // A lot with no published price is outside every price band, as in the
  // lease catalogue.
  if (q.minPrice != null && l.pricePerYear < q.minPrice) return false;
  if (q.maxPrice != null && l.pricePerYear > q.maxPrice) return false;
  if (q.auctionDate) {
    const at = l.auctionDate ? Date.parse(l.auctionDate) : NaN;
    if (!Number.isFinite(at) || auctionDay(at) !== q.auctionDate) return false;
  }
  return true;
}

/**
 * The days the "Savdo kuni" calendar may offer on /xususiylashtirish, scoped
 * to the rest of the search — the sale counterpart of getAuctionDays.
 */
export async function getPrivatizationAuctionDays(
  query: ListingQuery = {},
): Promise<Array<{ date: string; count: number }>> {
  const { listings } = await getPrivatizationListings({
    ...query,
    auctionDate: undefined,
  });
  const counts = new Map<string, number>();
  for (const l of listings) {
    const at = l.auctionDate ? Date.parse(l.auctionDate) : NaN;
    if (!Number.isFinite(at)) continue;
    const day = auctionDay(at);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Districts that have at least one offered lot, by region slug — for the
 * page's tuman dropdown, so no option leads to an empty page.
 */
export async function getPrivatizationDistrictsByRegion(): Promise<
  Record<string, string[]>
> {
  const { listings } = await getPrivatizationListings();
  const out: Record<string, Set<string>> = {};
  for (const l of listings) {
    if (!l.district) continue;
    (out[l.region] ??= new Set()).add(l.district);
  }
  return Object.fromEntries(
    Object.entries(out).map(([slug, set]) => [
      slug,
      [...set].sort((a, b) => a.localeCompare(b, "uz")),
    ]),
  );
}
