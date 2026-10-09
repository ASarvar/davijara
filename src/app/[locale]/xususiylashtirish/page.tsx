import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Breadcrumbs } from "@/components/common/breadcrumbs";
import type { Locale } from "@/i18n/routing";
import {
  buildFilterQuery,
  parseListingQuery,
  parsePage,
  parseView,
  summariseByRegion,
} from "@/lib/data/listings";
import { getPrivatizationListings } from "@/lib/data/privatization";
import { Section } from "@/components/layout/section";
import { ObjectsExplorer } from "@/components/sections/objects-explorer";
import { SearchWidget } from "@/components/sections/search-widget";

/*
  Xususiylashtirishga taklif etilayotgan obyektlar — state property offered
  for SALE, kept apart from the lease catalogue at /ijaraga-obyektlar.

  The same page as the catalogue — the same search panel (with the calendar),
  the same explorer (list, map, pager) — fed with the privatization lots
  instead, at the operator's request: one portal, two offers, read the same
  way. Every card carries a "Xususiylashtirish" badge and every pin is the
  bronze one, so a page reached from a search engine still says what it is. Where the data comes from, and which lots count as offered,
  is lib/data/privatization.ts.

  Dynamic per request: the offered set depends on the clock (a lot leaves the
  moment its auction time passes), and the source is cached for ten minutes
  underneath.
*/

export const dynamic = "force-dynamic";

const NAV_KEY = "privatization";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const [tNav, t] = await Promise.all([
    getTranslations({ locale, namespace: "nav" }),
    getTranslations({ locale, namespace: "privatization" }),
  ]);
  return { title: tNav(NAV_KEY), description: t("metaDescription") };
}

export default async function PrivatizationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const [tNav, t] = await Promise.all([
    getTranslations("nav"),
    getTranslations("privatization"),
  ]);

  const sp = await searchParams;
  const page = parsePage(sp);
  const { listings } = await getPrivatizationListings(parseListingQuery(sp));
  const summaries = summariseByRegion(listings);

  // Same helper as the catalogue's pager, so the two cannot drift apart.
  const filterParams = buildFilterQuery(sp);

  return (
    <>
      <Section tone="deep" className="pb-4">
        <Breadcrumbs items={[{ label: tNav(NAV_KEY) }]} />

        <h1
          data-enter
          className="font-heading max-w-3xl text-xl font-semibold text-balance sm:text-2xl lg:text-3xl"
        >
          {tNav(NAV_KEY)}
        </h1>
        <p
          data-enter
          style={{ "--enter-delay": 1 } as React.CSSProperties}
          className="text-muted-foreground mt-4 max-w-2xl text-sm text-pretty"
        >
          {t("pageLede")}
        </p>
      </Section>

      <SearchWidget
        action={`/${locale}/xususiylashtirish`}
        values={sp}
        auctionDay
        market="xususiylashtirish"
      />

      <Section tone="deep">
        <ObjectsExplorer
          listings={listings}
          summaries={summaries}
          hasMock={false}
          showLots
          page={page}
          perPage={12}
          filterQuery={filterParams.toString()}
          basePath="/xususiylashtirish"
          emptyLabel={t("empty")}
          market="xususiylashtirish"
          view={parseView(sp, "royxat")}
          defaultView="royxat"
        />
      </Section>
    </>
  );
}
