import "server-only";

import { regions } from "@/content/regions";
import { tashkentToday } from "@/lib/format";
import {
  getCadastreInfo,
  warmCadastre,
  type WarmResult,
} from "@/lib/data/cadastre";
import { olderOf, readSnapshot, saveSnapshot } from "@/lib/data/snapshot";
import type { LeaseContract, LeasedObject } from "@/types/content";

/*
  Every signed lease contract, one row per contract, for /ijara-shartnomalari.

  POST <RENT_CONTRACTS_LIST_URL>   HTTP Basic, same credentials as the listings
  service, body: { region: 1703, year: 2026 }

  →  { success, title, count, data: [ { contract_id, contract_number,
       cad_number, contract_date, contract_sum, rental_area, district_name,
       region_name, contract_type } … ] }

  The same register as lib/data/rent-contracts.ts — that module reads its
  totals, this one its rows — and the two agree: the rows summed over all
  fourteen regions gave 29 680 on 21.09.2026, the summary's own figure.

  What was measured, not assumed (21.09.2026, year 2026):

  1. `region` is REQUIRED here, unlike the totals endpoint: without it the
     service answers "Region (viloyat kodi) kiritilishi shart!". The
     republic is therefore fourteen calls, made together — 0.5-0.7 s each,
     1.1 MB for Toshkent shahri, 7.4 MB in all.
  2. There is no paging and no search: every call returns the region's whole
     year. Filtering, grouping and search happen here, over rows held in
     memory for an hour — the same freshness the hero's totals have.
  3. `cad_number` is the only key an object has. 29 680 contracts name 17 069
     distinct numbers; one number carried 64 contracts. A few hundred are
     malformed ("23:79:", a trailing "/"), and those are grouped as written
     and shown without a name — see cadastre.ts.
  4. `contract_sum` is "0.00" on 4 806 contracts. It is printed as published;
     nothing here says why a sum is zero, so nothing here guesses.
  5. Districts come in Cyrillic and abbreviated ("Қўрғонтепа т."). The page
     is Latin, so they are transliterated for display — the letters, not the
     names: see `latinDistrict`.
*/

interface ApiRow {
  contract_id?: string;
  contract_number?: string;
  cad_number?: string;
  contract_date?: string;
  contract_sum?: string;
  rental_area?: string;
  district_name?: string;
  contract_type?: string;
  /**
   * The holder's STIR — NOT sent today. The cadastre gateway answers only
   * for the organisation that holds the building (cadastre.ts), so this is
   * the field the operator is asked to add; read here so that names start
   * arriving the day it appears, with no change on this side.
   */
  tin?: string;
}

interface ApiResponse {
  success?: boolean;
  message?: string;
  data?: ApiRow[];
}

/* ── District names ───────────────────────────────────────────────────── */

/*
  Uzbek Cyrillic to the Latin alphabet in its official form, with ʻ for the
  two modified letters and ʼ for the hard sign — the characters messages/*.json
  already uses. Е has two readings; the positional rule is applied in
  `latinDistrict`.
*/
const LATIN: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "yo",
  ж: "j",
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
  ц: "s",
  ч: "ch",
  ш: "sh",
  ъ: "ʼ",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
  ў: "oʻ",
  қ: "q",
  ғ: "gʻ",
  ҳ: "h",
};

/**
 * "Қўрғонтепа т." -> "Qoʻrgʻontepa tumani", "Андижон ш." -> "Andijon shahri".
 *
 * The register's two suffixes are spelled out, because "t." on a Latin page
 * reads as nothing. Abbreviated names inside the register's own text
 * ("Ш.Рашидов т.", "Қ-бозор т.") are left abbreviated: expanding them would
 * mean choosing a name the register did not give.
 */
export function latinDistrict(cyrillic: string): string {
  const trimmed = cyrillic.trim();
  const body = trimmed.replace(/\s+(т|ш)\.$/u, "");
  const suffix = trimmed.endsWith(" т.")
    ? " tumani"
    : trimmed.endsWith(" ш.")
      ? " shahri"
      : "";

  let out = "";
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    const lower = ch.toLowerCase();
    const upper = ch !== lower;
    const prev = body[i - 1] ?? "";
    const atWordStart = !/[\p{L}]/u.test(prev);

    let latin = LATIN[lower];
    if (latin === undefined) {
      out += ch;
      continue;
    }
    // Е is "ye" at the start of a word or after a vowel.
    if (lower === "е" && (atWordStart || /[аеёиоуэюяў]/iu.test(prev))) {
      latin = "ye";
    }
    if (upper && latin) latin = latin[0].toUpperCase() + latin.slice(1);
    out += latin;
  }
  return out + suffix;
}

/* ── Fetching ─────────────────────────────────────────────────────────── */

function currentYear(): number {
  return Number(tashkentToday().slice(0, 4));
}

function listUrl(): string | null {
  const explicit = process.env.RENT_CONTRACTS_LIST_URL;
  if (explicit) return explicit;
  const base = process.env.RENT_CONTRACTS_API_URL;
  return base ? `${base.replace(/\/+$/, "")}/list-reg` : null;
}

