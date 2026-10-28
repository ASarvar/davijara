import type { MetadataRoute } from "next";
import { publishedLocales } from "@/i18n/routing";
import { PAGE_ROUTES, PLACEHOLDER_ONLY_NAV_KEYS } from "@/lib/data/page-routes";
import { placeholderContent } from "@/lib/placeholder-metadata";
import { PRIVILEGE_CATEGORIES } from "@/lib/data/privileges";
import { getNewsSlugs } from "@/lib/data/news";
import { getCustomPagePaths } from "@/lib/data/pages";
import { site } from "@/content/site";

/** Every routable path, without locale prefix. */
const staticPaths = [
  "",
  "/ijaraga-obyektlar",
  "/sotilgan-obyektlar",
  "/ijara-shartnomalari",
  "/xususiylashtirish",
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
  "/aloqa",
  "/eng-kam-stavkalar",
  "/faoliyat",
  "/faoliyat/ijaraga-berish",
  "/faoliyat/savollar",
  "/faoliyat/xatlov",
  "/hujjatlar/dasturlar",
  "/hujjatlar/idoraviy",
  "/hujjatlar/kuchini-yoqotgan",
  "/hujjatlar/loyihalar",
  "/markaz/bosh-ish-orinlari",
  "/markaz/hududiy-boshqarmalar",
  "/markaz/korrupsiyaga-qarshi",
  "/markaz/markaziy-apparat",
  "/markaz/rahbariyat",
  "/markaz/tuzilma",
  "/markaz/vazifalar",
  // /ochiq-malumotlar itself only redirects here; its sub-pages do not.
  "/malumotlar/ochiq-malumotlar",
  "/ochiq-malumotlar/farmon-pf-154",
  "/ochiq-malumotlar/murojaatlar",
  "/ochiq-malumotlar/qaror-3299",
  "/ochiq-malumotlar/qaror-pq-447",
  "/yangiliklar/bayonotlar",
  "/yangiliklar/media",
  "/yangiliklar/ozbekiston",
  // Not /styleguide: a development page, marked noindex.
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
 * Sitemap covering all paths x every PUBLISHED locale, with
 * `alternates.languages` so search engines can associate the language
 * versions of each page. Locales not yet open redirect to Uzbek, so listing
 * them would hand a crawler URLs that are not pages — see `publishedLocales`.
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

  /*
    Placeholder routes with nothing written yet are left out: they are
    `noindex` until an editor fills them (lib/placeholder-metadata.ts), and a
    sitemap that lists a URL the page itself refuses is a contradiction
    search engines report as an error. Checked against the Uzbek row, which
    every other locale falls back to.
  */
  const emptyPlaceholders = new Set(
    (
      await Promise.all(
        PAGE_ROUTES.filter((r) => PLACEHOLDER_ONLY_NAV_KEYS.has(r.navKey)).map(
          async (r) =>
            (await placeholderContent(r.navKey, "uz")) ? null : `/${r.path}`,
        ),
      )
    ).filter((p): p is string => p !== null),
  );

  const paths = [
    ...staticPaths.filter((p) => !emptyPlaceholders.has(p)),
    ...PRIVILEGE_CATEGORIES.map((c) => `/imtiyozlar/${c.value}`),
    ...articles.map((slug) => `/yangiliklar/${slug}`),
    ...customPages.map((path) => `/${path}`),
  ];

  return paths.flatMap((path) =>
    publishedLocales.map((locale) => ({
      url: `${site.url}/${locale}${path}`,
      lastModified: new Date(),
      changeFrequency: path === "" ? ("daily" as const) : ("weekly" as const),
      priority: path === "" ? 1 : path === "/imtiyozlar" ? 0.9 : 0.7,
      alternates: {
        languages: Object.fromEntries(
          publishedLocales.map((l) => [l, `${site.url}/${l}${path}`]),
        ),
      },
    })),
  );
}
