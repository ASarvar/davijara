import "server-only";

import { regions } from "@/content/regions";
import { TASHKENT_OFFSET_MS } from "@/lib/format";
import { fetchSoldYear } from "@/lib/data/listings";
import type { SoldLot } from "@/types/content";

/*
  Aggregates for /statistika.

  ── WHY 2026 AND ONLY 2026 ─────────────────────────────────────────────────
  The listings feed does reach back to 2023, and an earlier draft of this page
  charted four years. It should not, and the reason is in the data rather than
  in the scope:

    · `rent_area` is EMPTY for every row before 2026 — 0 of 10 133 rows in
      2023, 0 of 7 592 in 2024, 0 of 6 343 in 2025, 4 513 of 4 518 in 2026. So
      every area figure, and the so'm/m² that is the most useful number on
      this page, exists for one year only.
    · For past years the window returns CONCLUDED lots only — 2023, 2024 and
      2025 come back 100% sold. A sale rate, a pipeline, an unsold count: none
      of them can be computed for a year whose unsold lots were never sent.

  A four-year chart of those two facts would have been four years of one real
  series and three years of blanks presented as though they were comparable.
  The month is the time axis instead.

  ── EVERY FIGURE HERE IS A MEDIAN, NOT A MEAN ──────────────────────────────
  Not a stylistic preference; measured. One lot — Toshkent's transport lot —
  was 76% of December 2024's total, and in January 2026 a single lot was 74%
  of the month. Across 2026 the mean lot price is 38,6 mln so'm and the median
  is 8,9 mln: the mean describes a lot that does not exist. Totals are still
  shown, because "how much state property was let" is a real question, but
  they never carry a trend on their own.

  ── AND WHY NO SUM OF `rent_area` ──────────────────────────────────────────
  343 of the 3 034 sales are natural water bodies — one is 48 250 000 m² at
  4,53 so'm/m²/year. They are 11,3% of sales, 98,7% of all `rent_area`, and
  2,8% of value. Summing that field produces 161 mln m² and means nothing.
  The register's own `total_rental_area` is the area figure (CLAUDE.md says
  the same), and everything else here uses a median, which those 343 lots
  cannot move.
*/

/** The only year with area data and with unsold lots. See above. */
export const STATS_YEAR = 2026;

/**
 * The largest lot, in m², that counts toward a so'm-per-m² rate.
 *
 * WITHOUT THIS THE COMPARISON IS FALSE, and by a factor of a hundred. The
 * per-m² medians came out at 836 712 so'm for Toshkent shahri and 2 030 for
 * Namangan — a 400× gap that reads as "renting in Namangan is nearly free"
 * and is not true of anything a reader could rent.
 *
 * The cause: 63% of Namangan's measured sales are natural water bodies and
 * open land, with a median area of 700 m². A hectare of reservoir at a few
 * so'm per m² and a 40 m² office are not the same product, and once more than
 * half a region's lots are the first kind its median stops describing the
 * second. Toshkent shahri has none of them, so the two regions' medians were
 * measuring different things and being printed as one ranking.
 *
 * 100 m² is a STRUCTURAL cut, not a guess about what a lot is. Classifying by
 * name — "suv havzasi", "yer maydoni" — is the same fabrication as the lot-type
 * pie this page refuses to draw; a size threshold is a stated, uniform rule
 * that every region is measured by identically. It keeps 68% of all sales and
 * leaves 93-240 measurements in every one of the fourteen regions, and the
 * spread it produces (1 205 299 in Toshkent shahri to 157 080 in Buxoro) is
 * one a reader can act on.
 *
 * The band is named in the UI. A rate quoted without it would be a different
 * unstated assumption rather than a fixed one.
 */
export const PER_M2_MAX_AREA = 100;

/**
 * Where the cumulative rise curve is sampled.
 *
 * Dense through the first half-step and sparse after it, because that is how
 * the data is shaped: raises land on a 10%-of-start grid, so 1 826 of the
 * 3 034 sales sit at exactly 1,1x and the whole first band is one spike.
 * Sampling 1,0 → 1,5 in tenths shows that cliff; sampling past it in tenths
 * would be forty near-identical points along a flat tail.
 */
const RISE_THRESHOLDS = [1, 1.1, 1.2, 1.3, 1.4, 1.5, 2, 3, 5, 10];

export interface CumulativePoint {
  /** The multiple, e.g. 1.2. */
  at: number;
  /** Lots sold at or above it. */
  count: number;
}

export interface StatsBucket {
  label: string;
  count: number;
}

export interface MonthPoint {
  /** 1-12. */
  month: number;
  sold: number;
  /** Total annual rent contracted that month, in so'm. */
  total: number;
  /** Median lot price that month, in so'm. */
  median: number;
}

