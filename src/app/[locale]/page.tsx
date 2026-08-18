import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";

import { Hero } from "@/components/sections/hero";
import { SearchWidget } from "@/components/sections/search-widget";
import { ObjectsSection } from "@/components/sections/objects-section";
import { HowItWorks } from "@/components/sections/how-it-works";
import { UpcomingAuctions } from "@/components/sections/upcoming-auctions";
import { Services } from "@/components/sections/services";
import { PrivilegesTeaser } from "@/components/sections/privileges-teaser";
import { Impact } from "@/components/sections/impact";
import { NewsAndDocs } from "@/components/sections/news-and-docs";
import { Faq } from "@/components/sections/faq";
import { Partners } from "@/components/sections/partners";

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  // Next.js 16: searchParams is async.
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const sp = await searchParams;

  /*
    Tone rhythm down the page:

      Hero             deep   ┐ masthead: hero navy under its own cobalt
      SearchWidget     deep   ┘ glow, then the navy-mid strip — one block
      ObjectsSection   deep
      HowItWorks       light  (mist)
      UpcomingAuctions deep
      PrivilegesTeaser light  (mist)
      NewsAndDocs      deep
      Faq              light  (mist)
      (footer)         deep

    Hero + SearchWidget stay deep together as one masthead unit; strict
    deep/light alternation starts at ObjectsSection and runs every section
    after it. Each section sets its own tone via `<Section tone=…>`;
    `data-tone` re-binds the colour tokens for that subtree.

    RE-ENABLING A COMMENTED SECTION MEANS RE-ASSIGNING FROM THAT POINT DOWN,
    since each one inserted shifts every tone after it.

    On rendering: reading `searchParams` opts this route into dynamic
    rendering. That is the deliberate cost of letting the search panel filter
    the map and the region list in place. Every other section is still a
    Server Component, and the map is code-split so it never blocks paint.
  */
  return (
    <>
      <Hero />
      <SearchWidget values={sp} />
      <ObjectsSection searchParams={sp} />
      <HowItWorks />
      <UpcomingAuctions />
      {/* <Services /> */}
      <PrivilegesTeaser />
      {/* <Impact /> */}
      <NewsAndDocs />
      <Faq />
      {/* <Partners /> */}
    </>
  );
}
