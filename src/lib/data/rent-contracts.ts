import "server-only";

import { unstable_cache } from "next/cache";

import { regions } from "@/content/regions";

/*
  Signed lease contracts and leased area, from the operator's own register.

  POST <RENT_CONTRACTS_API_URL>   HTTP Basic, same credentials as the listings
  service, body: { region?: 1718, year: 2026 }

  →  { success, title, summary: { name, contracts_count, total_contract_sum,
       total_rental_area, total_payments, daily_* }, data: [ district… ] }

  Four properties of the service, all measured against it rather than assumed:

  1. `region` is OPTIONAL, unlike the listings endpoint. Omitting it returns
     the republic — 28 568 contracts over 148 802 333.93 m² — which is what
     the hero shows when no region is chosen. No fan-out needed.
  2. A district code in `region` does NOT work. `region: 1718203` answers
     "Ҳудуд топилмади" with zeros, and `district` / `tuman` / `code` / `area`
     as separate keys are all ignored — the response comes back as the whole
     region. District figures therefore come from the region call's `data[]`,
     which already carries every district.
  3. `day` only affects the `daily_signed_count` / `daily_auction_count` /
     `daily_extended_count` fields. `contracts_count` and `total_rental_area`
     are year totals and identical with or without it, so it is not sent.
  4. `total_rental_area` is in SQUARE METRES. The republic figure of
     148 802 333.93 divided by a million is 148,8 — the same measure as the
     operator's static 145,9 mln m², a few months on. The card does that
     division; nothing else should.
*/

interface ApiDistrict {
  /** e.g. 1718203 — the region id with a district suffix. */
  code?: number;
  /** Cyrillic and abbreviated: "Оқдарё т.", "Самарқанд ш." */
  name?: string;
  contracts_count?: string;
  rental_area?: string;
}

interface ApiResponse {
  success?: boolean;
  message?: string;
  summary?: {
    name?: string;
    contracts_count?: string;
    total_rental_area?: string;
  };
  data?: ApiDistrict[];
}

export interface RentContractTotals {
  contracts: number;
  /** Square metres, exactly as the service reports them. */
  areaM2: number;
  /**
   * True when a district was asked for and these are its REGION's figures —
   * the district had no row in the register. The hero says so rather than
   * letting a regional total sit under a district's name.
   */
  widened: boolean;
}

/* ── Matching a district across two feeds ─────────────────────────────── */

/*
  The two services identify districts differently and neither exposes the
  other's key. The listings feed sends a Latin name and no code
  ("Oqdaryo tumani"); this one sends a code and a Cyrillic abbreviation
  ("Оқдарё т."). So the only bridge available is the name.

  THE REAL FIX IS A DISTRICT CODE IN THE LISTINGS FEED. If the operator adds
  one, delete everything between here and `findDistrict` and match on it.

  Until then: transliterate, compare, and REFUSE anything ambiguous. Measured
  against all fourteen regions — 196 districts that actually carry lots — this
  resolves 183 exactly, 13 by a near match, and none by guesswork.
*/

/** Uzbek Cyrillic → Latin. Multi-character forms first. */
const CYRILLIC_TO_LATIN: Record<string, string> = {
  ё: "yo",
  ж: "j",
  ч: "ch",
  ш: "sh",
  ю: "yu",
  я: "ya",
  ц: "ts",
  ў: "o",
  ғ: "g",
  қ: "q",
  ҳ: "h",
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "x",
  ъ: "",
  ь: "",
  ы: "i",
  э: "e",
};

/*
  Abbreviations no character rule can bridge, taken from the live responses.
  Keyed on this service's spelling, which is the abbreviated one.
*/
const DISTRICT_ALIASES: Record<string, string> = {
  qbozor: "qorovulbozor", // Қ-бозор т.   ← Qorovulbozor tumani
  shrashidov: "sharofrashidov", // Ш.Рашидов т. ← Sharof Rashidov tumani
  mulugbek: "mirzoulugbek", // М.Улугбек т.  ← Mirzo Ulug'bek tumani
};

interface DistrictKey {
  base: string;
  /** "sh" for a city, "t" for a district. */
  kind: "sh" | "t";
}

/**
 * A district name reduced to something comparable across the two feeds.
 *
 * The kind is kept rather than thrown away with the rest of the suffix,
 * because several places exist as both: Qashqadaryo has "Шахрисабз т." AND
 * "Шахрисабз ш.", and without the distinction a near match could pick either.
 */
