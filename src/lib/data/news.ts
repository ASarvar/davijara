import "server-only";

import { news } from "@/content/news";
import type { NewsItem } from "@/types/content";

/*
  Data access for the press centre.

  Async even though it reads a local module today — the same contract every
  other module in this folder keeps (see the note in privileges.ts). When the
  Markaz publishes through a CMS, only the bodies here change: every call site
  already awaits, and no page or component imports `@/content/news`.

  This module was briefly wider — category counts, a category filter, an
  older/newer lookup — all of it feeding UI that came out again at the
  operator's request. Removed rather than left in place: an unused exported
  query is indistinguishable from one something depends on.
*/

/** Six rows of one, or three rows of three — a screenful, not more. */
export const NEWS_PER_PAGE = 9;

/**
 * Newest first.
 *
 * Sorted here rather than trusted from the content file, because the ONE
 * ordering rule the whole section depends on — the lead article is the newest
 * one — must not be a property of how carefully someone pasted a record in.
 * String compare is correct for ISO dates and needs no Date objects.
 */
function sorted(items: NewsItem[]): NewsItem[] {
  return [...items].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export async function getNews(limit?: number): Promise<NewsItem[]> {
  const all = sorted(news);
  return limit ? all.slice(0, limit) : all;
}

export async function getArticle(slug: string): Promise<NewsItem | undefined> {
  return news.find((item) => item.slug === slug);
}

/** Every slug, for `generateStaticParams` and the sitemap. */
export async function getNewsSlugs(): Promise<string[]> {
  return news.map((item) => item.slug);
}

/**
 * The sidebar beside an article: same topic first, then the newest of whatever
 * is left, so the column is never short on a thin topic.
 */
export async function getRelatedNews(
  slug: string,
  limit = 4,
): Promise<NewsItem[]> {
  const all = await getNews();
  const current = all.find((item) => item.slug === slug);
  if (!current) return all.slice(0, limit);

  const rest = all.filter((item) => item.slug !== slug);
  const sameCategory = rest.filter((i) => i.category === current.category);
  const others = rest.filter((i) => i.category !== current.category);
  return [...sameCategory, ...others].slice(0, limit);
}
