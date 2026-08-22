import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";

import { Hero } from "@/components/sections/hero";
import { SearchWidget } from "@/components/sections/search-widget";
import { ObjectsSection } from "@/components/sections/objects-section";
import { HowItWorks } from "@/components/sections/how-it-works";
import { UpcomingAuctions } from "@/components/sections/upcoming-auctions";
import { RecentlySold } from "@/components/sections/recently-sold";
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
      SearchWidget     deep   │ glow, then the navy-mid strip — one block
      ObjectsSection   deep   ┘
      HowItWorks       light  (mist)
      UpcomingAuctions deep
      RecentlySold     light  (mist)
      PrivilegesTeaser deep
      NewsAndDocs      light  (mist)
      Faq              deep
      (footer)         floor  — always the closing surface, either theme

    Each section sets its own tone via `<Section tone=…>`; `data-tone`
    re-binds the colour tokens for that subtree.

    NOTE WHICH WAY ROUND "DEEP" IS IN THE LIGHT THEME. It is the near-white
    ground (#f7f9fc) and `light` is the mist above it (#eef1f8) — so a deep
    section is the PALER of the two there, and two deeps in a row read as the
    zebra having stopped. That is what happened when the two auction sections
    were paired on `deep`, and why they are not any more.

    THE FOOTER IS NOT PART OF THE COUNT. Six content sections between a deep
    masthead and a deep footer cannot alternate and still close on a
    contrasting surface — the parity does not allow it. So the footer stepped
    out of the sequence: `data-tone="floor"` is navy on the dark theme, like
    `deep`, but the darker mist step on the light one, where `deep` would have
    put it on the near-white ground and made it indistinguishable from the
    section above. On the dark theme it does sit navy-on-navy under the FAQ,
    with the gold hairline carrying the boundary. See globals.css.

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
      <Hero searchParams={sp} />
      <SearchWidget values={sp} />
      <ObjectsSection searchParams={sp} />
      <HowItWorks />
      <UpcomingAuctions searchParams={sp} />
      <RecentlySold />
      <PrivilegesTeaser />
      <NewsAndDocs />
      <Faq />
    </>
  );
}
