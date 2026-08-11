import { getTranslations } from "next-intl/server";

import { getRegions } from "@/lib/data/catalog";
import { getUpcomingAuctions } from "@/lib/data/listings";
import { ActionLink } from "@/components/common/action-link";
import { CardRotator } from "@/components/common/card-rotator";
import { LotCard } from "@/components/common/lot-card";
import { Section, SectionHeader } from "@/components/layout/section";

/**
 * "Yaqinlashayotgan savdolar" — lots from the NEXT auction day, each with a
 * live countdown, rotating three at a time.
 *
 * One day only, and it can be today. Showing "in 1 day" beside "in 12 days"
 * made the selection look arbitrary; the section is about imminence, so it
 * takes the soonest day that still has an auction ahead of it and stays there.
 *
 * This replaces the old "Yangi qo'yilgan obyektlar" strip. Recency was the
 * weaker hook: "listed three days ago" tells a citizen nothing they can act
 * on, whereas "the auction opens in 2 days" is a deadline.
 *
 * CLAUDE.md listed live auction cards under "deliberately not ported", and
 * the reason was specific: the legacy countdowns ran off `data-end="7260"`,
 * seconds from page load, so every "JONLI" auction restarted its clock on
 * refresh and could show a bidding window for something already closed. That
 * blocker is gone — the service now supplies a real ISO `auction_date` per
 * lot, which is exactly the "server-provided end timestamp" that note asked
 * for. The countdown is derived from it and survives reloads and clock skew.
 */
export async function UpcomingAuctions() {
  const t = await getTranslations("auctions");
  const [{ listings }, regions] = await Promise.all([
    getUpcomingAuctions(12),
    getRegions(),
  ]);

  // Between auction rounds there may genuinely be nothing upcoming. An empty
  // grid under a heading promising auctions is worse than no section.
  if (listings.length === 0) return null;

  const regionName = (slug: string) =>
    regions.find((r) => r.slug === slug)?.name ?? slug;

  return (
    <Section tone="deep">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        action={<ActionLink href="/obyektlar">{t("action")}</ActionLink>}
      />

      {/*
        The pool is a whole auction day's worth of lots; the rotator shows
        three and cycles. Cards are built here, on the server — the rotator
        only chooses which slice is on screen, so no lot data crosses into the
        client bundle as props.
      */}
      <CardRotator
        perView={3}
        interval={8}
        className="grid gap-5 md:grid-cols-2 lg:grid-cols-3"
      >
        {listings.map((listing) => (
          <LotCard
            key={listing.id}
            listing={listing}
            regionName={regionName(listing.region)}
            countdown
          />
        ))}
      </CardRotator>
    </Section>
  );
}
