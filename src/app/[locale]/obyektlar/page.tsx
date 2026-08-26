import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import {
  buildFilterQuery,
  getListings,
  isEmptyQuery,
  parseListingQuery,
  parsePage,
  parseView,
  summariseByRegion,
} from "@/lib/data/listings";
import { Section } from "@/components/layout/section";
import { SearchWidget } from "@/components/sections/search-widget";
import { ObjectsExplorer } from "@/components/sections/objects-explorer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "objects" });
  return { title: t("title"), description: t("metaDescription") };
}

/**
 * Full catalogue: the same explorer as the homepage, with the search panel
 * bound to this route so filtering happens in place.
 */
export default async function ObjectsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("objects");
  const tCommon = await getTranslations("common");

  const sp = await searchParams;
  const query = parseListingQuery(sp);
  const page = parsePage(sp);
  const { listings, hasMock } = await getListings(query);
  const summaries = summariseByRegion(listings);

  /*
    Active filters, serialised for the pager. Passed as a STRING rather than a
    link-building function: functions cannot cross the server/client boundary,
    and doing so threw "Functions cannot be passed directly to Client
    Components" — a 500 on every request here.

    Built by `buildFilterQuery` so the pager cannot drift out of step with the
    parser again; hand-listing the keys here is what dropped `tuman` from every
    page link.
  */
  const filterParams = buildFilterQuery(sp);

  return (
    <>
      <Section tone="deep" className="pb-4">
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="text-muted-foreground flex items-center gap-2 text-sm">
            <li>
              <Link
                href="/"
                className="hover:text-accent-foreground transition-colors"
              >
                {tCommon("breadcrumbHome")}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-foreground">{t("title")}</li>
          </ol>
        </nav>

        <h1
          data-enter
          className="font-heading max-w-3xl text-xl font-semibold text-balance sm:text-2xl lg:text-3xl"
        >
          {t("title")}
        </h1>
        <p
          data-enter
          style={{ "--enter-delay": 1 } as React.CSSProperties}
          className="text-muted-foreground mt-4 max-w-2xl text-sm text-pretty"
        >
          {isEmptyQuery(query)
            ? "Barcha bo'sh davlat mulki obyektlari xaritada va hududlar kesimida."
            : "Tanlangan shartlar bo'yicha natijalar."}
        </p>
      </Section>

      {/*
        Submits to this page, so the results below update in place.

        `auctionDay` adds the "Savdo kuni" calendar on a second row, which
        the homepage panel does not carry — the catalogue is where a date is
        worth combining with region, area and price. See search-widget.tsx.
      */}
      <SearchWidget action={`/${locale}/obyektlar`} values={sp} auctionDay />

      <Section tone="deep">
        <ObjectsExplorer
          listings={listings}
          summaries={summaries}
          hasMock={hasMock}
          // The catalogue always lists lots; region totals are a homepage
          // overview device, not what someone opening /obyektlar wants.
          showLots
          page={page}
          // 12 per page: four rows of three at the widest grid, which is about
          // as much as scans comfortably before the pager is wanted.
          perPage={12}
          filterQuery={filterParams.toString()}
          basePath="/obyektlar"
          emptyLabel={t("emptyFiltered")}
          view={parseView(sp)}
        />
      </Section>
    </>
  );
}