export interface RegionStat {
  slug: string;
  name: string;
  sold: number;
  total: number;
  /** Median so'm per m² per year. Null when too few lots carry an area. */
  perM2: number | null;
}

export interface Statistics {
  year: number;
  /** The region this is scoped to, or undefined for the republic. */
  region?: string;
  sold: number;
  pending: number;
  unsold: number;
  /** Sold as a share of CONCLUDED lots — pending auctions are not failures. */
  sellRate: number;
  /** Total annual rent across every sale, in so'm. */
  total: number;
  /** Median sale price, in so'm. */
  medianPrice: number;
  /** Median floor area, in m². */
  medianArea: number;
  /** Median so'm per m² per year. */
  medianPerM2: number;
  /** Median rise over the opening price, as a multiple. */
  medianRise: number;
  months: MonthPoint[];
  byRegion: RegionStat[];
  rise: StatsBucket[];
  /** "Sold at or above this multiple", at RISE_THRESHOLDS. */
  cumulative: CumulativePoint[];
  area: StatsBucket[];
  /** Auction days held, and lots per day. */
  auctionDays: number;
  /** Lots by weekday, Monday first. */
  weekdays: number[];
  topByPrice: SoldLot[];
  topByRise: SoldLot[];
}

const median = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
};

/** Tashkent calendar day — an auction at 10:00 local is 05:00Z. */
const tashkent = (iso: string) =>
  new Date(new Date(iso).getTime() + TASHKENT_OFFSET_MS);

/*
  The rise bands.

  Exclusive lower bound, inclusive upper, and the first band is exactly 1,0x —
  the same grammar the auction-window chips use, so a lot lands in exactly one.
  The bands are not even in width because the distribution is not: 69% of
  sales sit between 1,0x and 1,5x and 6% are above 10x, so equal decades would
  be one full bar and six empty ones.
*/
const RISE_BANDS: { max: number; label: string }[] = [
  { max: 1.0001, label: "1,0×" },
  { max: 1.5, label: "1,0–1,5×" },
  { max: 2, label: "1,5–2×" },
  { max: 3, label: "2–3×" },
  { max: 5, label: "3–5×" },
  { max: 10, label: "5–10×" },
  { max: Infinity, label: "10×+" },
];

const AREA_BANDS: { max: number; label: string }[] = [
  { max: 20, label: "20 m² gacha" },
  { max: 50, label: "20–50 m²" },
  { max: 100, label: "50–100 m²" },
  { max: 300, label: "100–300 m²" },
  { max: 1000, label: "300–1000 m²" },
  { max: Infinity, label: "1000 m² dan katta" },
];

function band(
  value: number,
  bands: { max: number; label: string }[],
): string | null {
  for (const b of bands) if (value <= b.max) return b.label;
  return null;
}

/**
 * Everything /statistika renders, for the republic or for one region.
 *
 * Null when the listings service is unreachable — the page then says so
 * rather than drawing charts of nothing.
 *
 * The contracts register is deliberately NOT read here. It answers a
 * different question — every lease signed, including renewals that never went
 * to auction — and the section that showed it has been removed, so calling it
 * would be a request to a second service for figures nothing renders. The
 * homepage hero still reads it through .
 */
