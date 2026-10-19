import { getLocale, getTranslations } from "next-intl/server";

import { withBasePath } from "@/lib/base-path";
import { getRegionOptions } from "@/lib/data/catalog";
import {
  getLeaseDistrictsByRegion,
  type LeaseQuery,
} from "@/lib/data/lease-contracts";
import { ALL_VALUE } from "@/components/common/select-field";
import { Eyebrow } from "@/components/common/eyebrow";
import { FilterActions } from "@/components/common/filter-actions";
import { FilterBand } from "@/components/common/filter-band";
import { RegionDistrictFields } from "./region-district-fields";

/*
  The search band of /ijara-shartnomalari — the same band, grid and
  FilterActions as the catalogue's and the sold results' panels, so the three
  read as views of one portal.

  A plain GET form: the search lives in the URL (`?q=&hudud=&tuman=`), so a
  result can be linked, bookmarked and reached with the back button, and the
  form works with no JavaScript beyond the region→district pair.

  The field is labelled "Kadastr raqami" (the operator's wording) but also
  matches contract numbers, in whole or in part, with or without the colons —
  the page compares digits only.
  The district list is built from the register itself, so no tuman is
  offered that returns nothing.
*/
export async function LeaseFilter({ query }: { query: LeaseQuery }) {
  const t = await getTranslations("search");
  const tl = await getTranslations("leaseContracts");
  const locale = await getLocale();

  const [regions, districtsByRegion] = await Promise.all([
    getRegionOptions(),
    getLeaseDistrictsByRegion(),
  ]);

  return (
    <FilterBand
      id="filter-contracts"
      activeCount={
        [query.q, query.region, query.district].filter(Boolean).length
      }
    >
      <Eyebrow as="h2" className="sr-only">
        {tl("filterLabel")}
      </Eyebrow>

      <form
        action={withBasePath(`/${locale}/ijara-shartnomalari`)}
        method="get"
        role="search"
        className="grid gap-3 md:grid-cols-2 lg:grid-cols-[repeat(2,minmax(0,1fr))_minmax(0,1.2fr)_minmax(0,1fr)_auto]"
      >
        <div className="min-w-0 md:col-span-2">
          <label
            htmlFor="q"
            className="text-muted-foreground mb-1.5 block text-sm"
          >
            {tl("query")}
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={query.q ?? ""}
            autoComplete="off"
            spellCheck={false}
            maxLength={40}
            className="border-input bg-card text-foreground placeholder:text-muted-foreground hover:border-ring/50 focus-visible:border-ring focus-visible:ring-ring/50 h-11 w-full rounded-md border px-3 font-mono text-sm tabular-nums outline-none focus-visible:ring-[3px]"
          />
        </div>

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

        <FilterActions
          compact
          resetHref={
            query.q || query.region || query.district
              ? withBasePath(`/${locale}/ijara-shartnomalari`)
              : undefined
          }
          className="md:col-span-2 lg:col-span-1"
        />
      </form>
    </FilterBand>
  );
}
