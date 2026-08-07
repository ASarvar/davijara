import { Search } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { getRegionOptions } from "@/lib/data/catalog";
import { getDistrictsByRegion } from "@/lib/data/listings";
import { RegionDistrictFields } from "./region-district-fields";
import { Eyebrow } from "@/components/common/eyebrow";
import { ALL_VALUE, SelectField } from "@/components/common/select-field";
import { Container } from "@/components/layout/section";

/**
 * Object search.
 *
 * The legacy version was four bare `<select>` elements — not wrapped in a
 * form — beside a button with no handler. Nothing was submittable.
 *
 * This is a real GET form targeting /obyektlar, so results stay addressable
 * as ?hudud=&tur=&maydon=&narx= and a search can be linked and indexed. The
 * dropdowns are shadcn's `Select` (Radix, client JS) rather than native
 * `<select>` elements — a deliberate trade against the zero-JS approach, made
 * so the open dropdown panel can carry the site's rounded/gold-bordered
 * styling, which Chromium won't apply to a native `<select>` popup. Radix's
 * hidden bubble `<select>` still submits `name=value` on this form, so GET
 * submission keeps working with no `onSubmit` handler of our own.
 */
export async function SearchWidget({
  /**
   * Where the form submits. Defaults to the homepage's own explorer anchor, so
   * a search filters the map and region list directly below the panel instead
   * of navigating away. /obyektlar passes its own path to filter in place.
   */
  action,
  /**
   * Current values from the URL. Without these the form resets to "Barcha
   * hududlar" after each submit, so the user cannot see what is filtered or
   * change one field without re-entering the rest.
   */
  values,
}: {
  action?: string;
  values?: Record<string, string | string[] | undefined>;
} = {}) {
  const t = await getTranslations("search");
  const locale = await getLocale();
  const regions = await getRegionOptions();

  /** Reads a param back, falling back to the "all" sentinel. */
  const current = (key: string) => {
    const raw = values?.[key];
    const v = Array.isArray(raw) ? raw[0] : raw;
    return v && v.length > 0 ? v : ALL_VALUE;
  };

  // The whole region→district map, so the tuman dropdown can narrow the
  // instant a region is picked rather than after a submit. Reads through the
  // same cached per-region fetches the results do.
  const districtsByRegion = await getDistrictsByRegion();

  /*
    `bg-band` + `border-hairline`, not `bg-navy-mid` + `border-border`: raw
    brand values do not flip in accessibility mode, so this panel used to stay
    navy — with a near-invisible edge — while the rest of the page went black.
    Same fix as the header's utility strip.
  */
  return (
    <section data-tone="deep" className="bg-band border-hairline border-y">
      <Container className="py-16">
        <Eyebrow as="h2" className="mb-4">
          {t("label")}
        </Eyebrow>

        {/*
          Still a plain GET form. Submitting reloads with the filters in the
          URL, which is what makes a result set linkable and lets the server
          send only matching records. The `#obyektlar-xarita` fragment drops
          the reader at the explorer rather than back at the top of the page.
        */}
        <form
          action={action ?? `/${locale}#obyektlar-xarita`}
          method="get"
          className="grid gap-3 md:grid-cols-2 lg:grid-cols-[repeat(4,1fr)_auto]"
        >
          {/*
            Hudud + Tuman are one coupled control — picking a region has to
            narrow the district list immediately, so they live in a small
            client island together. See region-district-fields.tsx.

            Tuman occupies the slot "Obyekt turi" used to. The auction service
            returns no property classification, so a type filter could only be
            populated by inferring a type from the lot's name — a guess about a
            specific state asset, which this portal does not make. District is
            the real second axis the data supports.

            `tur` is still honoured by parseListingQuery, so old links keep
            their meaning against the typed fallback records.
          */}
          <RegionDistrictFields
            regions={regions}
            districtsByRegion={districtsByRegion}
            initialRegion={current("hudud")}
            initialDistrict={current("tuman")}
            labels={{
              region: t("region"),
              anyRegion: t("anyRegion"),
              district: t("district"),
              anyDistrict: t("anyDistrict"),
              regionFirst: t("regionFirst"),
            }}
          />

          <SelectField
            id="maydon"
            name="maydon"
            label={t("area")}
            defaultValue={current("maydon")}
            /*
              Edges taken from the live catalogue's quartiles, not round
              numbers. The previous set started at 50 m², which against real
              data made 59% of lots — every kiosk, ATM bay and technical plot,
              780 of 1319 — unreachable by ANY choice in the dropdown. These
              five each hold 6–30% of the catalogue.
            */
            options={[
              { value: ALL_VALUE, label: t("anyArea") },
              { value: "0-10", label: "0 — 10" },
              { value: "10-50", label: "10 — 50" },
              { value: "50-200", label: "50 — 200" },
              { value: "200-1000", label: "200 — 1000" },
              { value: "1000-", label: "1000+" },
            ]}
          />

          <SelectField
            id="narx"
            name="narx"
            label={t("price")}
            defaultValue={current("narx")}
            /*
              Also from the live quartiles. "10 mln+" used to collect 39% of
              the catalogue in one bucket, across a range running to 2 224 mln
              — too coarse to narrow anything.
            */
            options={[
              { value: ALL_VALUE, label: t("anyPrice") },
              { value: "0-1", label: "0 — 1 mln" },
              { value: "1-5", label: "1 — 5 mln" },
              { value: "5-20", label: "5 — 20 mln" },
              { value: "20-100", label: "20 — 100 mln" },
              { value: "100-", label: "100 mln+" },
            ]}
          />

          <div className="flex items-end">
            <button
              type="submit"
              className="focus-visible:ring-ring group inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[color:var(--color-gold)] px-6 text-sm font-semibold text-[color:var(--color-navy)] transition-[opacity,transform] duration-200 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2 lg:w-auto"
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
