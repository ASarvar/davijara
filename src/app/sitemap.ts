import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { PRIVILEGE_CATEGORIES } from "@/lib/data/privileges";
import { site } from "@/content/site";

/** Every routable path, without locale prefix. */
const staticPaths = [
  "",
  "/obyektlar",
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
  "/maxsus-imkoniyatlar",
];

/**
 * Sitemap covering all paths x all locales, with `alternates.languages` so
 * search engines can associate the three language versions of each page.
 * The legacy site had no sitemap at all.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    ...staticPaths,
    ...PRIVILEGE_CATEGORIES.map((c) => `/imtiyozlar/${c.value}`),
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
