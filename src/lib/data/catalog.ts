import "server-only";

import { regions } from "@/content/regions";
import {
  documents,
  featuredListings,
  heroStats,
  impactStats,
  privilegeCategories,
  services,
  steps,
} from "@/content/homepage";
import { faq, partners } from "@/content/faq";
import { formatNumber } from "@/lib/format";
import {
  getListings as getLiveListings,
  getSoldCount,
} from "@/lib/data/listings";
import { getRentContracts } from "@/lib/data/rent-contracts";
import { getPrivatizationListings } from "@/lib/data/privatization";
import {
  olderOf,
  readSnapshot,
  saveIfChanged,
  snapshotKeys,
} from "@/lib/data/snapshot";
import { formatFixed, TASHKENT_OFFSET_MS } from "@/lib/format";
import type {
  DocItem,
  FaqItem,
  Listing,
  Region,
  Service,
  Stat,
  Step,
} from "@/types/content";

/*
  Data access for everything except privileges (which has its own module).
  Async by design — see the note in privileges.ts.
*/

export interface ListingFilter {
  region?: string;
  type?: string;
  /** Inclusive area bounds in m². */
  minArea?: number;
  maxArea?: number;
  /** Inclusive annual price bounds in so'm. */
  maxPrice?: number;
}

export async function getRegions(): Promise<Region[]> {
  return regions;
}

export async function getRegion(slug: string): Promise<Region | undefined> {
  return regions.find((r) => r.slug === slug);
}

export async function getListings(filter?: ListingFilter): Promise<Listing[]> {
  let result = featuredListings;
  if (!filter) return result;

  if (filter.region) result = result.filter((l) => l.region === filter.region);
  if (filter.type) result = result.filter((l) => l.type === filter.type);
  if (filter.minArea != null)
    result = result.filter((l) => l.area >= filter.minArea!);
  if (filter.maxArea != null)
    result = result.filter((l) => l.area <= filter.maxArea!);
  if (filter.maxPrice != null)
    result = result.filter((l) => l.pricePerYear <= filter.maxPrice!);

  return result;
}

export async function getFeaturedListings(limit = 3): Promise<Listing[]> {
  return featuredListings.slice(0, limit);
}

export async function getDocuments(limit?: number): Promise<DocItem[]> {
  return limit ? documents.slice(0, limit) : documents;
}

export async function getServices(): Promise<Service[]> {
  return services;
}

export async function getSteps(): Promise<Step[]> {
  return steps;
}

/*
  All five hero cards are LIVE, and each narrows to whatever the search panel
  has selected — republic, region, or district.

    1. open lots                    listings feed
    2. signed contracts             rent-contracts register
    3. leased area (mln m²)         rent-contracts register
    4. lots sold this year          listings feed, `sold_price > 0`
    5. privatization lots on offer  the monitoring dashboard

  EVERY ONE OF THEM DEGRADES SEPARATELY, and that is deliberate: four
  different upstream calls back this row and one being unreachable must not
  blank the others. Each card walks the same chain — see `latestFigure`:

    live  ->  the most recent stored figure for this place  ->  hidden

  and whenever a stored figure is used, the hero prints its date.

  There is no static step any more. The operator's typed totals (1 390+,
  28 075, 145,9 mln m²) used to be the last resort, printed undated under the
  current year's heading — by October 2026 the register stood at 30 419 and
  199,2, so that "fallback" was a wrong figure presented as today's. A hidden
  card says less, but nothing false (operator, 20.10.2026: the figures must
  always be right, and the latest ones during an outage).

  The register cannot resolve every district: it identifies them by a code the
  listings feed does not carry, so the two are matched by name (see
  rent-contracts.ts). When that fails, cards 2 and 3 widen to the region and
  say so instead of printing a regional total under a district's name.
*/

/** The year the live cards count. Tashkent's, not the server's. */
function currentYear(): number {
  return new Date(Date.now() + TASHKENT_OFFSET_MS).getUTCFullYear();
}

/*
  A `fill()` helper used to live here, substituting `{year}` and `{unit}` into
  stat labels. Both placeholders are gone: the year moved out of the labels
  entirely (it is printed once beside the heading) and the unit became a field
  on `Stat`. No label carries a placeholder any more, so the substitution step
  went with them.
*/

/**
 * Square metres → a figure and the unit that suits it.
 *
 * The same card carries the republic's 148 802 334 m² and Oqdaryo tumani's
 * 30 032, and no single unit serves both: in millions the tuman is "0", in
 * plain metres the republic is a fifteen-character number. So the unit moves
 * with the magnitude and the label says which one it is.
 *
 * One decimal, and grouped by `formatFixed` — Uzbek writes 148,8 and 30 032,
 * which is why this does not go near `Intl`. See lib/format.ts.
 */
