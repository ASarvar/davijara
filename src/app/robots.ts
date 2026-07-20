import type { MetadataRoute } from "next";
import { site } from "@/content/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Internal design reference — should never surface in search results.
      disallow: ["/uz/styleguide", "/ru/styleguide", "/en/styleguide"],
    },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
