import "server-only";

import { getDb } from "@/lib/db";

/*
  A building's registered name and address, by cadastre number.

  Used by /ijara-shartnomalari, where the contracts register gives each
  leased object only as a cadastre number. Two services can answer, tried in
  this order:

  1. CADDATA — the Markaz's own gateway to the cadastre (internal address).

       GET <CADDATA_BASE_URL>?tin=201660391&cad_number=14:12:05:01:05:0048
       HTTP Basic, CADDATA_USERNAME / CADDATA_PASSWORD

       →  { code: 200, status: "ok", data: { code: 1, name, address: {
            region, district, mahalla, street, house_number, … },
            hosts: [ … ], … } }

     `tin` IS REQUIRED AND IT IS THE OWNER'S. Measured 21.09.2026: without it
     the gateway answers 2109 "Hash qiymati xato kiritilgan"; with a
     malformed one 2030 "STIR noto'g'ri formatda"; with another
     organisation's 2108 "Ushbu obyekt ko'rsatilgan tashkilotga tegishli
     emas". Only the TIN of the organisation that holds the building answers
     — and the contracts register does not carry one. So this service is
     asked only for objects whose contracts came with a `tin`; see
     lib/data/lease-contracts.ts. Each answer takes 1.2-4.4 s.

  2. The older public cadastre service, as a fallback while (1) cannot be
     asked — no TIN, or not configured.

       GET <CADASTRE_API_URL>?token=<CADASTRE_API_TOKEN>&num=…
       →  { code: 1, name, district, address, subjects: [ … ], … }

     Its token travels in the query string over plain HTTP (the host does
     not answer https), so that URL is never logged.

  RULES THAT HOLD FOR BOTH:

  - ONLY THE NAME AND THE ADDRESS ARE READ. Both answers also list the
    registered owners — `hosts[]` in the first (PINFL, birth date, gender),
    `subjects[]` in the second (passport, PINFL). The types below do not
    declare those fields, so nothing downstream can reach for them, and the
    table stores two strings and nothing else.
  - ONE REQUEST PER NUMBER, and the register holds ~17 000 a year, so every
    answer is kept (migration 14) and a page asks only for the numbers it is
    about to show that are not yet known, six at a time under a hard time
    budget. Whatever has not come back by then shows its cadastre number and
    is filled in on a later view. A slow cadastre can cost the page names,
    never the page.
  - Errors print a cadastre number and a code — never a URL or credentials.
*/

export interface CadastreInfo {
  name: string;
  /** "Samarqand tumani, Qoʻshkoʻprik MFY, Husayn Boyqaro ko'chasi, 23-uy" */
  address: string;
}

/** What the page asks about: a number, and its holder's TIN when known. */
export interface CadastreQuery {
  cad: string;
  tin?: string;
}

interface Named {
  name?: string;
}

interface CaddataResponse {
  code?: number;
  status?: string;
  error?: { code?: number; message?: string };
  data?: {
    code?: number;
    name?: string;
    address?: {
      district?: Named;
      mahalla?: Named;
      street?: Named;
      house_number?: string;
      apartment_number?: string;
    };
  };
}

interface LegacyResponse {
  code?: number;
  name?: string;
  district?: string;
  address?: string;
}

