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
import { getListings as getLiveListings } from "@/lib/data/listings";
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
  The first card — "Ijaraga taklif etilayotgan obyektlar" — is the one figure
  here that a live service can answer, so it is replaced with the count of
  currently open lots from the real e-auksion feed. The other two (signed
  contracts, leased area) are cumulative totals the operator reports
  separately; `listings.ts` has no endpoint for those, so they stay the
  verified static figures from `content/homepage.ts`.

  `getLiveListings` already falls back to `source: "mock"` when
  `LISTINGS_API_URL` is unset or the service is unreachable, so the static
  "1 390+" is kept in that case rather than showing a count from sample data.
*/
export async function getHeroStats(): Promise<Stat[]> {
  const [objectsStat, ...rest] = heroStats;
  const { listings, source } = await getLiveListings();

  const live: Stat =
    source === "api"
      ? { ...objectsStat, value: formatNumber(listings.length) }
      : objectsStat;

  return [live, ...rest];
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
