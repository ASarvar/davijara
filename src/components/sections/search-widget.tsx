import { Search } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { getRegionOptions } from "@/lib/data/catalog";
import { Eyebrow } from "@/components/common/eyebrow";
import { Container } from "@/components/layout/section";

/**
 * Object search.
 *
 * The legacy version was four bare `<select>` elements — not wrapped in a
 * form — beside a button with no handler. Nothing was submittable.
 *
 * This is a real GET form targeting /obyektlar, deliberately built from native
 * `<select>` elements rather than shadcn's Select. That choice costs nothing
 * visually and buys a lot: the widget ships **zero JavaScript**, works with JS
 * disabled or still loading, gets the OS-native picker on mobile, and is
 * keyboard- and screen-reader-correct without any ARIA of our own. Results are
 * addressable as ?hudud=&tur=&maydon=&narx=, so a search can be linked and
 * indexed.
 */
export async function SearchWidget() {
  const t = await getTranslations("search");
  const locale = await getLocale();
  const regions = await getRegionOptions();

  const fieldClass =
    "border-input bg-card text-foreground focus-visible:ring-ring hover:border-ring/40 w-full appearance-none rounded-md border px-3 py-2.5 text-sm transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none";

  return (
    <section data-tone="deep" className="bg-background border-border border-y">
      <Container className="py-8">
        <Eyebrow as="h2" className="mb-4">
          {t("label")}
        </Eyebrow>

        <form
          action={`/${locale}/obyektlar`}
          method="get"
          className="grid gap-3 md:grid-cols-2 lg:grid-cols-[repeat(4,1fr)_auto]"
        >
          <div>
            <label htmlFor="hudud" className="text-muted-foreground mb-1.5 block text-xs">
              {t("region")}
            </label>
            <select id="hudud" name="hudud" className={fieldClass} defaultValue="">
              <option value="">{t("anyRegion")}</option>
              {regions.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="tur" className="text-muted-foreground mb-1.5 block text-xs">
              {t("type")}
            </label>
            <select id="tur" name="tur" className={fieldClass} defaultValue="">
              <option value="">{t("anyType")}</option>
              <option value="noturar">{t("types.noturar")}</option>
              <option value="turar">{t("types.turar")}</option>
              <option value="ishlab-chiqarish">{t("types.ishlab-chiqarish")}</option>
              <option value="mamuriy">{t("types.mamuriy")}</option>
            </select>
          </div>

          <div>
            <label htmlFor="maydon" className="text-muted-foreground mb-1.5 block text-xs">
              {t("area")}
            </label>
            <select id="maydon" name="maydon" className={fieldClass} defaultValue="">
              <option value="">{t("anyArea")}</option>
              <option value="50-200">50 — 200</option>
              <option value="200-500">200 — 500</option>
              <option value="500-1000">500 — 1000</option>
              <option value="1000-">1000+</option>
            </select>
          </div>

          <div>
            <label htmlFor="narx" className="text-muted-foreground mb-1.5 block text-xs">
              {t("price")}
            </label>
            <select id="narx" name="narx" className={fieldClass} defaultValue="">
              <option value="">{t("anyPrice")}</option>
              <option value="0-50">50 mln gacha</option>
              <option value="50-200">50 — 200 mln</option>
              <option value="200-">200 mln+</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="bg-[color:var(--color-gold)] text-[color:var(--color-navy)] focus-visible:ring-ring group inline-flex h-[42px] w-full items-center justify-center gap-2 rounded-md px-6 text-sm font-semibold transition-[opacity,transform] duration-200 hover:-translate-y-0.5 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2 lg:w-auto"
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
