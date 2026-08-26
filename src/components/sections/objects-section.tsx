import { getTranslations } from "next-intl/server";

import {
  getListings,
  isEmptyQuery,
  parseListingQuery,
  parseView,
  summariseByRegion,
  withFilters,
} from "@/lib/data/listings";
import { Section, SectionHeader } from "@/components/layout/section";
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
 */
export async function ObjectsSection({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const t = await getTranslations("map");
  const query = parseListingQuery(searchParams);

  const { listings, hasMock } = await getListings(query);
  const summaries = summariseByRegion(listings);

  /*
    Both links out of this section carry the active filters. Following either
    one from a filtered homepage used to drop the search, landing the reader on
    a different result set than the one they were looking at — filters live in
    the URL, so they have to be copied across explicitly.

    `withFilters` is the single place that knows which keys those are.
  */
  const moreHref = withFilters("/obyektlar", searchParams);

  return (
    <Section tone="deep" id="obyektlar-xarita" className="scroll-mt-24">
      {/*
        Heading only. The description repeated what the tabs underneath it
        already demonstrate, and the "Barcha obyektlar" link duplicated the
        one the explorer itself renders under the results — two links to
        /obyektlar within a screen of each other, both at the operator's
        request removed.
      */}
      <SectionHeader title={t("title")} 
      />

      {/*
        The homepage is a summary. With no search it shows region totals; once
        a search is running it shows the first 9 lots and hands the rest to
        /obyektlar rather than paginating in place. The map always receives the
        whole matching set — paginating pins would hide objects the user
        explicitly filtered for.
      */}
      <ObjectsExplorer
        listings={listings}
        summaries={summaries}
        hasMock={hasMock}
        showLots={!isEmptyQuery(query)}
        perPage={9}
        moreHref={moreHref}
        view={parseView(searchParams)}
      />
    </Section>
  );
}
