import { Search } from "lucide-react";
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
import { Container } from "@/components/layout/section";
import { RegionDistrictFields } from "./region-district-fields";

/*
  The sold-results filter — the counterpart to SearchWidget on /obyektlar, and
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
    <section data-tone="deep" className="bg-band border-hairline border-y">
      <Container className="py-16">
        <Eyebrow as="h2" className="mb-4">
          {ts("filterLabel")}
        </Eyebrow>

        <form
          action={withBasePath(`/${locale}/sotilgan-obyektlar`)}
          method="get"
          className="grid gap-3 md:grid-cols-2 lg:grid-cols-[repeat(4,1fr)_auto]"
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

          <div className="flex items-end">
            <button
              type="submit"
              className="focus-visible:ring-ring group inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[color:var(--color-gold)] px-6 text-sm font-semibold text-[color:var(--color-navy)] transition-[opacity,transform] duration-200 ease-out hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98] lg:w-auto"
            >
              <Search
                aria-hidden="true"
                className="size-4 transition-transform duration-200 group-hover:scale-110"
              />
              {t("submit")}
            </button>
          </div>
        </form>
      </Container>
    </section>
  );
}
