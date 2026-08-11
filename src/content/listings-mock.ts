import { regions } from "./regions";
import type { Listing, ListingType } from "@/types/content";

/*
  ─────────────────────────────────────────────────────────────────────────
  MOCK LOTS — NOT REAL STATE PROPERTY
  ─────────────────────────────────────────────────────────────────────────

  Stand-in records used until the e-auksion listings service is wired up.
  Every record carries `isMock: true`, and the UI shows a visible notice
  whenever mock records are on screen.

  They exist because the portal advertises thousands of objects while the
  verified content set holds a handful: an almost-empty map under a "4 820+
  obyekt" headline misrepresents the service, and unlabelled invented records
  would be worse. They are generated, flagged, and replaced wholesale the
  moment `LISTINGS_API_URL` is set — see `lib/data/listings.ts`.

  DO NOT remove the `isMock` flag or the notice that reads it.

  Generation is deterministic (a seeded PRNG, never Math.random) so that:
    · the server and the client agree — a random value here would be a
      hydration mismatch;
    · a lot keeps the same coordinates and price between renders instead of
      jumping around the map on every refresh. That exact bug is why the
      legacy Leaflet map was thrown away in the first place.
*/

/** Mulberry32 — small, fast, stable across runtimes. */
function makeRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TYPES: ListingType[] = ["noturar", "turar", "ishlab-chiqarish", "mamuriy"];

const TITLES: Record<ListingType, string[]> = {
  noturar: [
    "Noturar joy binosi, 1-qavat, alohida kirish",
    "Ko'cha bo'yidagi noturar joy",
    "Noturar bino, markaziy ko'chada",
  ],
  turar: ["Turar joy binosi, ta'mirtalab", "Ko'p qavatli turar joy bo'limi"],
  "ishlab-chiqarish": [
    "Ishlab chiqarish ombori, temir yo'lga yaqin",
    "Ishlab chiqarish sexi, alohida hovli bilan",
    "Omborxona, yuk maydonchasi bilan",
  ],
  mamuriy: [
    "Ma'muriy bino xonalari",
    "Ma'muriy bino, 2-qavat",
    "Idoraviy bino, konferens zali bilan",
  ],
};

/** Indicative per-m² annual rates, mirroring the calculator's table. */
const RATE_BY_TYPE: Record<ListingType, number> = {
  noturar: 245_000,
  turar: 190_000,
  "ishlab-chiqarish": 190_000,
  mamuriy: 160_000,
};

const DISTRICTS = [
  "markaziy hudud",
  "sanoat zonasi",
  "shahar markazi",
  "yangi tumani",
  "avtovokzal atrofi",
];

/** ~9 per region: enough to exercise clustering without a heavy payload. */
const PER_REGION = 9;

function generate(): Listing[] {
  const out: Listing[] = [];

  regions.forEach((region, regionIndex) => {
    // Seeded per region so each region is stable independently of the others.
    const rng = makeRng(regionIndex * 7919 + 104729);

    for (let i = 0; i < PER_REGION; i++) {
      const type = TYPES[Math.floor(rng() * TYPES.length)];
      const titles = TITLES[type];
      const title = titles[Math.floor(rng() * titles.length)];

      // 60–1200 m², skewed towards smaller units.
      const area = Math.round((60 + rng() ** 2 * 1140) / 10) * 10;

      // ±0.28° around the region centre — visually inside the region at the
      // zoom levels this map uses, without pretending to be a real address.
      const lat = region.lat + (rng() - 0.5) * 0.56;
      const lng = region.lng + (rng() - 0.5) * 0.56;

      // Rate varies ±15% so price is not a straight function of area.
      const rate = RATE_BY_TYPE[type] * (0.85 + rng() * 0.3);
      const lotNumber = String(24_000_000 + Math.floor(rng() * 999_999));

      out.push({
        id: `mock-${region.slug}-${i + 1}`,
        lotNumber,
        title,
        region: region.slug,
        address: `${region.name}, ${DISTRICTS[Math.floor(rng() * DISTRICTS.length)]}`,
        type,
        area,
        pricePerYear: Math.round((area * rate) / 100_000) * 100_000,
        lat: +lat.toFixed(5),
        lng: +lng.toFixed(5),
        // No `image`: the card falls back to ImagePlaceholder.
        // Pointing these at real e-auksion photos would attach a genuine
        // building to an invented record.
        auctionUrl: `https://e-auksion.uz/lot-view?lot_id=${lotNumber}`,
        isMock: true,
      });
    }
  });

  return out;
}

export const mockListings: Listing[] = generate();
