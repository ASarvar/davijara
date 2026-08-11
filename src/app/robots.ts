import type { MetadataRoute } from "next";
import { withBasePath } from "@/lib/base-path";
import { site } from "@/content/site";

/*
  ⚠ Under the /site mount this file is served at /site/robots.txt, and
  crawlers only ever read /robots.txt at the DOMAIN root — which belongs to a
  different project on this server. So these rules do not actually reach
  Googlebot today; the styleguide exclusion has to be added to the root
  project's own robots.txt to take effect.

  Kept correct anyway: the paths below are written root-relative (with the
  base path baked in) because that is how a crawler resolves them, and it
  means this file is already right if the app ever moves to the root or the
  rules are copied across.
*/
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: withBasePath("/"),
      // Internal design reference — should never surface in search results.
      disallow: [
        withBasePath("/uz/styleguide"),
        withBasePath("/ru/styleguide"),
        withBasePath("/en/styleguide"),
      ],
    },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
