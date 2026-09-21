import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { ActionLink } from "@/components/common/action-link";
import { AutoRefresh } from "@/components/common/auto-refresh";
import { LotCard } from "@/components/common/lot-card";
import { Section } from "@/components/layout/section";
import type { Locale } from "@/i18n/routing";
import { getRegions } from "@/lib/data/catalog";
import { getLiveAuctionListings } from "@/lib/data/live-auctions";
import { formatNumber } from "@/lib/format";

/*
  "Joriy savdolar" — every lot whose bidding room is open right now.

  The homepage strip shows six; this is where the rest are. It is linked from
  that strip and from the "Faoliyat" menu only while more than six are live
  (lib/live-auctions-limit.ts), but the PAGE always exists: a link someone
  shared, or a bookmark, must land on something true rather than a 404 — so
  when nothing is open it says so and points at what opens next.

  RENDERED PER REQUEST, AND REFRESHED IN PLACE EVERY 30 SECONDS. A room
  closes minutes after it opens, so a page cached for the site's usual five
  minutes would keep inviting citizens into rooms that have shut. It was a
  30-second ISR page first; that serves the stale copy to the first request
  after the window, so a 30-second refresh could still show a list a minute
  old. Rendering per request costs little — the upstream list is itself held
  for 30 seconds (lib/data/live-auctions.ts) and the listings for minutes —
  and <AutoRefresh> below re-reads it while the reader has the page open.
*/
export const dynamic = "force-dynamic";

const REFRESH_SECONDS = 30;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "currentAuctions" });
  return { title: t("pageTitle"), description: t("metaDescription") };
}

export default async function CurrentAuctionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const [t, listings, regions] = await Promise.all([
    getTranslations("currentAuctions"),
    getLiveAuctionListings(),
    getRegions(),
  ]);

  const regionName = (slug: string) =>
    regions.find((r) => r.slug === slug)?.name ?? slug;

  return (
    <>
      <AutoRefresh seconds={REFRESH_SECONDS} />
      <Section tone="deep" className="pb-4">
        <Breadcrumbs items={[{ label: t("pageTitle") }]} />

        <h1
          data-enter
          className="font-heading max-w-3xl text-xl font-semibold text-balance sm:text-2xl lg:text-3xl"
        >
          {t("pageTitle")}
        </h1>
        <p
          data-enter
          style={{ "--enter-delay": 1 } as React.CSSProperties}
          className="text-muted-foreground mt-4 max-w-2xl text-sm text-pretty"
        >
          {listings.length === 0
            ? t("pageEmpty")
            : t("pageLede", { count: formatNumber(listings.length) })}
        </p>
      </Section>

      <Section tone="deep">
        {listings.length === 0 ? (
          /*
            Not a dead end. The reader came for an auction; the next ones are
            on the homepage with their countdowns, so that is where this
            points rather than leaving them on an empty page.
          */
          <div
            data-reveal="fade"
            className="border-hairline flex flex-col items-center gap-4 rounded-lg border border-dashed px-6 py-12 text-center"
          >
            <p className="text-muted-foreground text-sm">{t("empty")}</p>
            <ActionLink href="/#yaqinlashayotgan-savdolar">
              {t("emptyAction")}
            </ActionLink>
          </div>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <LotCard
                key={listing.id}
                listing={listing}
                regionName={regionName(listing.region)}
                live
              />
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
