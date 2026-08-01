import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";

import { Hero } from "@/components/sections/hero";
import { SearchWidget } from "@/components/sections/search-widget";
import { RegionGrid } from "@/components/sections/region-grid";
import { HowItWorks } from "@/components/sections/how-it-works";
import { FeaturedListings } from "@/components/sections/featured-listings";
import { Services } from "@/components/sections/services";
import { PrivilegesTeaser } from "@/components/sections/privileges-teaser";
import { Impact } from "@/components/sections/impact";
import { NewsAndDocs } from "@/components/sections/news-and-docs";
import { Faq } from "@/components/sections/faq";
import { Partners } from "@/components/sections/partners";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  /*
    Every section is a Server Component — the homepage ships no page-level
    JavaScript at all. The only client code on this route is the nav's active-
    link highlighting and the mobile menu, both in the shared layout.

    Tone rhythm: deep and light alternate down the page. Previously nine of
    eleven sections were deep, so the light tone read as an accident rather
    than a cadence. Each section sets its own tone (see the component), and
    `data-tone` re-binds the colour tokens for that subtree.
  */
  return (
    <>
      <Hero />
      <SearchWidget />
      <RegionGrid />
      <HowItWorks />
      <FeaturedListings />
      <Services />
      <PrivilegesTeaser />
      <Impact />
      <NewsAndDocs />
      <Faq />
      <Partners />
    </>
  );
}