function num(value: string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toContract(row: ApiRow): LeaseContract | null {
  const number = (row.contract_number ?? "").trim();
  if (!number) return null;
  /*
    33 contracts carry no cadastre number at all, and a few carry "0". They
    are still signed contracts and the hero counts them, so they are kept —
    as "" — and grouped per district under a line saying the number is
    missing, rather than dropped and leaving this page a few short of the
    figure that links to it.
  */
  const raw = (row.cad_number ?? "").trim().replace(/\/+$/, "");
  const cad = raw === "0" ? "" : raw;
  return {
    id: num(row.contract_id),
    number,
    cad,
    date: (row.contract_date ?? "").slice(0, 10),
    sum: num(row.contract_sum),
    areaM2: num(row.rental_area),
    district: latinDistrict(row.district_name ?? ""),
    type: (row.contract_type ?? "").trim(),
    tin: row.tin?.trim() || undefined,
  };
}

interface RegionRows {
  contracts: LeaseContract[];
  /** Set when these rows are a stored copy; ISO 8601. */
  asOf?: string;
  /** The register did not answer and there was no stored copy either. */
  failed?: boolean;
}

const snapshotKey = (apiId: number, year: number) =>
  `register:list:${apiId}:${year}`;

async function fetchRegion(
  apiId: number,
  year: number,
): Promise<LeaseContract[]> {
  const url = listUrl();
  if (!url) throw new Error("not configured");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const user = process.env.API_USER;
  const password = process.env.API_PASSWORD;
  if (user && password) {
    headers.Authorization = `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ region: apiId, year }),
    signal: AbortSignal.timeout(30_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json = (await res.json()) as ApiResponse;
  if (!json.success || !Array.isArray(json.data)) {
    throw new Error(json.message ?? "success:false");
  }
  return json.data
    .map(toContract)
    .filter((c): c is LeaseContract => c !== null);
}

/*
  HELD IN MEMORY, NOT IN THE NEXT DATA CACHE. The whole year is up to 1.1 MB a
  region, and the data cache is the wrong place for megabytes it would write
  to disk on every refresh. This is one self-hosted process (DEPLOY.md), so a
  module-level map is shared by every request; `globalThis` keeps it across
  the dev server's module reloads. An in-flight promise is shared too, so
  twenty readers arriving together cost the register one call, not twenty.
*/
const TTL_MS = 60 * 60 * 1000;
/** After a failure, how long the fallback stands before the register is retried. */
const RETRY_MS = 5 * 60 * 1000;

interface Entry {
  at: number;
  promise: Promise<RegionRows>;
}

const globalCache = globalThis as unknown as {
  __leaseContracts?: Map<string, Entry>;
};
const cache = (globalCache.__leaseContracts ??= new Map<string, Entry>());

function loadRegion(apiId: number, year: number): Promise<RegionRows> {
  const key = `${apiId}:${year}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.promise;

  const promise = fetchRegion(apiId, year).then(
    (contracts) => {
      saveSnapshot(snapshotKey(apiId, year), contracts);
      return { contracts };
    },
    (error: unknown) => {
      console.error(
        "[lease-contracts]",
        apiId,
        error instanceof Error ? error.message : error,
      );
      /*
        Not cached for the hour, but not retried on every request either:
        the register lives on an internal address, and when it hangs each
        call waits out its 30 s timeout — per request, per region. So the
        fallback below is held for RETRY_MS and then the register is asked
        again. Meanwhile the last real answer stands in, dated — see
        snapshot.ts.
      */
      cache.set(key, { at: Date.now() - TTL_MS + RETRY_MS, promise });
      const snap = readSnapshot<LeaseContract[]>(snapshotKey(apiId, year));
      return Array.isArray(snap?.data)
        ? { contracts: snap.data, asOf: snap.fetchedAt }
        : { contracts: [], failed: true };
    },
  );
  cache.set(key, { at: Date.now(), promise });
  return promise;
}

/* ── Query ────────────────────────────────────────────────────────────── */

export interface LeaseQuery {
  /** Region slug, as in the rest of the site's `?hudud=`. */
  region?: string;
  /** Latin district name, as `latinDistrict` spells it. */
  district?: string;
  /** Cadastre or contract number, whole or in part. */
  q?: string;
}

/**
 * First value only, trimmed. `all` is the Select's "no filter" sentinel
 * (SelectField's ALL_VALUE) and arrives on EVERY submit for a field the
 * reader did not touch — read as a district name it matched nothing, so
 * choosing a region and pressing Qidirish returned an empty page.
 */
function first(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  const trimmed = v?.trim();
  return trimmed && trimmed !== "all" ? trimmed : undefined;
}

export function parseLeaseQuery(
  sp: Record<string, string | string[] | undefined>,
): LeaseQuery {
  const region = first(sp.hudud);
  return {
    region: regions.some((r) => r.slug === region) ? region : undefined,
    district: region ? first(sp.tuman) : undefined,
    q: first(sp.q)?.slice(0, 40),
  };
}

/** Digits only — "17:14:43:02:01:0028" and "1714430201 0028" are one search. */
const digits = (s: string) => s.replace(/\D/g, "");

export interface LeaseResult {
  objects: LeasedObject[];
  contracts: number;
  areaM2: number;
  /** Oldest stored copy on the page, when any region fell back to one. */
  asOf?: string;
  /** Regions the register could not answer for and had no copy of. */
  missingRegions: number;
}

async function loadScope(regionSlug?: string) {
  const year = currentYear();
  const scope = regionSlug
    ? regions.filter((r) => r.slug === regionSlug)
    : regions;
  const loaded = await Promise.all(
    scope.map(async (r) => ({
      region: r.slug,
      rows: await loadRegion(r.apiId, year),
    })),
  );
  return { year, loaded };
}

/**
 * Leased objects for the query, grouped by cadastre number, most recently
 * contracted first. Names are not attached here — see `withNames`, which the
 * page calls for the one page of objects it is about to show.
 */
export async function getLeasedObjects(
  query: LeaseQuery,
): Promise<LeaseResult> {
  const { loaded } = await loadScope(query.region);
  const needle = query.q ? digits(query.q) : "";
  /*
    Both numbers are digits. A search with none in it ("zzz") matches no
    contract — it must not fall through to "no search" and list everything
    under a line that says it found something.
  */
  if (query.q && !needle) {
    return { objects: [], contracts: 0, areaM2: 0, missingRegions: 0 };
  }

  const groups = new Map<string, LeasedObject>();
  let asOf: string | undefined;
  let missingRegions = 0;
  let contracts = 0;
  let areaM2 = 0;

  for (const { region, rows } of loaded) {
    asOf = olderOf(asOf, rows.asOf);
    if (rows.failed) missingRegions += 1;

    for (const c of rows.contracts) {
      if (query.district && c.district !== query.district) continue;
      if (
        needle &&
        !digits(c.number).includes(needle) &&
        !digits(c.cad).includes(needle)
      ) {
        continue;
      }

      contracts += 1;
      areaM2 += c.areaM2;

      /*
        Keyed by region too: a malformed number can repeat across regions.
        Contracts with no number group per district, not into one national
        "unknown" object that would claim to be a single building.
      */
      const key = c.cad ? `${region}|${c.cad}` : `${region}||${c.district}`;
      let obj = groups.get(key);
      if (!obj) {
        obj = {
          cad: c.cad,
          region,
          district: c.district,
          contracts: [],
          areaM2: 0,
          latestId: c.id,
        };
        groups.set(key, obj);
      }
      obj.contracts.push(c);
      obj.areaM2 += c.areaM2;
      if (c.id > obj.latestId) obj.latestId = c.id;
    }
  }

  const objects = [...groups.values()];
  for (const o of objects) {
    o.contracts.sort((a, b) => b.id - a.id);
  }
  /*
    NEWEST FIRST BY REGISTER ID, NOT BY DATE. The ids rise as contracts are
    entered; the dates are typed, and three of them are in the future (one
    reads 17.02.2031). Sorting by date put that typo at the top of the
    republic's list. The date is still printed exactly as the register has it.
  */
  objects.sort((a, b) => b.latestId - a.latestId);

  return { objects, contracts, areaM2, asOf, missingRegions };
}

/** The same objects with the cadastre's name and address where it has one. */
export async function withNames(
  objects: LeasedObject[],
): Promise<LeasedObject[]> {
  // The newest contract's holder TIN — contracts arrive newest first.
  const info = await getCadastreInfo(
    objects.map((o) => ({
      cad: o.cad,
      tin: o.contracts.find((c) => c.tin)?.tin,
    })),
  );
  return objects.map((o) => {
    const found = info.get(o.cad);
    return found
      ? {
          ...o,
          name: found.name || undefined,
          address: found.address || undefined,
        }
      : o;
  });
}

/**
 * One step of the nightly warm-up: every object in the republic's register,
 * in the list's own order — newest first, so the pages readers open most are
 * the first to be filled. See `warmCadastre` in cadastre.ts.
 */
export async function warmNames(budgetMs: number): Promise<WarmResult> {
  const { objects } = await getLeasedObjects({});
  return warmCadastre(
    objects.map((o) => ({
      cad: o.cad,
      tin: o.contracts.find((c) => c.tin)?.tin,
    })),
    budgetMs,
  );
}

/**
 * Districts that have at least one contract, per region, for the filter —
 * built from the register itself so no district is offered that returns
 * nothing.
 */
export async function getLeaseDistrictsByRegion(): Promise<
  Record<string, string[]>
> {
  const { loaded } = await loadScope();
  const out: Record<string, string[]> = {};
  for (const { region, rows } of loaded) {
    const names = new Set(
      rows.contracts.map((c) => c.district).filter(Boolean),
    );
    out[region] = [...names].sort((a, b) => a.localeCompare(b, "uz"));
  }
  return out;
}

export function leaseYear(): number {
  return currentYear();
}
