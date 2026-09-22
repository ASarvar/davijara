import { Search } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { withBasePath } from "@/lib/base-path";
import { getRegionOptions } from "@/lib/data/catalog";
import {
  getLeaseDistrictsByRegion,
  type LeaseQuery,
} from "@/lib/data/lease-contracts";
import { ALL_VALUE } from "@/components/common/select-field";
import { Eyebrow } from "@/components/common/eyebrow";
import { Container } from "@/components/layout/section";
import { RegionDistrictFields } from "./region-district-fields";

/*
  The search band of /ijara-shartnomalari — the same band, grid and gold
  button as the catalogue's and the sold results' panels, so the three read
  as views of one portal.

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
    <section data-tone="deep" className="bg-band border-hairline border-y">
      <Container className="py-12">
        <Eyebrow as="h2" className="sr-only">
          {tl("filterLabel")}
        </Eyebrow>

        <form
          action={withBasePath(`/${locale}/ijara-shartnomalari`)}
          method="get"
          role="search"
          className="grid gap-3 md:grid-cols-2 lg:grid-cols-[repeat(4,1fr)_auto]"
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

          <div className="flex items-end md:col-span-2 lg:col-span-1">
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
