import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";

import { Hero } from "@/components/sections/hero";
import { SearchWidget } from "@/components/sections/search-widget";
import { ObjectsSection } from "@/components/sections/objects-section";
import { HowItWorks } from "@/components/sections/how-it-works";
import { UpcomingAuctions } from "@/components/sections/upcoming-auctions";
import { PrivilegesTeaser } from "@/components/sections/privileges-teaser";
import { NewsAndDocs } from "@/components/sections/news-and-docs";
import { Faq } from "@/components/sections/faq";

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

    THREE SECTIONS ARE BUILT BUT NOT ON THIS PAGE: `services` (light),
    `impact` (deep) and `partners` (deep) all exist under components/sections
    and render correctly. They are left out rather than commented in place,
    because a commented-out `<Section>` is invisible to the type checker and
    its import trips the linter. Adding any of them back means re-assigning
    every tone AFTER its insertion point — each one inserted flips the
    alternation for the rest of the page.

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
      <PrivilegesTeaser />
      <NewsAndDocs />
      <Faq />
    </>
  );
}
