import minRatesData from "@/content/min-rates.json";
import { REGION_ORDER, regionName } from "./territorial";

/*
  Eng kam stavkalar — the per-region minimum lease-rate approval documents.

  "Davlat mulkidan foydalanganlik uchun ijara toʻlovining eng kam
  stavkalarini tasdiqlash toʻgʻrisida maʼlumotlar" — the reference page's
  own title (localhost:3008/stavka), kept verbatim as this page's own
  heading; it is the one line of legal-sounding prose here, everything else
  is a region name and a PDF.

  One PDF per region, supplied directly by the operator (2026-08-27, 14
  files matching the 14 territorial administrations) and stored in
  src/content/min-rates.json — a plain regionId → path map, the files
  themselves under public/eng-kam-stavkalar/. Region NAMES are not
  duplicated here — they come from lib/data/territorial.ts's own list
  (`regionName`), the one place the 14 official region names live, so this
  page and the territorial-offices page can never quietly disagree on how a
  region is spelled.

  Unlike territorial.ts / workers.ts, there is no per-region "is this filled
  in" question — the operator supplied all 14 at once — but the same
  defensive shape is kept (skip an id with no PDF) so a 15th region added
  later without its document yet does not render a dead link.
*/

export type MinRateRegion = {
  regionId: string;
  region: string;
  pdf: string;
};

const DATA = minRatesData as Record<string, string>;

export async function getMinRates(): Promise<MinRateRegion[]> {
  return REGION_ORDER.filter((id) => DATA[id]).map((regionId) => ({
    regionId,
    region: regionName(regionId) ?? regionId,
    pdf: DATA[regionId]!,
  }));
}
