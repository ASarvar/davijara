import openDataJson from "@/content/open-data.json";

/*
  Ochiq maʼlumotlar — the Centre's quarterly budget-transparency reports.

  Nine categories, each a real legal-disclosure requirement (budget
  execution, procurement, payables, vehicle fleet, business-trip spend…) —
  headings are the operator's reference page's own wording
  (localhost:3008/openData), kept verbatim bar apostrophe normalisation and
  one obvious typo restored (Oʻzbekiston), same rule as everywhere else on
  this site: never reword or shorten a government document's own title.

  THIRD pass at this page's shape (2026-08-28). Data now goes back to 2023
  (116 quarter-entries / 144 files — see src/content/open-data.json's own
  note); the page itself picked ONE PERIOD AT A TIME via a select in the
  URL (`?davr=YYYY-Q`) rather than a per-category expandable archive — the
  operator's own call, after the expandable-history version.

  Categories don't all start the same quarter (smeta-ijrosi's earliest is
  2023 Q1; xizmat-avtotransport's is 2024 Q1) — `getAvailablePeriods()` is
  the UNION across all nine, so the select always has every period anyone
  published in; `getOpenDataForPeriod()` simply omits a category from a
  period it has nothing for, the same "missing = hidden, not broken" rule
  the rest of this site follows.

  UPDATED EVERY QUARTER: a later quarter is added by appending to a
  category's `quarters` array in open-data.json — it then appears in the
  select automatically, nothing else to touch.
*/

export type OpenDataFile = {
  label: string | null;
  path: string;
};

export type OpenDataQuarter = {
  year: number;
  quarter: number;
  files: OpenDataFile[];
};

export type OpenDataPeriodEntry = {
  categoryId: string;
  heading: string;
  files: OpenDataFile[];
};

export type PeriodOption = {
  /** "YYYY-Q" — the select's own option value and the `davr` query param. */
  value: string;
  year: number;
  quarter: number;
  label: string;
};

type Entry = {
  heading: string;
  quarters: OpenDataQuarter[];
};

const DATA = openDataJson as Record<string, Entry>;

/** The reference page's own category order (its numbering 1–3 folds into "smeta-ijrosi" here). */
const CATEGORY_ORDER = [
  "smeta-ijrosi",
  "veb-sayt-3299",
  "balans",
  "qarzdorlik",
  "tarmoq-shtat",
  "davlat-xaridlari",
  "xizmat-safari",
  "xaridlar-rejasi",
  "xizmat-avtotransport",
];

function periodValue(year: number, quarter: number): string {
  return `${year}-${quarter}`;
}

/** Every (year, quarter) published by ANY category, newest first — the select's options. */
export async function getAvailablePeriods(): Promise<PeriodOption[]> {
  const seen = new Map<string, PeriodOption>();
  for (const categoryId of CATEGORY_ORDER) {
    for (const q of DATA[categoryId]?.quarters ?? []) {
      const value = periodValue(q.year, q.quarter);
      if (!seen.has(value)) {
        seen.set(value, {
          value,
          year: q.year,
          quarter: q.quarter,
          label: `${q.year}, ${q.quarter}-chorak`,
        });
      }
    }
  }
  return [...seen.values()].sort(
    (a, b) => b.year - a.year || b.quarter - a.quarter,
  );
}

/** The most recent period across every category — the page's default when `?davr=` is absent or invalid. */
export async function getLatestPeriod(): Promise<PeriodOption | null> {
  const periods = await getAvailablePeriods();
  return periods[0] ?? null;
}

/**
 * Every category that published something for this exact (year, quarter),
 * in the reference page's own category order. A category with nothing for
 * this period is left out — see the module note.
 */
export async function getOpenDataForPeriod(
  year: number,
  quarter: number,
): Promise<OpenDataPeriodEntry[]> {
  const entries: OpenDataPeriodEntry[] = [];
  for (const categoryId of CATEGORY_ORDER) {
    const entry = DATA[categoryId];
    const match = entry?.quarters.find(
      (q) => q.year === year && q.quarter === quarter,
    );
    if (match) {
      entries.push({ categoryId, heading: entry!.heading, files: match.files });
    }
  }
  return entries;
}
