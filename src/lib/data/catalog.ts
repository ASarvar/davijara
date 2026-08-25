import "server-only";

import { regions } from "@/content/regions";
import {
  documents,
  featuredListings,
  heroStats,
  impactStats,
  news,
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
import { formatFixed, TASHKENT_OFFSET_MS } from "@/lib/format";
import type {
  DocItem,
  FaqItem,
  Listing,
  NewsItem,
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

export async function getNews(limit?: number): Promise<NewsItem[]> {
  const sorted = [...news].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );
  return limit ? sorted.slice(0, limit) : sorted;
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
  All four hero cards are LIVE, and each narrows to whatever the search panel
  has selected — republic, region, or district.

    1. open lots                    listings feed
    2. signed contracts             rent-contracts register
    3. leased area (mln m²)         rent-contracts register
    4. lots sold this year          listings feed, `sold_price > 0`

  EVERY ONE OF THEM DEGRADES SEPARATELY, and that is deliberate: three
  different upstream calls back this row and one being unreachable must not
  blank the other two.

  - Cards 1 falls back to the verified static "1 390+" (`getLiveListings`
    reports `source: "mock"` when the feed is unreachable, so a count from
    sample data never reaches the page).
  - Cards 2 and 3 fall back to the operator's static 28 075 / 145,9.
  - Card 4 has no static twin — nobody has published that figure — so it is
    dropped rather than shown empty.

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
function formatLeasedArea(m2: number): { value: string; unit: string } {
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
}

export async function getHeroStats(
  regionSlug?: string,
  districtName?: string,
): Promise<HeroStatsResult> {
  const [objectsStat, contractsStat, areaStat, soldStat] = heroStats;
  const year = currentYear();

  const [{ listings, source }, sold, register] = await Promise.all([
    getLiveListings({ region: regionSlug, district: districtName }),
    getSoldCount(year, regionSlug, districtName),
    getRentContracts(year, regionSlug, districtName),
  ]);

  const live: Stat =
    source === "api"
      ? { ...objectsStat, value: formatNumber(listings.length) }
      : objectsStat;

  const area = register ? formatLeasedArea(register.areaM2) : null;

  const stats: Stat[] = [
    live,
    {
      ...contractsStat,
      value: register ? formatNumber(register.contracts) : contractsStat.value,
    },
    {
      ...areaStat,
      value: area ? area.value : areaStat.value,
      // The unit rides alongside the figure now rather than inside the label.
      // The static fallback is the operator's, and it is in millions.
      unit: area ? area.unit : areaStat.unit,
    },
  ];

  if (sold != null) {
    stats.push({ ...soldStat, value: formatNumber(sold) });
  }

  return { stats, year, contractsWidened: register?.widened ?? false };
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
