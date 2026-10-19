import { getLocale, getTranslations } from "next-intl/server";

import { withBasePath } from "@/lib/base-path";
import { getRegionOptions } from "@/lib/data/catalog";
import {
  getSoldDays,
  getSoldDistrictsByRegion,
  parseSoldQuery,
  SOLD_FROM_KEY,
  SOLD_TO_KEY,
} from "@/lib/data/listings";
import { AuctionDayField } from "@/components/common/auction-day-field";
import { ALL_VALUE } from "@/components/common/select-field";
import { Eyebrow } from "@/components/common/eyebrow";
import { FilterActions } from "@/components/common/filter-actions";
import { FilterBand } from "@/components/common/filter-band";
import { RegionDistrictFields } from "./region-district-fields";

/*
  The sold-results filter — the counterpart to SearchWidget on /ijaraga-obyektlar, and
  deliberately not the same component.

  A catalogue filter and a results filter answer different questions. Area and
  price narrow something you might bid on; a concluded sale is a record, and
  the cuts that matter are WHERE and WHEN. So this drops the two numeric
  ranges and replaces the single "Savdo kuni" with a pair of dates, because a
  record is read across a stretch of days rather than on one.

  Same band and the same grid as the catalogue's panel, so the two pages look
  like two views of one portal rather than two projects: `bg-band` with the
  gold hairline top and bottom, four field columns and the button in the
  trailing `auto` track.
*/
export async function SoldFilter({
  values,
}: {
  /** Current values from the URL, so the panel shows what is filtered. */
  values: Record<string, string | string[] | undefined>;
}) {
  const t = await getTranslations("search");
  const ts = await getTranslations("sold");
  const td = await getTranslations("auctionDay");
  const locale = await getLocale();

  const query = parseSoldQuery(values);
  const [regions, districtsByRegion, days] = await Promise.all([
    getRegionOptions(),
    getSoldDistrictsByRegion(),
    // Scoped to the place, not to the dates — see getSoldDays.
    getSoldDays({ region: query.region, district: query.district }),
  ]);

  const dayLabels = {
    placeholder: td("placeholder"),
    clear: td("clear"),
    months: td.raw("months") as string[],
    weekdays: td.raw("weekdays") as string[],
    lots: td.raw("lots") as string,
  };

  return (
    <FilterBand
      id="filter-sold"
      activeCount={
        [query.region, query.district, query.from, query.to].filter(Boolean)
          .length
      }
    >
      {/* sr-only, not deleted: this is the panel's accessible
          name, and the eyebrow style is what the operator asked to drop. */}
      <Eyebrow as="h2" className="sr-only">
        {ts("filterLabel")}
      </Eyebrow>

      <form
        action={withBasePath(`/${locale}/sotilgan-obyektlar`)}
        method="get"
        className="grid gap-3 md:grid-cols-2 lg:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,1fr))_auto]"
      >
        {/*
            The district list here is built from lots that actually SOLD, not
            from the catalogue's open ones — see getSoldDistrictsByRegion. A
            tuman with nothing sold this year would otherwise sit in the
            dropdown returning zero results.
          */}
        <RegionDistrictFields
          regions={regions}
          districtsByRegion={districtsByRegion}
          initialRegion={query.region ?? ALL_VALUE}
          initialDistrict={query.district ?? ALL_VALUE}
          labels={{
            region: t("region"),
            anyRegion: t("anyRegion"),
            district: t("district"),
            anyDistrict: t("anyDistrict"),
            regionFirst: t("regionFirst"),
          }}
        />

        {/*
            Two calendars rather than one, and both grey out the days that
            produced no sale — so a range can only ever be drawn across days
            that have something in them. `parseSoldQuery` swaps them if they
            are picked the wrong way round.
          */}
        <AuctionDayField
          id="dan"
          name={SOLD_FROM_KEY}
          label={ts("dateFrom")}
          value={query.from}
          days={days}
          labels={dayLabels}
        />

        <AuctionDayField
          id="gacha"
          name={SOLD_TO_KEY}
          label={ts("dateTo")}
          value={query.to}
          days={days}
          labels={dayLabels}
        />

        <FilterActions
          compact
          resetHref={
            query.region || query.district || query.from || query.to
              ? withBasePath(`/${locale}/sotilgan-obyektlar`)
              : undefined
          }
        />
      </form>
    </FilterBand>
  );
}
