import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { PRIVILEGE_CATEGORIES } from "@/lib/data/privileges";
import { getNewsSlugs } from "@/lib/data/news";
import { site } from "@/content/site";

/** Every routable path, without locale prefix. */
const staticPaths = [
  "",
  "/obyektlar",
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

  const paths = [
    ...staticPaths,
    ...PRIVILEGE_CATEGORIES.map((c) => `/imtiyozlar/${c.value}`),
    ...articles.map((slug) => `/yangiliklar/${slug}`),
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