function districtKey(name: string): DistrictKey {
  let s = name.toLowerCase().trim();
  s = [...s].map((c) => CYRILLIC_TO_LATIN[c] ?? c).join("");

  const kind: DistrictKey["kind"] = /(^|[\s.])(sh|shahri|shahar)\.?$/.test(s)
    ? "sh"
    : "t";

  s = s.replace(/(^|[\s.])(tumani|tuman|shahri|shahar|t|sh)\.?$/g, "");
  // Apostrophes vary by keyboard (' ` ʻ ʼ ’) and carry no distinction here.
  s = s.replace(/['`ʻʼ’‘´-]/g, "").replace(/[^a-z0-9]/g, "");

  return { base: DISTRICT_ALIASES[s] ?? s, kind };
}

/** Levenshtein distance, iterative — the names are short. */
function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(
        prev[j] + 1,
        row[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = row;
  }
  return prev[b.length];
}

/**
 * The register's row for a district the listings feed named, or null.
 *
 * Three passes, each stricter about what it will accept than the last is
 * about what it will reject:
 *
 *  1. Exact, on base AND kind.
 *  2. Within two edits, same kind, and only when ONE candidate is that close.
 *     This is what bridges the orthography the two feeds disagree on —
 *     Navbahor/Навбахор, Xazorasp/Ҳазорасп, Bo'stonliq/Бўстонлик, twelve in
 *     all. A tie is refused rather than broken arbitrarily.
 *  3. Exact base of the OTHER kind, and only when it is unique. Uchquduq is
 *     "tumani" in one feed and "ш." in the other; nothing else in the data
 *     needs this.
 *
 * Anything else returns null and the caller widens to the region rather than
 * printing one district's contracts under another's name.
 */
function findDistrict(
  rows: ApiDistrict[],
  districtName: string,
): ApiDistrict | null {
  const keyed = rows
    .filter((r) => typeof r.name === "string")
    .map((r) => ({ row: r, key: districtKey(r.name as string) }));
  const wanted = districtKey(districtName);

  const exact = keyed.find(
    (c) => c.key.base === wanted.base && c.key.kind === wanted.kind,
  );
  if (exact) return exact.row;

  const near = keyed
    .filter((c) => c.key.kind === wanted.kind)
    .map((c) => ({ ...c, d: editDistance(wanted.base, c.key.base) }))
    .filter((c) => c.d <= 2)
    .sort((a, b) => a.d - b.d);
  if (near.length === 1 || (near.length > 1 && near[0].d < near[1].d)) {
    return near[0].row;
  }

  if (near.length === 0) {
    const crossKind = keyed.filter((c) => c.key.base === wanted.base);
    if (crossKind.length === 1) return crossKind[0].row;
  }

  return null;
}

/* ── Fetching ─────────────────────────────────────────────────────────── */

/** Decimal strings throughout; anything unparseable counts as zero. */
function num(value: string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * One region's register entry, or the republic's when `apiId` is 0.
 *
 * Cached for an hour. The register moves by roughly a hundred contracts a day
 * nationally, so nothing on screen is meaningfully staler than that, and the
 * republic call is the slow one — 2.8s cold against 0.4s for a region.
 */
const fetchRegister = unstable_cache(
  async (apiId: number, year: number): Promise<ApiResponse | null> => {
    const base = process.env.RENT_CONTRACTS_API_URL;
    if (!base) return null;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const user = process.env.API_USER;
    const password = process.env.API_PASSWORD;
    if (user && password) {
      headers.Authorization = `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
    }

    const res = await fetch(base, {
      method: "POST",
      headers,
      // 0 is this module's "republic" marker; the service wants the key absent.
      body: JSON.stringify(apiId ? { region: apiId, year } : { year }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`Rent-contracts API responded ${res.status}`);

    const json = (await res.json()) as ApiResponse;
    if (!json.success) {
      throw new Error(json.message ?? `Region ${apiId} returned success:false`);
    }
    return json;
  },
  ["rent-contracts"],
  { revalidate: 3600, tags: ["rent-contracts"] },
);

/**
 * Signed contracts and leased area for the republic, a region, or a district.
 *
 * Null when the service is not configured or the request fails — the hero then
 * keeps the operator's verified static figures rather than showing nothing.
 * That fallback is why this returns null instead of throwing: an unreachable
 * register should cost the page two live numbers, not the whole row.
 */
export async function getRentContracts(
  year: number,
  regionSlug?: string,
  districtName?: string,
): Promise<RentContractTotals | null> {
  if (!process.env.RENT_CONTRACTS_API_URL) return null;

  const region = regionSlug
    ? regions.find((r) => r.slug === regionSlug)
    : undefined;
  if (regionSlug && !region) return null;

  let json: ApiResponse | null;
  try {
    json = await fetchRegister(region?.apiId ?? 0, year);
  } catch (error) {
    console.error(
      "[rent-contracts]",
      regionSlug ?? "republic",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
  if (!json?.summary) return null;

  if (districtName && region) {
    const row = findDistrict(json.data ?? [], districtName);
    if (row) {
      return {
        contracts: num(row.contracts_count),
        areaM2: num(row.rental_area),
        widened: false,
      };
    }
    // Named but not found: the region's figures, flagged as such.
    return {
      contracts: num(json.summary.contracts_count),
      areaM2: num(json.summary.total_rental_area),
      widened: true,
    };
  }

  return {
    contracts: num(json.summary.contracts_count),
    areaM2: num(json.summary.total_rental_area),
    widened: false,
  };
}
