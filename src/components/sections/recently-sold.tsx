import { getTranslations } from "next-intl/server";

import { getRegions } from "@/lib/data/catalog";
import { getRecentlySold } from "@/lib/data/listings";
import { formatDate } from "@/lib/format";
import { ActionLink } from "@/components/common/action-link";
import { CardCarousel } from "@/components/common/card-carousel";
import { SoldLotCard } from "@/components/common/sold-lot-card";
import { Section, SectionHeader } from "@/components/layout/section";

/**
 * "So'nggi savdo kunida sotilgan obyektlar" — one auction sitting's results.
 *
 * The counterpart to "Yaqinlashayotgan savdolar" directly above it: that one
 * is what is coming, this one is what just went. Together they are the only
 * place on the portal where a citizen can see what state property actually
 * fetches, which is the number that tells them whether it is worth preparing
 * an application at all.
 *
 * ONE DAY, not "the last twelve sales". The calendar runs in sittings — 55
 * lots went on 21 August, none on the 20th, five on the 19th — so a rolling
 * count would splice two or three of them together and the heading would stop
 * being true. Sorted by final price, because on a day of 55 the ones worth
 * showing are the ones that went somewhere.
 *
 * A CAROUSEL, not the rotator above. The rotator swaps three slots on a timer
 * because a whole day's lots cannot be on screen and their order carries no
 * information; here the order IS the information — highest first — so the row
 * stays put and the reader moves along it.
 *
 * WHAT IS DELIBERATELY ABSENT
 *
 * - The buyer. The order endpoint returns their full name, passport number,
 *   PINFL, phone and home address for every one of these lots. The sale is
 *   public; the buyer is not.
 * - A bid count. Neither service reports how many raises a lot took — there is
 *   no bid history, participant count or step field anywhere. The rise from
 *   the start price is shown instead, which is arithmetic on two published
 *   figures rather than an inference about how the auction ran.
 */
export async function RecentlySold() {
  const t = await getTranslations("sold");
  const [result, regions] = await Promise.all([
    getRecentlySold(12),
    getRegions(),
  ]);

  // No sales in the last six weeks, or the service is unreachable. A heading
  // promising results over an empty row is worse than no section.
  if (!result || result.lots.length === 0) return null;

  const regionName = (slug: string) =>
    regions.find((r) => r.slug === slug)?.name ?? slug;

  return (
    /*
      `light`, alternating with the deep section above rather than pairing with
      it. This was deep at first — the two auction sections read as one subject
      seen from both ends — but on screen it just looked like the zebra had
      stopped: in the light theme `deep` resolves to the near-white ground and
      two of them in a row are indistinguishable.

      Every section below this one flipped with it. See the rhythm comment in
      app/[locale]/page.tsx for what that costs at the footer.
    */
    <Section tone="light" id="sotilgan-obyektlar" className="scroll-mt-24">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        // The date is the section's whole premise, so it goes in the sentence
        // under the heading rather than being left for the reader to infer
        // from the cards.
        description={t("description", { date: formatDate(result.day) })}
        /* The sold-objects list, not the catalogue. The catalogue is what is
           still for sale; from a section about results the reader is following
           the results. */
        action={
          <ActionLink href="/sotilgan-obyektlar">{t("action")}</ActionLink>
        }
      />

      <CardCarousel labels={{ prev: t("prev"), next: t("next") }}>
        {result.lots.map((lot) => (
          /*
            The card IS the `<li>` — `SoldLotCard` renders one — so the sizing
            goes on it rather than on a wrapper. Nesting an `<li>` inside an
            `<li>` would be invalid markup for the sake of a class attribute.

            A FIXED width, not a fraction of the row: the track is
            `overflow-x: auto`, so a percentage resolves against the scrollable
            width and every card would come out as wide as the whole row.
            `shrink-0` for the same reason — flex would otherwise compress
            twelve cards into one screen and leave nothing to scroll.
          */
          <SoldLotCard
            key={lot.id}
            lot={lot}
            regionName={regionName(lot.region)}
            className="w-[17rem] shrink-0 snap-start sm:w-[19rem]"
            labels={{
              start: t("startPrice"),
              sold: t("soldPrice"),
              noRise: t("noRise"),
            }}
          />
        ))}
      </CardCarousel>
    </Section>
  );
}