export function formatLeasedArea(m2: number): { value: string; unit: string } {
  if (m2 >= 1_000_000) {
    return { value: formatFixed(m2 / 1_000_000, 1), unit: "mln m²" };
  }
  if (m2 >= 1_000) {
    return { value: formatFixed(m2 / 1_000, 1), unit: "ming m²" };
  }
  return { value: formatNumber(Math.round(m2)), unit: "m²" };
}

export interface HeroStatsResult {
  stats: Stat[];
  /**
   * The year all four cards count.
   *
   * Returned rather than left in each label: every card covers the same
   * period, so the hero prints it ONCE beside the section heading. It is
   * Tashkent's year, not the server's — see `currentYear`.
   */
  year: number;
  /** True when contracts/area are the REGION's because the district is
      absent from the register. The hero prints a line saying so. */
  contractsWidened: boolean;
  /**
   * Set when at least one card is a stored figure rather than a live one, and
   * then it is the OLDEST such figure in the row. ISO 8601; the hero prints
   * it. See lib/data/snapshot.ts for why it is never optional to show.
   */
  asOf?: string;
}

/** A card's figure, and — when it is not live — the moment it was. */
interface Figure<T> {
  data: T;
  asOf?: string;
}

interface RegisterFigure {
  contracts: number;
  areaM2: number;
  widened: boolean;
}

const isCount = (d: unknown): d is number =>
  typeof d === "number" && Number.isFinite(d) && d >= 0;

const isRegisterFigure = (d: unknown): d is RegisterFigure =>
  typeof d === "object" &&
  d !== null &&
  isCount((d as RegisterFigure).contracts) &&
  isCount((d as RegisterFigure).areaM2) &&
  typeof (d as RegisterFigure).widened === "boolean";

/**
 * How long the hero waits for any one source before using its stored figure.
 *
 * The homepage renders this row on every request, and the slowest source sets
 * the time to first byte: a cold register call for the republic is ~2.8s, the
 * sold year is fourteen requests with a 20-second timeout each, and a hung
 * service would hold the whole page for that long. Past the deadline the card
 * takes its last figure, dated — and the abandoned request runs on and fills
 * the cache, so the next reader gets the live one.
 */
const HERO_DEADLINE_MS = 6_000;

