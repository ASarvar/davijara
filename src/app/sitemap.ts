import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { PRIVILEGE_CATEGORIES } from "@/lib/data/privileges";
import { getNewsSlugs } from "@/lib/data/news";
import { getCustomPagePaths } from "@/lib/data/pages";
import { site } from "@/content/site";

/** Every routable path, without locale prefix. */
const staticPaths = [
  "",
  "/ijaraga-obyektlar",
  "/sotilgan-obyektlar",
  "/statistika",
  "/e-auksion",
  "/imtiyozlar",
  "/xizmatlar",
  "/hujjatlar",
  "/yangiliklar",
  "/markaz",
  "/kirish",
  "/maxfiylik",
  "/shartlar",
  "/sayt-xaritasi",
  // No /maxsus-imkoniyatlar entry — accessibility settings are a dialog in the
  // topbar, available from every page, rather than a route of their own.
  "/xizmatlar/kalkulyator",
];

/*
  GENERATED PER REQUEST, not at build time.

  It was static until the news store moved into the admin panel's database.
  Two reasons it cannot stay that way, and the second is the one that would
  have hurt:

    * a build-time sitemap is a snapshot. Every article published from the
      panel would be missing from it until the next deploy — which is the
      opposite of what a sitemap is for.
    * `next build` would have to open the database to enumerate slugs. On the
      server the build runs as the deploying user and the service runs as
      `davijara`, so the build would create the file (or its WAL) owned by the
      wrong user, and the panel's first write would fail with a permission
      error nothing in the deploy output would have warned about.

  A sitemap is requested by crawlers, rarely, and this query is a single
  indexed SELECT — so per-request generation costs nothing worth saving and
  is always current.
*/
export const dynamic = "force-dynamic";

/**
 * Sitemap covering all paths x all locales, with `alternates.languages` so
 * search engines can associate the three language versions of each page.
 * The legacy site had no sitemap at all.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  /*
    Article URLs come from the news store, never from a hand-kept list here —
    the sitemap and the feed cannot drift apart if only one of them holds the
    slugs. Async for the same reason every data-layer call is: the store moves
    behind an API without this file changing.
  */
  const articles = await getNewsSlugs();

  /*
    Pages invented in the admin panel. Only the CUSTOM ones: a page written
    for one of the site's own 26 section routes is already in `staticPaths`
    (or reachable from it), and listing it again would put duplicate URLs in
    the sitemap for every locale.
  */
  const customPages = await getCustomPagePaths();

  const paths = [
    ...staticPaths,
    ...PRIVILEGE_CATEGORIES.map((c) => `/imtiyozlar/${c.value}`),
    ...articles.map((slug) => `/yangiliklar/${slug}`),
    ...customPages.map((path) => `/${path}`),
  ];

  return paths.flatMap((path) =>
    routing.locales.map((locale) => ({
      url: `${site.url}/${locale}${path}`,
      lastModified: new Date(),
      changeFrequency: path === "" ? ("daily" as const) : ("weekly" as const),
      priority: path === "" ? 1 : path === "/imtiyozlar" ? 0.9 : 0.7,
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((l) => [l, `${site.url}/${l}${path}`]),
        ),
      },
    })),
  );
}
