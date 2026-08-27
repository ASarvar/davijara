import "server-only";

import { getDb } from "@/lib/db";
import { parseBlocks, type Block } from "@/types/blocks";
import { routing, type Locale } from "@/i18n/routing";

/*
  Public reads for editor-written pages.

  Same division as news: this module NEVER returns a draft, because every
  query in it hard-codes `status = 'published'` and there is no unfiltered
  one to reach for by mistake. The panel's view lives in pages-admin.ts.

  Fallback is Uzbek, per column, for the reason set out at length in
  lib/data/news.ts: a Russian-speaking citizen reading an Uzbek page has the
  information; one reading a blank page does not, and cannot tell whether the
  page exists.
*/

export type PageContent = {
  path: string;
  navKey: string | null;
  /** Empty for a nav-key page — the caller reads the title from messages/nav. */
  title: string;
  description: string;
  blocks: Block[];
};

type Row = {
  path: string;
  nav_key: string | null;
  title: string;
  description: string;
  blocks: string;
};

const SELECT = `
  SELECT
    p.path,
    p.nav_key,
    COALESCE(NULLIF(t.title, ''),       uz.title)       AS title,
    COALESCE(NULLIF(t.description, ''), uz.description) AS description,
    COALESCE(NULLIF(t.blocks, '[]'),    uz.blocks)      AS blocks
  FROM pages p
  JOIN page_translations uz ON uz.page_id = p.id AND uz.locale = 'uz'
  LEFT JOIN page_translations t ON t.page_id = p.id AND t.locale = ?
  WHERE p.status = 'published'
`;

/*
  NULLIF, unlike the news query's plain COALESCE.

  A page_translations row exists as soon as an editor opens a language tab and
  types one field, so a Russian row can legitimately be present with an empty
  body. Plain COALESCE would take that empty body in preference to the Uzbek
  one — a present-but-empty value is not NULL — and the reader would get a
  Russian title above nothing at all. NULLIF turns "empty" back into "absent"
  so the fallback still fires, per column.
*/

function safeLocale(locale?: string): Locale {
  return routing.locales.includes(locale as Locale)
    ? (locale as Locale)
    : routing.defaultLocale;
}

function toContent(row: Row): PageContent {
  return {
    path: row.path,
    navKey: row.nav_key,
    title: row.title,
    description: row.description,
    blocks: parseBlocks(row.blocks),
  };
}

/** Content for one of the site's own routes, found by its nav key. */
export async function getPageByNavKey(
  navKey: string,
  locale?: string,
): Promise<PageContent | undefined> {
  const row = getDb()
    .prepare(`${SELECT} AND p.nav_key = ?`)
    .get(safeLocale(locale), navKey) as Row | undefined;
  return row ? toContent(row) : undefined;
}

/** Content for a page invented in the panel, found by its URL path. */
export async function getPageByPath(
  path: string,
  locale?: string,
): Promise<PageContent | undefined> {
  const row = getDb()
    .prepare(`${SELECT} AND p.path = ?`)
    .get(safeLocale(locale), path) as Row | undefined;
  return row ? toContent(row) : undefined;
}

/**
 * Paths of published pages that have no route file of their own.
 *
 * Only these belong in the sitemap: the 26 registered routes are already
 * listed there as static paths, and adding them again would duplicate every
 * one of them.
 */
export async function getCustomPagePaths(): Promise<string[]> {
  const rows = getDb()
    .prepare(
      "SELECT path FROM pages WHERE status = 'published' AND nav_key IS NULL ORDER BY path",
    )
    .all() as Array<{ path: string }>;
  return rows.map((r) => r.path);
}
