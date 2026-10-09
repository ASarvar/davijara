import { Search } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { withBasePath } from "@/lib/base-path";
import { getRegionOptions } from "@/lib/data/catalog";
import { getPrivatizationDistrictsByRegion } from "@/lib/data/privatization";
import { ALL_VALUE } from "@/components/common/select-field";
import { Eyebrow } from "@/components/common/eyebrow";
import { Container } from "@/components/layout/section";
import { RegionDistrictFields } from "./region-district-fields";

/*
  The search band of /xususiylashtirish — the same band, grid and gold button
  as the catalogue's and the lease register's, so the pages read as views of
  one portal.

  Place only (`?hudud=&tuman=`). The catalogue's area and price bands are
  deliberately absent: its price band is a yearly RENT, and a sale price
  filtered against it would be meaningless. A plain GET form, so a result is
  linkable and works without JavaScript beyond the region→district pair; the
  district list comes from the offered lots themselves.
*/
export async function PrivatizationFilter({
  region,
  district,
}: {
  region?: string;
  district?: string;
}) {
  const t = await getTranslations("search");
  const tp = await getTranslations("privatization");
  const locale = await getLocale();

  const [regions, districtsByRegion] = await Promise.all([
    getRegionOptions(),
    getPrivatizationDistrictsByRegion(),
  ]);

  return (
    <section data-tone="deep" className="bg-band border-hairline border-y">
      <Container className="py-12">
        <Eyebrow as="h2" className="sr-only">
          {tp("filterLabel")}
        </Eyebrow>

        <form
          action={withBasePath(`/${locale}/xususiylashtirish`)}
          method="get"
          role="search"
          className="grid gap-3 md:grid-cols-2 lg:grid-cols-[repeat(2,1fr)_auto]"
        >
          <RegionDistrictFields
            regions={regions}
            districtsByRegion={districtsByRegion}
            initialRegion={region ?? ALL_VALUE}
            initialDistrict={district ?? ALL_VALUE}
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
