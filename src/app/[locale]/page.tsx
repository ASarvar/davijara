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
    Tone rhythm: deep and light alternate down the page. Each section sets its
    own tone, and `data-tone` re-binds the colour tokens for that subtree.

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
      <Services />
      <PrivilegesTeaser />
      <Impact />
      <NewsAndDocs />
      <Faq />
      {/* <Partners /> */}
    </>
  );
}
