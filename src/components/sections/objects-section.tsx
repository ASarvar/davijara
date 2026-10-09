import { getTranslations } from "next-intl/server";

import {
  getListings,
  isEmptyQuery,
  parseListingQuery,
  parseView,
  summariseByRegion,
  withFilters,
} from "@/lib/data/listings";
import { getPrivatizationListings } from "@/lib/data/privatization";
import { parseMarket } from "@/lib/listings-view";
import { Section, SectionHeader } from "@/components/layout/section";
import { MarketSwitch } from "./market-switch";
import { ObjectsExplorer } from "./objects-explorer";

/**
 * "Ijara obyektlari xaritada" — the map / region-summary explorer.
 *
 * Filtering happens here, on the server, from the same `?hudud=&tur=…`
 * parameters the search panel above submits. One source of truth for a search
 * (the URL) means a result set is linkable, the back button behaves, and the
 * browser is sent only the matching records.
 *
 * With no parameters, every lot is returned — the "show everything" default.
 *
 * TWO OFFERS, ONE EXPLORER. `?bolim=xususiylashtirish` (MarketSwitch) swaps
 * the lease lots for the privatization lots; the tabs, map, region list and
 * search panel then work on the sales exactly as they do on the leases. The
 * two are never mixed in one set.
 */
export async function ObjectsSection({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const t = await getTranslations("map");
  const query = parseListingQuery(searchParams);
  const market = parseMarket(searchParams);
  const sale = market === "xususiylashtirish";

  /*
    Both sets are read, the shown one under the whole search and the other
    under its PLACE only — which is exactly what MarketSwitch carries across,
    so the count on the other button is the number the reader lands on.
  */
  const placeOnly = { region: query.region, district: query.district };
  const [lease, privatization] = await Promise.all([
    getListings(sale ? placeOnly : query),
    getPrivatizationListings(sale ? query : placeOnly),
  ]);

  const listings = sale ? privatization.listings : lease.listings;
  const summaries = summariseByRegion(listings);

  /*
    Both links out of this section carry the active filters. Following either
    one from a filtered homepage used to drop the search, landing the reader on
    a different result set than the one they were looking at — filters live in
    the URL, so they have to be copied across explicitly.

    `withFilters` is the single place that knows which keys those are.
  */
  const moreHref = withFilters(
    sale ? "/xususiylashtirish" : "/ijaraga-obyektlar",
    searchParams,
  );

  return (
    <Section tone="deep" id="obyektlar-xarita" className="scroll-mt-24">
      {/*
        Heading only. The description repeated what the tabs underneath it
        already demonstrate, and the "Barcha obyektlar" link duplicated the
        one the explorer itself renders under the results — two links to
        /ijaraga-obyektlar within a screen of each other, both at the operator's
        request removed.
      */}
      <SectionHeader title={sale ? t("saleTitle") : t("title")} />

      {/* Hidden when the sale source is not configured: a switch to a set
          that can never hold anything is a dead control. */}
      {privatization.configured ? (
        <MarketSwitch
          market={market}
          counts={{
            ijara: lease.listings.length,
            xususiylashtirish: privatization.listings.length,
          }}
          searchParams={searchParams}
        />
      ) : null}

      {/*
        The homepage is a summary. With no search it shows region totals; once
        a search is running it shows the first 9 lots and hands the rest to
        the catalogue rather than paginating in place. The map always receives
        the whole matching set — paginating pins would hide objects the user
        explicitly filtered for.
      */}
      <ObjectsExplorer
        listings={listings}
        summaries={summaries}
        hasMock={sale ? false : lease.hasMock}
        asOf={sale ? privatization.asOf : lease.asOf}
        showLots={!isEmptyQuery(query)}
        perPage={9}
        moreHref={moreHref}
        view={parseView(searchParams)}
        market={market}
      />
    </Section>
  );
}