async function within<T>(work: Promise<T>, ms: number): Promise<T | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<undefined>((resolve) => {
    timer = setTimeout(() => resolve(undefined), ms);
  });
  try {
    // A source that throws is a source that did not answer: same branch.
    return await Promise.race([work.catch(() => undefined), deadline]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The figure a card should show: live when it is, else the more recent of
 * the two stored ones.
 *
 * TWO STORES, and why the hero keeps its own. The sources' snapshots are the
 * RECORDS a figure is counted from — 150KB to 2.7MB a region — so they are
 * written at most every six hours (SNAPSHOT_MIN_INTERVAL_MS). A card falling
 * back on those after a restart showed a figure up to six hours older than
 * the one on screen a minute before. The figure itself is a number, so it is
 * kept as well, per card and per place, and written whenever it moves — see
 * `saveIfChanged` for why "moves" and not "every render". Whichever store is
 * newer wins.
 *
 * `candidate` is the source's own answer: live (no `asOf`), from its
 * snapshot (`asOf` set), or null when it has nothing it can stand behind.
 */
function latestFigure<T>(
  card: string,
  scope: string,
  candidate: Figure<T> | null,
  valid: (d: unknown) => d is T,
): Figure<T> | null {
  const key = snapshotKeys.heroFigure(card, scope);
  if (candidate && !candidate.asOf) {
    saveIfChanged(key, candidate.data);
    return candidate;
  }
  const stored = readSnapshot<unknown>(key);
  if (!stored || !valid(stored.data)) return candidate;
  if (candidate?.asOf && candidate.asOf >= stored.fetchedAt) return candidate;
  return { data: stored.data, asOf: stored.fetchedAt };
}

export async function getHeroStats(
  regionSlug?: string,
  districtName?: string,
): Promise<HeroStatsResult> {
  const [objectsStat, contractsStat, areaStat, soldStat, saleStat] = heroStats;
  const year = currentYear();
  /*
    The place the row describes, and the year: the year-to-date figures
    restart on 1 January, and December's must not stand in for January's.
  */
  const district = regionSlug ? districtName : undefined;
  const scope = `${year}:${regionSlug ?? "all"}:${district ?? ""}`;

  const [lease, sold, register, sales] = await Promise.all([
    within(
      getLiveListings({ region: regionSlug, district: districtName }),
      HERO_DEADLINE_MS,
    ),
    within(getSoldCount(year, regionSlug, districtName), HERO_DEADLINE_MS),
    within(getRentContracts(year, regionSlug, districtName), HERO_DEADLINE_MS),
    within(
      getPrivatizationListings({ region: regionSlug, district: districtName }),
      HERO_DEADLINE_MS,
    ),
  ]);

  /*
    `mock` is never a figure — a count over generated sample lots must not
    reach this row — and neither is `incomplete`: a region that failed with
    nothing stored is missing from the sum, and thirteen regions' total is not
    the country's.
  */
  const objects = latestFigure(
    "objects",
    scope,
    lease && lease.source !== "mock" && !lease.incomplete
      ? {
          data: lease.listings.length,
          asOf: lease.source === "snapshot" ? lease.asOf : undefined,
        }
      : null,
    isCount,
  );
  const contracts = latestFigure(
    "register",
    scope,
    register
      ? {
          data: {
            contracts: register.contracts,
            areaM2: register.areaM2,
            widened: register.widened,
          },
          asOf: register.asOf,
        }
      : null,
    isRegisterFigure,
  );
  const soldFigure = latestFigure(
    "sold",
    scope,
    sold ? { data: sold.count, asOf: sold.asOf } : null,
    isCount,
  );
  /*
    Unconfigured means the site has no sale section at all, so no card — not
    even a stored one. Unavailable is an outage, and walks the chain.
  */
  const sale =
    sales && !sales.configured
      ? null
      : latestFigure(
          "sale",
          scope,
          sales && !sales.unavailable
            ? { data: sales.listings.length, asOf: sales.asOf }
            : null,
          isCount,
        );

  /*
    EVERY CARD OPENS THE PAGE IT COUNTS, narrowed to the place the hero is
    showing:

      open lots          -> /ijaraga-obyektlar   (region + district)
      signed contracts   -> /ijara-shartnomalari (region only)
      leased area        -> /ijara-shartnomalari (region only)
      leased this year   -> /sotilgan-obyektlar  (region + district)
      privatization      -> /xususiylashtirish   (region + district)

    The listings pages take the district as the hero has it — they read the
    same feed and its Latin names. The register page takes the region only:
    its districts are transliterated from Cyrillic, so the two do not always
    spell a place alike, and a carried `tuman` that did not match would open
    an empty page under a figure that says otherwise.
  */
  const scoped = (path: string, withDistrict: boolean) => {
    const params = new URLSearchParams();
    if (regionSlug) params.set("hudud", regionSlug);
    if (regionSlug && districtName && withDistrict) {
      params.set("tuman", districtName);
    }
    const qs = params.toString();
    return qs ? `${path}?${qs}` : path;
  };

  const stats: Stat[] = [];
  if (objects) {
    stats.push({
      ...objectsStat,
      value: formatNumber(objects.data),
      href: scoped("/ijaraga-obyektlar", true),
    });
  }
  if (contracts) {
    const area = formatLeasedArea(contracts.data.areaM2);
    stats.push(
      {
        ...contractsStat,
        value: formatNumber(contracts.data.contracts),
        href: scoped("/ijara-shartnomalari", false),
      },
      {
        ...areaStat,
        // The unit rides alongside the figure rather than inside the label.
        value: area.value,
        unit: area.unit,
        href: scoped("/ijara-shartnomalari", false),
      },
    );
  }
  if (soldFigure) {
    stats.push({
      ...soldStat,
      value: formatNumber(soldFigure.data),
      href: scoped("/sotilgan-obyektlar", true),
    });
  }
  // Last in the row, after every lease figure (operator, 09.10.2026).
  if (sale) {
    stats.push({
      ...saleStat,
      value: formatNumber(sale.data),
      href: scoped("/xususiylashtirish", true),
    });
  }

  /*
    ONE DATE FOR THE ROW, and it is the oldest of whichever cards fell back.
    Four sources feed these cards and they fail independently, so a row can
    be part live and part stored. Dating it by the freshest part would put a
    current timestamp over a figure that is a day old; the oldest is the only
    claim every card on screen actually supports.
  */
  const asOf = [objects, contracts, soldFigure, sale].reduce<
    string | undefined
  >((oldest, figure) => olderOf(oldest, figure?.asOf), undefined);

  return {
    stats,
    year,
    contractsWidened: contracts?.data.widened ?? false,
    asOf,
  };
}

export async function getImpactStats(): Promise<Stat[]> {
  return impactStats;
}

export async function getPrivilegeCategoryCards() {
  return privilegeCategories;
}

export async function getFaq(limit?: number): Promise<FaqItem[]> {
  return limit ? faq.slice(0, limit) : faq;
}

export async function getPartners() {
  return partners;
}

/** Region options for the search widget's <select>. */
export async function getRegionOptions(): Promise<
  Array<{ value: string; label: string }>
> {
  const all = await getRegions();
  return all.map((r) => ({ value: r.slug, label: r.name }));
}
