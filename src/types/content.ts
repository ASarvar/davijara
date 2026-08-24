/**
 * Content types for Davijara.uz.
 *
 * These describe the shape of everything under `src/content/`. Components must
 * not import content modules directly — they go through `src/lib/data/`, so the
 * local modules can later be swapped for API calls without touching the UI.
 */

export type PrivilegeCategory = "ijtimoiy" | "talim" | "it" | "boshqa";

/** A statutory rent privilege. Legal fields are verbatim — see privileges.ts. */
export interface Privilege {
  /** 1-based; drives the numbered badge in the UI. */
  id: number;
  category: PrivilegeCategory;
  /** Human-readable category label as shown on the card, e.g. "IT va innovatsiya". */
  tag: string;
  title: string;
  description: string;
  /** Foydalanuvchi subyekt — who may claim it. */
  subject: string;
  /** Davriylik — how long it applies. */
  duration: string;
  /** Asos — the citation. Binding legal reference; never edit or translate. */
  legalBasis: string;
}

export type ListingType = "noturar" | "turar" | "ishlab-chiqarish" | "mamuriy";

export interface Listing {
  id: string;
  title: string;
  /** Region slug, matches Region.slug. */
  region: string;
  address: string;
  /**
   * Optional because the auction service does not classify its lots — it
   * returns no type field at all. Deriving one from the lot name ("… xonasi"
   * → noturar) would be a guess about a specific state asset, so live lots
   * carry no type rather than a plausible-looking invented one. Only the
   * verified local records set it.
   */
  type?: ListingType;
  /** Tuman/shahar within the region, when upstream supplies it. */
  district?: string;
  /** Square metres. */
  area: number;
  /** Annual rent in so'm. */
  pricePerYear: number;
  /** ISO 8601 auction date, server-provided so no client clock is involved. */
  auctionDate?: string;
  /**
   * Upstream's own words for where the lot is in the auction process. Shown
   * verbatim, never re-worded: it is the difference between a lot a citizen
   * can still bid on and one that has already concluded.
   */
  lotStatus?: string;
  /** WGS84 coordinates — required to place the lot on the map. */
  lat: number;
  lng: number;
  /** Lot number as shown on e-auksion.uz. */
  lotNumber?: string;
  /**
   * Upstream's `order_id`, and ONLY that — never the lot number.
   *
   * Distinct from `id`, which falls back to the lot number when upstream omits
   * the order id. The order endpoint that supplies photographs keys on this
   * field alone (see lib/data/lot-images.ts), so passing `id` there would send
   * a lot number to a service expecting an order id and silently match
   * nothing. A lot without one has no photo lookup available.
   */
  orderId?: string;
  image?: string;
  /** Deep link to the e-auksion lot, when one exists. */
  auctionUrl?: string;
  /**
   * True for generated sample records. The UI surfaces this so a mock lot is
   * never mistaken for a real state asset — see lib/data/listings.ts.
   */
  isMock?: boolean;
}

/**
 * A lot that concluded with a buyer.
 *
 * Separate from `Listing` because the two answer different questions and share
 * almost no fields on screen: a listing has an asking price and a countdown, a
 * sale has a start price, a final price and no future.
 *
 * NOTE what is deliberately absent. The order endpoint returns the winner's
 * full name, passport number, PINFL, phone and home address; none of it is on
 * this type and none of it may be published. See lib/data/listings.ts.
 */
export interface SoldLot {
  id: string;
  title: string;
  /** Region slug, matches Region.slug. */
  region: string;
  district?: string;
  /** Square metres. */
  area: number;
  /** Opening price in so'm. */
  startPrice: number;
  /** What it actually went for, in so'm. Always greater than zero. */
  soldPrice: number;
  /** ISO 8601, server-provided. */
  auctionDate: string;
  lotNumber?: string;
  orderId?: string;
  auctionUrl?: string;
}

/** Filters shared by the search form, the map and the region list. */
export interface ListingQuery {
  region?: string;
  /** Tuman/shahar name, exactly as upstream spells it. */
  district?: string;
  type?: ListingType;
  minArea?: number;
  maxArea?: number;
  minPrice?: number;
  maxPrice?: number;
  /**
   * Exactly one auction day, as "YYYY-MM-DD" in Tashkent time.
   *
   * The catalogue's "Savdo kuni" field. A calendar DATE rather than a relative
   * window because that is the question the auction schedule actually answers
   * — "what is being sold on the 27th" — and because a date in a shared link
   * keeps meaning the same thing next week.
   */
  auctionDate?: string;
  /**
   * How far ahead the auction opens, in days from now — exclusive lower
   * bound, inclusive upper. `{ min: 3, max: 5 }` is "more than 3 days away
   * and no more than 5", so the offered windows tile the calendar without
   * overlapping: 0-3, 3-5, 5+.
   *
   * ROLLING HOURS, not calendar days, so the filter agrees with the countdown
   * printed on the card: a lot reading "3 kun 04:12" is in the 3-5 bucket,
   * which is what the reader can see and therefore what they expect.
   *
   * Lots with no `auctionDate`, and lots whose auction has already opened,
   * match no window at all — there is no upcoming date to place.
   */
  minDaysToAuction?: number;
  maxDaysToAuction?: number;
}

/**
 * Per-region aggregate, computed from whatever set the current filters match.
 * This is what the "Ro'yxat" tab renders — a summary of each region rather
 * than a wall of individual lots.
 */
export interface RegionSummary {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  /** Lots matching the active filters in this region. */
  count: number;
  /** Combined floor area of those lots, m². */
  totalArea: number;
  minPrice: number;
  maxPrice: number;
  /** Mean annual rent across the matching lots. */
  avgPrice: number;
  /** Most common lot type, where the source classifies lots at all. */
  topType?: ListingType;
  /** Distinct tumans represented — the live data's stand-in for `topType`. */
  districtCount?: number;
}

export interface Region {
  slug: string;
  name: string;
  /**
   * Numeric id the auction service knows this region by. Required on every
   * request — see the note in content/regions.ts before changing one.
   */
  apiId: number;
  /** Count of currently available objects. */
  objectCount: number;
  lat: number;
  lng: number;
}

export interface NewsItem {
  slug: string;
  title: string;
  excerpt: string;
  /** ISO 8601 date. */
  publishedAt: string;
  category?: string;
}

export interface DocItem {
  id: string;
  title: string;
  /** e.g. "PQ-239, 27.06.2024-y." */
  reference: string;
  /** Link to lex.uz or a local PDF. */
  url: string;
  fileType?: "pdf" | "docx" | "link";
}

export interface Service {
  slug: string;
  title: string;
  description: string;
  /** lucide-react icon name. */
  icon: string;
  href: string;
}

export interface Step {
  number: string;
  title: string;
  description: string;
  icon: string;
}

export interface Stat {
  value: string;
  label: string;
  /** Name from the icon registry — only rendered by `StatList`'s `card` variant. */
  icon?: string;
  /**
   * A line of explanation under the figure, for a statistic whose label is not
   * self-explanatory — "Bitta qadamda · 69,7%" says nothing without it.
   *
   * Only the `card` variant renders it. The hero's four figures do not use it:
   * there the label IS the explanation, and a second line under each would
   * turn a row of numbers into a row of paragraphs.
   */
  note?: string;
}

export interface Auction {
  id: string;
  title: string;
  region: string;
  startingPrice: number;
  currentBid?: number;
  bidCount: number;
  /** ISO 8601. Server-provided so countdowns don't depend on client clock skew. */
  endsAt: string;
  url: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}
