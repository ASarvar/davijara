import { getTranslations } from "next-intl/server";

import { getRegions } from "@/lib/data/catalog";
import { getLiveAuctionListings } from "@/lib/data/live-auctions";
import { LIVE_STRIP_LIMIT } from "@/lib/live-auctions-limit";
import { ActionLink } from "@/components/common/action-link";
import {
  LiveCardList,
  LiveGate,
  LiveMoreGate,
} from "@/components/common/live-cards";
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
 * DIRECTLY UNDER THE MAP, in the map's own deep tone so the two read as one
 * band: where the objects are, then which of them are being bid on this
 * minute. Keeping the tone also keeps the page's rhythm intact on the many
 * hours when this section is not there at all — see the comment in
 * app/[locale]/page.tsx.
 *
 * UP TO TWO ROWS OF THREE, then a link. The operator's rule: three open rooms
 * are one row, four to six fill a second, and past six the rest are on
 * /joriy-savdolar behind "Barcha joriy savdolar" — which appears only then,
 * because a "see all" link under a strip that already shows all of them
 * promises a page with nothing more on it. The menu entry for that page
 * follows the same number (lib/live-auctions-limit.ts).
 */
export async function LiveAuctions() {
  const [t, listings, regions] = await Promise.all([
    getTranslations("liveAuctions"),
    getLiveAuctionListings(),
    getRegions(),
  ]);

  if (listings.length === 0) return null;

  /*
    Three times the strip's worth of cards is sent, and the browser shows
    the first six whose rooms are still open (LiveCardList). A room closes
    in minutes; sending only six would leave the strip thinning to nothing
    on a page someone left open, while a dozen more rooms were still live.
    Capped rather than all of them, because every card sent is weight in
    the homepage payload whether it is ever shown or not.
  */
  const pool = listings.slice(0, LIVE_STRIP_LIMIT * 3);
  const lots = pool.map((listing) => listing.lotNumber);
  const hasMore = listings.length > LIVE_STRIP_LIMIT;

  const regionName = (slug: string) =>
    regions.find((r) => r.slug === slug)?.name ?? slug;

  return (
    /*
      The whole section goes when its last room closes, heading and all —
      the same rule as rendering nothing when nothing is live at load.
    */
    <LiveGate lots={lots}>
      <Section tone="deep" id="jonli-savdolar" className="scroll-mt-24">
        <SectionHeader
          title={t("title")}
          description={t("description")}
          action={
            /*
              No count on the link, at the operator's request: it was fixed
              at the moment the page was built, and sat beside a tab whose
              count moves every 30 seconds. The link itself follows the live
              count, so it goes when the menu entry does.
            */
            <LiveMoreGate serverHasMore={hasMore}>
              <ActionLink href="/joriy-savdolar">{t("all")}</ActionLink>
            </LiveMoreGate>
          }
          className="mb-6 sm:mb-8"
        />

        {/*
        A GRID OF THREE ON A WIDE SCREEN, A SWIPED ROW ON A NARROW ONE. From
        `lg` the cards sit three to a row, so four to six live lots make the
        second row. Below that a grid would stack six cards into a column six
        screens tall for something that ends in minutes, so the same list is
        one row swiped sideways instead, with `snap-x` so a card always comes
        to rest at the edge rather than half off it.

        Not the rotator the upcoming strip uses either: a card that cycles
        away while a citizen is deciding whether to join that room is the
        wrong kind of motion here.

        `-mx-5 px-5` on the narrow end lets the row bleed to the screen edge
        so a scrolled card is not clipped mid-gutter, and `pb-2` leaves the
        scrollbar somewhere to sit without overlapping the cards.
      */}
        <LiveCardList
          lots={lots}
          limit={LIVE_STRIP_LIMIT}
          className="-mx-5 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-2 sm:-mx-8 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0"
        >
          {pool.map((listing) => (
            <LotCard
              key={listing.id}
              listing={listing}
              regionName={regionName(listing.region)}
              live
              className="w-[17rem] shrink-0 snap-start sm:w-[20rem] lg:w-auto"
            />
          ))}
        </LiveCardList>
      </Section>
    </LiveGate>
  );
}
