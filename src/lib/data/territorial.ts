import territorialData from "@/content/territorial.json";

/*
  Hududiy boshqarmalar — the 14 territorial administrations' current heads.

  Two sources, merged deliberately field-by-field, not one replacing the
  other:

    - the operator's "Hududiy boshqarmalar.docx" (2026-08-27): name, title,
      phone, e-mail and a real photo per region, extracted from its table;
    - the operator's own reference build (localhost:3008/regionals,
      2026-08-27): ADDRESS (this one carries the postal index the docx
      lacked, and the operator asked for it by name as the map source),
      reception hours, and an appeals ("Murojaat") link.

  Names, titles, numbers and e-mail user names are verbatim from the docx —
  including where they read oddly (Fargʻona's entry is a DEPUTY head,
  "boshligʻi oʻrinbosari", not the head; Toshkent viloyati's row has no
  phone at all) and including local parts that don't match their region's
  spelling (jizzah_, not jizzax_). Spelling was normalised to the site's own
  oʻ/gʻ convention and addresses lightly tidied (shahar→shahri, kuchasi→
  koʻchasi) in both sources for the same reason — never a change of
  substance.

  `appeals`: the regionals reference page links every region's "Murojaat"
  to a per-region Telegram bot, but 13 of the 14 are the literal placeholder
  "https://t.me/undefined_ijara_bot" — evidently unfinished on the reference
  site itself. Only Qoraqalpogʻiston's is a real, distinct bot username, so
  only that one is populated here; the rest are `null` and the page hides
  the row rather than publish a dead link (CLAUDE.md: never invent facts —
  an unset placeholder is not a verified value). Fill the rest in once the
  operator has real bot usernames for them.

  `lat`/`lng`: a THIRD source, the operator's own JSON export of the same
  reference page's 14 rows (2026-08-27), each carrying a Google Maps embed
  URL (`location_id`). The pin coordinate lives in that URL's `!2d…!3d…`
  pair (longitude, then latitude) — extracted once here rather than stored
  as the full embed URL, since the page only ever needs a link out, not an
  embedded iframe (see the page's own note on why it does not embed a map).
  Every region has a coordinate, so the page's map link always uses it; the
  address-text Google Maps search is kept as the fallback in code for a
  future region added without one.

  This unit is drawn OUTSIDE the central apparatus on the org chart itself
  (a dashed box — see structure.ts) — it is not part of workers.ts's list.
*/

export type TerritorialOffice = {
  regionId: string;
  region: string;
  fullName: string;
  title: string;
  address: string;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  email: string;
  receptionHours: string | null;
  appeals: string | null;
  photo: string | null;
};

type Entry = Omit<TerritorialOffice, "regionId">;

const DATA = territorialData as Record<string, Entry>;

/** The source document's own row order: Qoraqalpogʻiston, then the 12 viloyats, then Toshkent shahar last. */
const REGION_ORDER = [
  "qoraqalpogiston",
  "andijon",
  "buxoro",
  "jizzax",
  "qashqadaryo",
  "navoiy",
  "namangan",
  "samarqand",
  "sirdaryo",
  "surxondaryo",
  "fargona",
  "toshkent-viloyati",
  "xorazm",
  "toshkent-shahar",
];

export async function getTerritorialOffices(): Promise<TerritorialOffice[]> {
  return REGION_ORDER.filter((id) => DATA[id]?.fullName?.trim()).map(
    (regionId) => ({ regionId, ...DATA[regionId]! }),
  );
}
