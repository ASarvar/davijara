import "server-only";

import { getDb } from "@/lib/db";
import { parseBlocks, type Block } from "@/types/blocks";
import { routing, type Locale } from "@/i18n/routing";

/*
  The panel's view of the news store.

  SEPARATE FROM lib/data/news.ts ON PURPOSE, and the separation is a safety
  property rather than tidiness. Every query in that module hard-codes
  `status = 'published' AND published_at <= today` — a draft cannot leak onto
  the public site through a call site that forgot to filter, because there is
  no unfiltered query in the file. This module is the one that sees drafts,
  and nothing public imports it.

  The two also differ in how they treat languages. The public reader gets the
  Uzbek text when a translation is missing (a citizen needs the information
  more than they need it in their own language). An EDITOR must see the
  opposite: an empty Russian tab, so they can tell what still needs
  translating. So nothing here coalesces.
*/

export type NewsStatus = "draft" | "published";

/** A row in the panel's list view. */
export type NewsSummary = {
  id: number;
  slug: string;
  category: string;
  status: NewsStatus;
  publishedAt: string | null;
  title: string;
  /** Which languages have been written — for the language pills in the list. */
  locales: Locale[];
  updatedAt: string | null;
  updatedBy: string | null;
};

/** One language's text for an item, as the editor form holds it. */
export type NewsTranslation = {
  title: string;
  excerpt: string;
  blocks: Block[];
};

/** Everything the edit form needs. */
export type NewsRecord = {
  id: number;
  slug: string;
  category: string;
  status: NewsStatus;
  publishedAt: string | null;
  image: string | null;
  translations: Partial<Record<Locale, NewsTranslation>>;
};

export function listNews(): NewsSummary[] {
  /*
    The title comes from Uzbek, always — it is the one translation that is
    guaranteed to exist, and a list whose rows changed language depending on
    what had been translated would be unreadable.

    GROUP_CONCAT collects the locales in one pass instead of a second query
    per row. With four items that is not a performance decision; with four
    hundred it would be.
  */
  const rows = getDb()
    .prepare(
      `SELECT
         n.id, n.slug, n.category, n.status, n.published_at, n.updated_at,
         uz.title,
         (SELECT GROUP_CONCAT(locale) FROM news_translations WHERE news_id = n.id) AS locales,
         u.full_name AS updated_by
       FROM news n
       JOIN news_translations uz ON uz.news_id = n.id AND uz.locale = 'uz'
       LEFT JOIN users u ON u.id = n.updated_by
       ORDER BY
         /* Drafts first: they are the ones still waiting on someone. */
         CASE n.status WHEN 'draft' THEN 0 ELSE 1 END,
         COALESCE(n.published_at, n.created_at) DESC,
         n.id DESC`,
    )
    .all() as Array<{
    id: number;
    slug: string;
    category: string;
    status: NewsStatus;
    published_at: string | null;
    updated_at: string | null;
    title: string;
    locales: string | null;
    updated_by: string | null;
  }>;

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    category: row.category,
    status: row.status,
    publishedAt: row.published_at,
    title: row.title,
    locales: (row.locales?.split(",") ?? []).filter((l): l is Locale =>
      routing.locales.includes(l as Locale),
    ),
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  }));
}

export function getNewsRecord(id: number): NewsRecord | undefined {
  const item = getDb()
    .prepare(
      `SELECT id, slug, category, status, published_at, image
         FROM news WHERE id = ?`,
    )
    .get(id) as
    | {
        id: number;
        slug: string;
        category: string;
        status: NewsStatus;
        published_at: string | null;
        image: string | null;
      }
    | undefined;

  if (!item) return undefined;

  const rows = getDb()
    .prepare(
      "SELECT locale, title, excerpt, blocks FROM news_translations WHERE news_id = ?",
    )
    .all(id) as Array<{
    locale: Locale;
    title: string;
    excerpt: string;
    blocks: string;
  }>;

  const translations: Partial<Record<Locale, NewsTranslation>> = {};
  for (const row of rows) {
    translations[row.locale] = {
      title: row.title,
      excerpt: row.excerpt,
      blocks: parseBlocks(row.blocks),
    };
  }

  return {
    id: item.id,
    slug: item.slug,
    category: item.category,
    status: item.status,
    publishedAt: item.published_at,
    image: item.image,
    translations,
  };
}

/** True if the slug is taken by a DIFFERENT item. */
export function slugTaken(slug: string, exceptId?: number): boolean {
  const row = getDb()
    .prepare("SELECT id FROM news WHERE slug = ?")
    .get(slug) as { id: number } | undefined;
  return row != null && row.id !== exceptId;
}

/*
  Turn a title into a URL slug.

  UZBEK LATIN IS NOT ASCII. The alphabet carries oʻ, gʻ and the modifier
  apostrophe ʼ, plus ordinary Cyrillic if someone pastes a Russian title in.
  A naive `replace(/[^a-z0-9]/g, "-")` turns "Boʻsh obyektlar" into
  "bo-sh-obyektlar" — a slug with a hyphen inside a word, which is both ugly
  and unsearchable.

  So the modifier letters are stripped (not replaced) before separators are
  collapsed, and the Cyrillic block is transliterated. The result is always
  ASCII, because a percent-encoded URL is not something an editor can
  proof-read or a citizen can read aloud over the phone.
*/
const CYRILLIC_MAP: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  ғ: "g",
  д: "d",
  е: "e",
  ё: "yo",
  ж: "j",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  қ: "q",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ў: "o",
  ф: "f",
  х: "x",
  ҳ: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sh",
  ъ: "",
  ы: "i",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

export function slugify(input: string): string {
  const lowered = input.toLowerCase().trim();

  let out = "";
  for (const char of lowered) {
    if (CYRILLIC_MAP[char] !== undefined) {
      out += CYRILLIC_MAP[char];
    } else if (/[ʻʼ'’`´]/.test(char)) {
      /*
        Dropped, not hyphenated: "oʻzbekiston" must become "ozbekiston", not
        "o-zbekiston". This is the case a generic slugify gets wrong on every
        second Uzbek word.
      */
      continue;
    } else if (/[a-z0-9]/.test(char)) {
      out += char;
    } else {
      out += "-";
    }
  }

  return (
    out
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 90)
      /* A trailing hyphen can reappear after the length cut. */
      .replace(/-$/, "")
  );
}

/** `slugify` plus a numeric suffix if that slug is already in use. */
export function uniqueSlug(title: string, exceptId?: number): string {
  const base = slugify(title) || "yangilik";
  if (!slugTaken(base, exceptId)) return base;

  for (let n = 2; n < 200; n++) {
    const candidate = `${base}-${n}`;
    if (!slugTaken(candidate, exceptId)) return candidate;
  }
  /* 200 collisions on one title is not a real case; a timestamp ends it. */
  return `${base}-${Date.now()}`;
}