export async function getStatistics(
  regionSlug?: string,
): Promise<Statistics | null> {
  if (!process.env.LISTINGS_API_URL) return null;

  const scope = regionSlug
    ? regions.filter((r) => r.slug === regionSlug)
    : regions;
  if (scope.length === 0) return null;

  const settled = await Promise.all(
    scope.map((r) => fetchSoldYear(r.apiId, STATS_YEAR)),
  );

  const sales = settled.flatMap((s) => s.sales);
  if (sales.length === 0) return null;

  /*
    `pending` here is 1 454 while the homepage hero's "Ochiq obyektlar" reads
    1 453, and the one-lot gap is real rather than a rounding artefact. Both
    were traced:

      1 484  what `lot_status: "active"` returns
       -30  concluded with no buyer, which the hero filters out
      1 454  this page's count — every lot still taking applications
        -1  a lot with no usable coordinates, which `mapApiLot` drops
      1 453  the hero's count

    The hero's figure is built from mapped `Listing`s and a lot without
    coordinates cannot go on the map, so it never becomes one. This page
    counts published lots, and a lot that is missing a coordinate was still
    published. Neither number is wrong; they are answers to different
    questions, and this is the note that stops the next person "fixing" one to
    match the other.
  */
  const pending = settled.reduce((a, s) => a + s.pending, 0);
  const unsold = settled.reduce((a, s) => a + s.unsold, 0);
  const concluded = sales.length + unsold;

  const prices = sales.map((l) => l.soldPrice);
  const areas = sales.filter((l) => l.area > 0).map((l) => l.area);
  /** Comparable premises only — see PER_M2_MAX_AREA. */
  const rateable = sales.filter((l) => l.area > 0 && l.area <= PER_M2_MAX_AREA);
  const perM2 = rateable.map((l) => l.soldPrice / l.area);
  const rises = sales
    .filter((l) => l.startPrice > 0)
    .map((l) => l.soldPrice / l.startPrice);

  /* ── Months ──────────────────────────────────────────────────────────── */
  const monthly = new Map<number, number[]>();
  for (const lot of sales) {
    const m = tashkent(lot.auctionDate).getUTCMonth() + 1;
    (monthly.get(m) ?? monthly.set(m, []).get(m)!).push(lot.soldPrice);
  }
  const months: MonthPoint[] = [...monthly.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([month, values]) => ({
      month,
      sold: values.length,
      total: values.reduce((a, b) => a + b, 0),
      median: median(values),
    }));

  /* ── Regions ─────────────────────────────────────────────────────────── */
  const byRegion: RegionStat[] = scope
    .map((r, i) => {
      const lots = settled[i].sales;
      const withArea = lots.filter(
        (l) => l.area > 0 && l.area <= PER_M2_MAX_AREA,
      );
      return {
        slug: r.slug,
        name: r.name,
        sold: lots.length,
        total: lots.reduce((a, l) => a + l.soldPrice, 0),
        /*
          Twenty lots before a per-m² median is published. Below that it is
          not a market rate, it is whatever the handful of lots happened to
          be — and printing it beside Toshkent's figure would invite exactly
          the comparison it cannot support. Nationally every region clears
          this comfortably (93-240), so the floor is insurance for a narrow
          scope rather than a filter that currently removes anything.
        */
        perM2:
          withArea.length >= 20
            ? median(withArea.map((l) => l.soldPrice / l.area))
            : null,
      };
    })
    .filter((r) => r.sold > 0)
    .sort((a, b) => b.sold - a.sold);

  /* ── Distributions ───────────────────────────────────────────────────── */
  const tally = (
    values: number[],
    bands: { max: number; label: string }[],
  ): StatsBucket[] => {
    const counts = new Map(bands.map((b) => [b.label, 0]));
    for (const v of values) {
      const key = band(v, bands);
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return bands.map((b) => ({
      label: b.label,
      count: counts.get(b.label) ?? 0,
    }));
  };

  /* ── Rhythm ──────────────────────────────────────────────────────────── */
  const days = new Set<string>();
  // Monday first: Uzbek weeks start on Monday and a Sunday-first axis would
  // put the two empty days at opposite ends of the chart.
  const weekdays = Array<number>(7).fill(0);
  for (const lot of sales) {
    const d = tashkent(lot.auctionDate);
    days.add(d.toISOString().slice(0, 10));
    weekdays[(d.getUTCDay() + 6) % 7]++;
  }

  /* ── Records ─────────────────────────────────────────────────────────── */
  const topByPrice = [...sales]
    .sort((a, b) => b.soldPrice - a.soldPrice)
    .slice(0, 3);
  /*
    A floor of one million so'm on the opening price before a lot can be the
    "biggest rise". Without it the leaderboard fills with lots that opened at
    a few thousand so'm, where a perfectly ordinary sale divides out to a
    spectacular multiple — the ratio measures how low the opening was, not how
    contested the lot was.
  */
  const topByRise = sales
    .filter((l) => l.startPrice >= 1_000_000)
    .sort((a, b) => b.soldPrice / b.startPrice - a.soldPrice / a.startPrice)
    .slice(0, 3);

  return {
    year: STATS_YEAR,
    region: regionSlug,
    sold: sales.length,
    pending,
    unsold,
    sellRate: concluded > 0 ? sales.length / concluded : 0,
    total: prices.reduce((a, b) => a + b, 0),
    medianPrice: median(prices),
    medianArea: median(areas),
    medianPerM2: median(perM2),
    medianRise: median(rises),
    months,
    byRegion,
    rise: tally(rises, RISE_BANDS),
    /*
      Counted from the multiples themselves rather than by adding up the
      bands, because the bands cannot answer "at least 1,2x" — 1,2 falls
      inside the 1,0-1,5 band, which is exactly where the interesting cliff
      is.

      The tolerance matters: a raise of one 10% step divides out to
      1.1000000000000001 as often as to 1.1, so a bare  drops a
      meaningful share of the 1 826 lots sitting on that step.
    */
    cumulative: RISE_THRESHOLDS.map((at) => ({
      at,
      count: rises.filter((m) => m >= at - 0.001).length,
    })),
    area: tally(areas, AREA_BANDS),
    auctionDays: days.size,
    weekdays,
    topByPrice,
    topByRise,
  };
}
