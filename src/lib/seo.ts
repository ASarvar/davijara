import type { Metadata } from "next";

import { routing } from "@/i18n/routing";

/**
 * `canonical` + `hreflang` for ONE page, in every locale.
 *
 * Every page has to pass its own path. Next resolves a relative `canonical`
 * against `metadataBase`, never against the route it is declared in, and the
 * root layout cannot see the pathname — so a canonical set there is the same
 * string on every page. That is what shipped: the layout declared `/${locale}`,
 * and all 47 inner pages told search engines they were duplicates of the home
 * page (`/uz/imtiyozlar` → canonical `https://davijara.uz/uz`), which is how a
 * page is kept OUT of the index. The layout now declares none, so a page that
 * forgets this gets no canonical rather than a wrong one.
 *
 * `path` is the route below the locale ("/imtiyozlar"), "" for the home page.
 * Query strings are deliberately left off: a filtered catalogue
 * (`?hudud=…`) is a view of the page, not a page of its own.
 *
 * All three languages are listed for every page because every page renders
 * in all three — the database-backed ones (news, editor pages) fall back to
 * Uzbek per field rather than 404. `x-default` is Uzbek, the site's default.
 */
export function localeAlternates(
  locale: string,
  path = "",
): Metadata["alternates"] {
  return {
    canonical: `/${locale}${path}`,
    languages: {
      ...Object.fromEntries(routing.locales.map((l) => [l, `/${l}${path}`])),
      "x-default": `/${routing.defaultLocale}${path}`,
    },
  };
}
