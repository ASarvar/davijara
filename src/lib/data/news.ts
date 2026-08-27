import "server-only";

import { getDb } from "@/lib/db";
import { parseBlocks, type Block } from "@/types/blocks";
import type { NewsCategory, NewsItem } from "@/types/content";
import { routing, type Locale } from "@/i18n/routing";

/*
  Data access for the press centre — now backed by the admin panel's database.

  This module used to read `@/content/news`, a hand-written TypeScript array,
  and every function here was already `async` against the day it would not.
  That day was the admin panel: the bodies below changed and not one call site
  did, which is the whole reason the rule in CLAUDE.md ("components read
  through lib/data, never from content/") exists.

  The five records that were in that file were copied into the database by
  migration 2, once. The module is still on disk as the seed's source; nothing
  reads it at runtime.

  ┌──────────────────────────────────────────────────────────────────────────┐
  │ FALLBACK IS UZBEK, AND IT IS DELIBERATE.                                 │
  │                                                                          │
  │ A news item is written in Uzbek first and translated when someone gets   │
  │ to it — ru and en rows appear later, or never. Asked for a locale with   │
  │ no row, these queries return the Uzbek text rather than nothing.         │
  │                                                                          │
  │ That is the same choice src/i18n/request.ts already makes for UI strings │
  │ (ru.json and en.json are deep-merged over uz.json), and it is the right  │
  │ one for a state portal: a Russian-speaking citizen reading an Uzbek      │
  │ announcement has the information. A Russian-speaking citizen reading an  │
  │ empty page does not, and cannot tell whether the announcement exists.    │
  └──────────────────────────────────────────────────────────────────────────┘
*/

/** Six rows of one, or three rows of three — a screenful, not more. */
export const NEWS_PER_PAGE = 9;

/** The article body, as blocks. Separate from NewsItem so the list stays cheap. */
export type Article = NewsItem & { blocks: Block[] };

type Row = {
  slug: string;
  category: string;
  published_at: string;
  image: string | null;
  updated_at: string | null;
  title: string;
  excerpt: string;
  blocks: string;
};

/*
  The join that implements the fallback, in one place.

  A LEFT JOIN to the requested locale and an INNER JOIN to Uzbek, then
  COALESCE per column. Per-column rather than per-row on purpose: a
  translation row that has a title but an empty body still shows its Russian
  title, instead of the whole row being discarded for being incomplete.

  Only published items, and only ones whose date has arrived — an item dated
  next Monday is scheduled, not live. That test is in SQL rather than in
  JavaScript so a draft can never leak through a call site that forgot it.
*/
const SELECT = `
  SELECT
    n.slug,
    n.category,
    n.published_at,
    n.image,
    n.updated_at,
    COALESCE(t.title,   uz.title)   AS title,
    COALESCE(t.excerpt, uz.excerpt) AS excerpt,
    COALESCE(t.blocks,  uz.blocks)  AS blocks
  FROM news n
  JOIN news_translations uz
    ON uz.news_id = n.id AND uz.locale = 'uz'
  LEFT JOIN news_translations t
    ON t.news_id = n.id AND t.locale = ?
  WHERE n.status = 'published'
    AND n.published_at IS NOT NULL
    AND n.published_at <= ?
`;

/** Today in Tashkent, as YYYY-MM-DD — the cutoff for scheduled items. */
function today(): string {
  /*
    The server's own clock is UTC, and Tashkent is UTC+5. Comparing a
    YYYY-MM-DD column against a UTC date would keep an item dated today
    hidden until 05:00 local — the whole first working morning of whatever it
    announces. `en-CA` is used only because it formats as YYYY-MM-DD.
  */
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tashkent",
  }).format(new Date());
}

function toItem(row: Row): NewsItem {
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    publishedAt: row.published_at,
    category: row.category as NewsCategory,
    ...(row.updated_at ? { updatedAt: row.updated_at } : {}),
    ...(row.image ? { image: row.image } : {}),
  };
}

/** Normalise anything to a supported locale, defaulting to Uzbek. */
function safeLocale(locale?: string): Locale {
  return routing.locales.includes(locale as Locale)
    ? (locale as Locale)
    : routing.defaultLocale;
}

/** Newest first. */
export async function getNews(
  limit?: number,
  locale?: string,
): Promise<NewsItem[]> {
  const rows = getDb()
    .prepare(
      `${SELECT} ORDER BY n.published_at DESC, n.id DESC ${limit ? "LIMIT ?" : ""}`,
    )
    .all(...[safeLocale(locale), today(), ...(limit ? [limit] : [])]) as Row[];

  return rows.map(toItem);
}

/** How many published items there are — for the pager. */
export async function countNews(): Promise<number> {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS n FROM news
        WHERE status = 'published' AND published_at IS NOT NULL
          AND published_at <= ?`,
    )
    .get(today()) as { n: number };
  return row.n;
}

export async function getArticle(
  slug: string,
  locale?: string,
): Promise<Article | undefined> {
  const row = getDb()
    .prepare(`${SELECT} AND n.slug = ?`)
    .get(safeLocale(locale), today(), slug) as Row | undefined;

  if (!row) return undefined;
  return { ...toItem(row), blocks: parseBlocks(row.blocks) };
}

/** Every published slug, for `generateStaticParams` and the sitemap. */
export async function getNewsSlugs(): Promise<string[]> {
  const rows = getDb()
    .prepare(
      `SELECT slug FROM news
        WHERE status = 'published' AND published_at IS NOT NULL
          AND published_at <= ?
        ORDER BY published_at DESC`,
    )
    .all(today()) as Array<{ slug: string }>;
  return rows.map((r) => r.slug);
}

/**
 * The sidebar beside an article: same topic first, then the newest of whatever
 * is left, so the column is never short on a thin topic.
 */
export async function getRelatedNews(
  slug: string,
  limit = 4,
  locale?: string,
): Promise<NewsItem[]> {
  const rows = getDb()
    .prepare(
      `${SELECT}
         AND n.slug != ?
       ORDER BY
         /*
           Same category first. A CASE in ORDER BY rather than two queries
           stitched together in JavaScript — one round trip, and the LIMIT
           applies to the combined ordering instead of to each half.
         */
         CASE WHEN n.category = (SELECT category FROM news WHERE slug = ?)
              THEN 0 ELSE 1 END,
         n.published_at DESC, n.id DESC
       LIMIT ?`,
    )
    .all(safeLocale(locale), today(), slug, slug, limit) as Row[];

  return rows.map(toItem);
}
