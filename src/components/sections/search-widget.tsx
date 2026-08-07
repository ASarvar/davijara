import { Search } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { getRegionOptions } from "@/lib/data/catalog";
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

  return (
    <section data-tone="deep" className="bg-navy-mid border-border border-y">
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
          <SelectField
            id="hudud"
            name="hudud"
            label={t("region")}
            defaultValue={current("hudud")}
            options={[{ value: ALL_VALUE, label: t("anyRegion") }, ...regions]}
          />

          <SelectField
            id="tur"
            name="tur"
            label={t("type")}
            defaultValue={current("tur")}
            options={[
              { value: ALL_VALUE, label: t("anyType") },
              { value: "noturar", label: t("types.noturar") },
              { value: "turar", label: t("types.turar") },
              { value: "ishlab-chiqarish", label: t("types.ishlab-chiqarish") },
              { value: "mamuriy", label: t("types.mamuriy") },
            ]}
          />

          <SelectField
            id="maydon"
            name="maydon"
            label={t("area")}
            defaultValue={current("maydon")}
            options={[
              { value: ALL_VALUE, label: t("anyArea") },
              { value: "50-200", label: "50 — 200" },
              { value: "200-500", label: "200 — 500" },
              { value: "500-1000", label: "500 — 1000" },
              { value: "1000-", label: "1000+" },
            ]}
          />

          <SelectField
            id="narx"
            name="narx"
            label={t("price")}
            defaultValue={current("narx")}
            options={[
              { value: ALL_VALUE, label: t("anyPrice") },
              { value: "0-1", label: "0 — 1 mln" },
              { value: "1-5", label: "1 — 5 mln" },
              { value: "5-10", label: "5 — 10 mln" },
              { value: "10-", label: "10 mln+" },
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
