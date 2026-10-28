import "server-only";

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { getPageByNavKey } from "@/lib/data/pages";
import { PAGE_ROUTES } from "@/lib/data/page-routes";
import { localeAlternates } from "@/lib/seo";

/*
  Metadata for a route that is nothing but <PlaceholderPage>.

  KEPT OUT OF SEARCH WHILE IT IS EMPTY. On 27.10.2026 all eighteen of these
  routes still showed "Bo'lim tayyorlanmoqda" on production, and every one
  was in the sitemap and indexable under the site-wide description — eighteen
  near-identical pages that tell a searcher nothing, which is what search
  engines rank a site down for, and which sent people who did find them to a
  dead end. So an empty one is `noindex` (still `follow`: its menu links are
  real) and is left out of the sitemap (app/sitemap.ts).

  THE DAY AN EDITOR FILLS ONE IN, IT OPENS BY ITSELF: the same "has
  published blocks" test PlaceholderPage renders by decides here, the page's
  own panel description becomes its meta description, and nothing in code
  has to change.
*/

/** The editor's content for a placeholder route, if it has any. */
export async function placeholderContent(navKey: string, locale?: string) {
  const page = await getPageByNavKey(navKey, locale);
  return page && page.blocks.length > 0 ? page : undefined;
}

export async function placeholderMetadata(
  locale: string,
  navKey: string,
): Promise<Metadata> {
  const route = PAGE_ROUTES.find((r) => r.navKey === navKey);
  const [t, page] = await Promise.all([
    getTranslations({ locale, namespace: "nav" }),
    placeholderContent(navKey, locale),
  ]);

  return {
    alternates: localeAlternates(locale, route ? `/${route.path}` : ""),
    title: t(navKey),
    ...(page?.description ? { description: page.description } : {}),
    ...(page ? {} : { robots: { index: false, follow: true } }),
  };
}
