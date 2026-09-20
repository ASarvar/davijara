import { getTranslations } from "next-intl/server";

import { getRegions } from "@/lib/data/catalog";
import { getLiveAuctionListings } from "@/lib/data/live-auctions";
import { LotCard } from "@/components/common/lot-card";
import { Section, SectionHeader } from "@/components/layout/section";

/**
 * "Jonli savdolar" — the lots whose bidding room is open at this moment.
 *
 * ANSWERED BY E-AUKSION, NEVER DERIVED HERE. Our own feed cannot say whether
 * bidding has started: it carries a start timestamp and a status that does
 * not move while the auction runs, and no end time at all. Deriving "live"
 * from the auction's own day marked 48 lots nationwide on a day when one was
 * actually being bid on. So the list comes from the portal's own "Joriy
 * savdolar" endpoint and everything shown on the card comes from our feed —
 * see lib/data/live-auctions.ts.
 *
 * RENDERS NOTHING MOST OF THE TIME, and that is correct rather than a
 * failure: a room closes minutes after it opens, so outside the morning
 * auction rounds there is genuinely nothing live. A heading over an empty
 * grid would read as a fault, and a "no live auctions" notice standing on the
 * homepage all night says nothing a citizen can act on. The same silence
 * covers a fault at the endpoint — both mean "show no live auctions", which
 * is the safe direction: inviting someone into a room that has closed is the
 * failure this whole feature was rewritten to avoid.
 *
 * ONE ROW, DIRECTLY UNDER THE MAP, at the operator's request, and in the
 * map's own deep tone so the two read as one band: where the objects are,
 * then which of them are being bid on this minute. Keeping the tone also
 * keeps the page's rhythm intact on the many hours when this section is not
 * there at all — see the comment in app/[locale]/page.tsx.
 */
export async function LiveAuctions() {
  const [t, listings, regions] = await Promise.all([
    getTranslations("liveAuctions"),
    /*
      Three, because three is what fits the row on a wide screen. A fourth
      open room is reachable from the map above, whose live pins come from
      the same list — this strip is the glance, not the register.
    */
    getLiveAuctionListings(3),
    getRegions(),
  ]);

  if (listings.length === 0) return null;

  const regionName = (slug: string) =>
    regions.find((r) => r.slug === slug)?.name ?? slug;

  return (
    <Section tone="deep" id="jonli-savdolar" className="scroll-mt-24">
      <SectionHeader
        title={t("title")}
        description={t("description")}
        className="mb-6 sm:mb-8"
      />

      {/*
        ONE ROW AT EVERY WIDTH, which is why this is a flex row that scrolls
        sideways rather than a grid that wraps. Three cards fill the row on a
        desktop; on a phone the row is swiped, with `snap-x` so a card always
        comes to rest at the edge rather than half off it. A grid would have
        stacked them into a column three screens tall for something that ends
        in minutes.

        Not the rotator the upcoming strip uses either: a card that cycles
        away while a citizen is deciding whether to join that room is the
        wrong kind of motion here.

        `-mx-5 px-5` on the narrow end lets the row bleed to the screen edge
        so a scrolled card is not clipped mid-gutter, and `pb-2` leaves the
        scrollbar somewhere to sit without overlapping the cards.
      */}
      <ul className="-mx-5 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-2 sm:-mx-8 sm:px-8 lg:mx-0 lg:overflow-visible lg:px-0">
        {listings.map((listing) => (
          <LotCard
            key={listing.id}
            listing={listing}
            regionName={regionName(listing.region)}
            live
            className="w-[17rem] shrink-0 snap-start sm:w-[20rem] lg:w-auto lg:flex-1"
          />
        ))}
      </ul>
    </Section>
  );
}
