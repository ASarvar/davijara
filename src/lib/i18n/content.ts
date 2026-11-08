import "server-only";

import en from "@/content/translations/en.json";
import ruInterim from "@/content/translations/ru.interim.json";
import ru from "@/content/translations/ru.json";

/*
  The translators' text for everything that is not a UI message: the
  src/content modules, and the statutory documents the panel edits.

  WHERE IT COMES FROM: tarjima/davijara-tarjima.xlsx, the workbook the
  operator's translators filled in (returned 08.11.2026), imported by
  tarjima/skriptlar/import_xlsx.py. Both dictionaries are generated — fix a
  translation in the workbook and re-run the import, never here.

  KEYED BY THE UZBEK TEXT, not by where it sits. A path like
  `privileges[3].title` points at a different privilege the moment an editor
  reorders the list in the panel; the sentence itself does not move. And a
  sentence an editor has since rewritten has no entry, so it shows in Uzbek
  instead of under a translation of what it used to say.

  The Russian of the statutory text (privileges, legalBasis, the Markaz
  documents) is published as the translators gave it, with no disclaimer —
  the operator's decision of 08.11.2026, which deliberately sets aside the
  "legal text may not be translated" clause of CLAUDE.md's non-negotiable 1.
  The Uzbek text stays the source, verbatim, and every edit to it still goes
  through audit().

  ru.interim.json IS NOT THE TRANSLATORS'. It is Claude's Russian for what
  reached the site after the workbook was built on 22.10.2026: the VM 563
  news item, the director's anticorruption appeal, the vacancy announcements
  and the new head in Fergana. The operator asked for it on 08.11.2026
  rather than wait ("hozircha o'zing tarjima qilib ber"). It is
  hand-written, so edit it directly, and it ranks BELOW ru.json: a string the
  translators deliver later replaces it with no change here. When they have
  covered all of it, the file can go.
*/

const DICTIONARIES: Partial<Record<string, Readonly<Record<string, string>>>> =
  { ru: { ...ruInterim, ...ru }, en };

/*
  Fields that are never prose: links, identifiers, enum values the code
  branches on, dates. The workbook skipped the same keys
  (tarjima/skriptlar/build_xlsx.py SKIP_KEYS), so no translation exists for
  them anyway; skipping them here as well means an id that happens to equal a
  translated word can never be rewritten into something the code no longer
  recognises.
*/
const SKIP_KEYS = new Set([
  "href",
  "url",
  "icon",
  "id",
  "slug",
  "path",
  "file",
  "photo",
  "image",
  "phone",
  "phoneHref",
  "email",
  "emailHref",
  "corporatePhone",
  "corporatePhoneHref",
  "hotline",
  "hotlineHref",
  "key",
  "navKey",
  "desktop",
  "mobile",
  "auctionUrl",
  "lotNumber",
  "fileType",
  "type",
  "kind",
  "date",
  "publishedAt",
  "deadline",
  "testDate",
  "platform",
  "when",
  "number",
  "sourceUrl",
  "questionsListUrl",
  "appeals",
  "letter",
  "category",
  "value",
  "level",
  "src",
  "regionId",
  "updatedAt",
]);

/** One string in the reader's language, or the Uzbek it was given. */
export function translateText(text: string, locale?: string): string {
  const dict = locale ? DICTIONARIES[locale] : undefined;
  return dict?.[text] ?? dict?.[text.trim()] ?? text;
}

/**
 * A copy of `value` with every prose string translated where the
 * dictionary has it. Uzbek (or an unknown locale) returns `value` itself.
 */
export function localizeContent<T>(value: T, locale?: string): T {
  const dict = locale ? DICTIONARIES[locale] : undefined;
  if (!dict) return value;
  return walk(value, dict) as T;
}

/**
 * Like `localizeContent`, but all or nothing: `undefined` if any prose
 * string in `value` has no translation. For copying a whole record into a
 * translations table (migration 20), where a half-translated article would
 * be worse than the Uzbek one the site falls back to.
 */
export function localizeFully<T>(value: T, locale: string): T | undefined {
  const dict = DICTIONARIES[locale];
  if (!dict) return undefined;
  const missing: string[] = [];
  const out = walk(value, dict, missing) as T;
  return missing.length === 0 ? out : undefined;
}

/*
  What counts as prose needing a translation: anything with a letter in it,
  except a link, an address or a bare name the workbook never offered
  (build_xlsx.py `translatable()` and BRANDS).
*/
const NOT_PROSE = /^(https?:\/\/|\/|mailto:|tel:|#)|^[\w.+-]+@[\w-]+\.[\w.]+$/;
const BRANDS = new Set([
  "Telegram",
  "Instagram",
  "Facebook",
  "Davijara",
  "Davijara.uz",
  "YouTube",
]);

function isProse(text: string): boolean {
  const s = text.trim();
  return /\p{L}/u.test(s) && !NOT_PROSE.test(s) && !BRANDS.has(s);
}

function walk(
  value: unknown,
  dict: Readonly<Record<string, string>>,
  missing?: string[],
): unknown {
  if (typeof value === "string") {
    const hit = dict[value] ?? dict[value.trim()];
    if (hit === undefined && missing && isProse(value)) missing.push(value);
    return hit ?? value;
  }
  if (Array.isArray(value)) return value.map((v) => walk(v, dict, missing));
  if (value && typeof value === "object" && isPlain(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k,
        SKIP_KEYS.has(k) ? v : walk(v, dict, missing),
      ]),
    );
  }
  return value;
}

function isPlain(value: object): boolean {
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}
