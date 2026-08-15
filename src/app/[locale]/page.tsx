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
    Every section is dark. The rhythm is `surface`, alternating base/raised
    from ObjectsSection down:

      Hero             base    ┐ masthead: hero navy under its own cobalt
      SearchWidget     band    ┘ glow, then the navy-mid strip — one block
      ObjectsSection   base
      HowItWorks       raised
      UpcomingAuctions base
      PrivilegesTeaser raised
      NewsAndDocs      base
      Faq              raised
      (footer)         base

    The page used to alternate deep navy with a near-white section. On a
    dark-first brand that is a hard cut every other screen, and it read as two
    sites stitched together rather than one. The raised step is roughly a
    twentieth of that contrast — enough to feel a boundary, not enough to see
    a seam — and the real depth comes from cards sitting above their section
    and from the hero's glow, which is how the reference designs do it too.

    This ordering is the ONLY place the rhythm lives, so reordering the list
    below reorders the surfaces with it. Two `raised` neighbours would merge
    into one long band; two `base` neighbours would flatten.

    RE-ENABLING A COMMENTED SECTION MEANS RE-ASSIGNING FROM THAT POINT DOWN,
    since each one inserted shifts every surface after it.

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