interface Row {
  cad: string;
  found: number;
  name: string;
  address: string;
  fetched_at: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** A found building's name is re-read after this long. */
const FOUND_TTL_MS = 90 * DAY_MS;
/** A number the cadastre did not know is asked about again after this long. */
const MISSING_TTL_MS = DAY_MS;

const CONCURRENCY = 6;
const REQUEST_TIMEOUT_MS = 7_000;
/** The page waits no longer than this for names in total. */
const BUDGET_MS = 8_000;

/**
 * Six colon-separated groups, the last optionally followed by an apartment
 * part ("…:0088/0024"). Anything else in the register — "23:79:", a trailing
 * "/" — is not a number the cadastre can answer, and is not sent.
 */
const CAD_PATTERN = /^\d{2}:\d{2}:\d{2}:\d{2}:\d{2}:\d{3,5}(\/\d{1,5})?$/;

/** A STIR is nine digits. */
const TIN_PATTERN = /^\d{9}$/;

export function isLookupableCad(cad: string): boolean {
  return CAD_PATTERN.test(cad);
}

/* ── Configuration ────────────────────────────────────────────────────── */

interface Caddata {
  base: string;
  authorization: string;
}

interface Legacy {
  base: string;
  token: string;
}

function caddata(): Caddata | null {
  const base = process.env.CADDATA_BASE_URL;
  const user = process.env.CADDATA_USERNAME;
  const password = process.env.CADDATA_PASSWORD;
  if (!base || !user || !password) return null;
  return {
    base,
    authorization: `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`,
  };
}

function legacy(): Legacy | null {
  const base = process.env.CADASTRE_API_URL;
  const token = process.env.CADASTRE_API_TOKEN;
  return base && token ? { base, token } : null;
}

/* ── Cache ────────────────────────────────────────────────────────────── */

function readCache(cads: string[]): Map<string, Row> {
  const out = new Map<string, Row>();
  if (cads.length === 0) return out;
  try {
    const db = getDb();
    const stmt = db.prepare(
      `SELECT cad, found, name, address, fetched_at
         FROM cadastre_objects WHERE cad IN (${cads.map(() => "?").join(",")})`,
    );
    for (const row of stmt.all(...cads) as Row[]) out.set(row.cad, row);
  } catch (error) {
    // No cache is the same answer a cold server gives; the page still renders.
    console.error(
      "[cadastre] cache read",
      error instanceof Error ? error.message : error,
    );
  }
  return out;
}

function writeCache(cad: string, info: CadastreInfo | null): void {
  try {
    getDb()
      .prepare(
        `INSERT INTO cadastre_objects (cad, found, name, address, fetched_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(cad) DO UPDATE SET found = excluded.found,
             name = excluded.name, address = excluded.address,
             fetched_at = excluded.fetched_at`,
      )
      .run(
        cad,
        info ? 1 : 0,
        info?.name ?? "",
        info?.address ?? "",
        new Date().toISOString(),
      );
  } catch (error) {
    console.error(
      "[cadastre] cache write",
      error instanceof Error ? error.message : error,
    );
  }
}

function isFresh(row: Row): boolean {
  const age = Date.now() - Date.parse(row.fetched_at);
  if (!(age >= 0)) return false;
  return age < (row.found ? FOUND_TTL_MS : MISSING_TTL_MS);
}

/* ── Lookups ──────────────────────────────────────────────────────────── */

/*
  Each returns the info, or null when the service ANSWERED that it has none
  for this number (cached as missing for a day). A throw means no answer at
  all — nothing is cached, and the next view asks again.
*/

/** Gateway codes that mean "no such building for this holder" — an answer. */
const CADDATA_NOT_FOUND = new Set([2032, 2108]);

function withSuffix(value: string | undefined, suffix: string): string {
  const v = (value ?? "").trim();
  return v ? `${v}${suffix}` : "";
}

async function lookupCaddata(
  config: Caddata,
  cad: string,
  tin: string,
  signal: AbortSignal,
): Promise<CadastreInfo | null> {
  const url = new URL(config.base);
  url.searchParams.set("tin", tin);
  url.searchParams.set("cad_number", cad);

  const res = await fetch(url, {
    headers: { Authorization: config.authorization },
    signal: AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  // The gateway reports its own errors inside a 200.
  const json = (await res.json()) as CaddataResponse;
  if (json.status !== "ok" || !json.data) {
    const code = json.error?.code;
    if (code != null && CADDATA_NOT_FOUND.has(code)) return null;
    throw new Error(`caddata ${code ?? json.code ?? "?"}`);
  }

  const a = json.data.address;
  /*
    The same shape the older service printed as one line — "Samarqand
    tumani, Qoʻshkoʻprik MFY, Husayn Boyqaro ko'chasi, 23-uy" — assembled
    from the parts this one returns separately.
  */
  const address = [
    a?.district?.name?.trim() ?? "",
    withSuffix(a?.mahalla?.name, " MFY"),
    a?.street?.name?.trim() ?? "",
    withSuffix(a?.house_number, "-uy"),
    withSuffix(a?.apartment_number, "-xonadon"),
  ]
    .filter(Boolean)
    .join(", ");
  const name = (json.data.name ?? "").trim();
  return name || address ? { name, address } : null;
}

async function lookupLegacy(
  config: Legacy,
  cad: string,
  signal: AbortSignal,
): Promise<CadastreInfo | null> {
  const url = new URL(config.base);
  url.searchParams.set("token", config.token);
  url.searchParams.set("num", cad);

  const res = await fetch(url, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json = (await res.json()) as LegacyResponse;
  if (json.code !== 1) return null;

  const name = (json.name ?? "").trim();
  const address = [json.district, json.address]
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(", ");
  return name || address ? { name, address } : null;
}

/* ── Asking ───────────────────────────────────────────────────────────── */

interface Plan {
  /** Holder TIN per lookupable number, where one is known. */
  tins: Map<string, string | undefined>;
  /** What the cache already knows, fresh or not. */
  known: Map<string, CadastreInfo>;
  /** Numbers the cache does not have, or has only past their TTL. */
  stale: string[];
}

function plan(queries: CadastreQuery[]): Plan {
  const tins = new Map<string, string | undefined>();
  for (const q of queries) {
    if (!isLookupableCad(q.cad)) continue;
    const tin = q.tin?.trim();
    if (!tins.get(q.cad)) {
      tins.set(q.cad, tin && TIN_PATTERN.test(tin) ? tin : undefined);
    }
  }

  const wanted = [...tins.keys()];
  const cached = new Map<string, Row>();
  // Chunked: one IN (…) per 500 keeps well under SQLite's variable limit.
  for (let i = 0; i < wanted.length; i += 500) {
    for (const [cad, row] of readCache(wanted.slice(i, i + 500))) {
      cached.set(cad, row);
    }
  }

  const known = new Map<string, CadastreInfo>();
  const stale: string[] = [];
  for (const cad of wanted) {
    const row = cached.get(cad);
    if (row?.found) known.set(cad, { name: row.name, address: row.address });
    if (!row || !isFresh(row)) stale.push(cad);
  }
  return { tins, known, stale };
}

interface AskResult {
  info: Map<string, CadastreInfo>;
  /** Numbers the service answered for, found or not — now cached. */
  answered: number;
  found: number;
  /** Failure reasons and counts — never a URL; one of them carries a token. */
  failures: Record<string, number>;
  /** Stale numbers that could not be asked at all (no TIN, no fallback). */
  unaskable: number;
}

/**
 * Ask the services about `stale`, `concurrency` at a time, until done or
 * until `budgetMs` runs out. Every answer is cached as it arrives, so work
 * cut off by the budget is not lost — the next call starts after it.
 */
async function ask(
  stale: string[],
  tins: Map<string, string | undefined>,
  { concurrency, budgetMs }: { concurrency: number; budgetMs: number },
): Promise<AskResult> {
  const out: AskResult = {
    info: new Map(),
    answered: 0,
    found: 0,
    failures: {},
    unaskable: 0,
  };
  const primary = caddata();
  const fallback = legacy();
  if (stale.length === 0) return out;
  if (!primary && !fallback) {
    out.unaskable = stale.length;
    return out;
  }

  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), budgetMs);

  const queue = [...stale];
  const worker = async () => {
    for (let cad = queue.shift(); cad; cad = queue.shift()) {
      if (controller.signal.aborted) return;
      const tin = tins.get(cad);
      try {
        let info: CadastreInfo | null;
        if (primary && tin) {
          info = await lookupCaddata(primary, cad, tin, controller.signal);
        } else if (fallback) {
          info = await lookupLegacy(fallback, cad, controller.signal);
        } else {
          out.unaskable += 1; // No TIN and no fallback: nothing can be asked.
          continue;
        }
        writeCache(cad, info);
        out.answered += 1;
        if (info) {
          out.found += 1;
          out.info.set(cad, info);
        }
      } catch (error) {
        if (controller.signal.aborted) return; // cut off, not a failure
        const reason = error instanceof Error ? error.message : "error";
        out.failures[reason] = (out.failures[reason] ?? 0) + 1;
      }
    }
  };

  try {
    await Promise.all(Array.from({ length: concurrency }, worker));
  } finally {
    clearTimeout(deadline);
  }
  return out;
}

/**
 * Names and addresses for `queries`, from the cache where known and a
 * service for the rest, within the page's time budget.
 *
 * A number missing from the result simply has no name yet — the caller shows
 * the cadastre number itself. Never throws.
 */
export async function getCadastreInfo(
  queries: CadastreQuery[],
): Promise<Map<string, CadastreInfo>> {
  const { tins, known, stale } = plan(queries);
  const asked = await ask(stale, tins, {
    concurrency: CONCURRENCY,
    budgetMs: BUDGET_MS,
  });
  for (const [cad, info] of asked.info) known.set(cad, info);

  if (Object.keys(asked.failures).length > 0) {
    console.error(
      `[cadastre] ${stale.length} asked, unanswered:`,
      asked.failures,
    );
  }
  return known;
}

/*
  THE NIGHTLY WARM-UP. A page asks only about the twenty numbers it shows, so
  the first reader of every page waited for the cadastre — 8 s for a page
  nobody had opened. This walks the whole register instead, off-hours, so a
  reader finds every name already cached. See /api/cadastre/warm and
  scripts/warm-cadastre.mjs.

  Gentler than a page: fewer requests in flight, because nobody is waiting
  and the cadastre serves other users. Bounded per call so a single HTTP
  request never outlives the proxy in front of it; the script calls again
  until `remaining` reaches zero.
*/
const WARM_CONCURRENCY = 4;

export interface WarmResult extends Omit<AskResult, "info"> {
  /** Lookupable numbers in the register. */
  total: number;
  /** Stale before this call. */
  stale: number;
  /** Still stale after it. */
  remaining: number;
}

export async function warmCadastre(
  queries: CadastreQuery[],
  budgetMs: number,
): Promise<WarmResult> {
  const { tins, stale } = plan(queries);
  const asked = await ask(stale, tins, {
    concurrency: WARM_CONCURRENCY,
    budgetMs,
  });
  return {
    answered: asked.answered,
    found: asked.found,
    failures: asked.failures,
    unaskable: asked.unaskable,
    total: tins.size,
    stale: stale.length,
    remaining: plan(queries).stale.length,
  };
}
