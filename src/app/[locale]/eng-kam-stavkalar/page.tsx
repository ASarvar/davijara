import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Download, FileWarning } from "lucide-react";

import { Breadcrumbs } from "@/components/common/breadcrumbs";
import type { Locale } from "@/i18n/routing";
import { Section } from "@/components/layout/section";
import { IconTile } from "@/components/common/icon-tile";
import { Button } from "@/components/ui/button";
import { getMinRates } from "@/lib/data/min-rates";
import { withBasePath } from "@/lib/base-path";

/*
  Eng kam stavkalar — one downloadable PDF per region: the document
  approving that region's minimum lease rate for use of state property.

  Content: src/content/min-rates.json (path only) + lib/data/territorial.ts
  for the 14 region names, so this list and the territorial-offices list can
  never disagree on how a region is spelled. The PDFs themselves are static,
  under public/eng-kam-stavkalar/ — supplied whole by the operator
  (2026-08-27), one file per region, nothing extracted or retyped from them.

  DELIBERATELY NOT the bare HTML <table> the predecessor site used for this
  same page (localhost:3008/stavka) — the operator asked for a modern, clean
  design instead. Reused shape: the numbered-tile divided list from
  markaz/korrupsiyaga-qarshi/page.tsx (itself borrowed from PrivilegeList) —
  a plain register is exactly what 14 rows of "region → one file" are, and
  it is a shape this site already has a considered version of, rather than a
  fourth new list style invented for one page.

  The page's own subtitle is the predecessor page's exact heading text
  ("Davlat mulkidan foydalanganlik uchun ijara toʻlovining eng kam
  stavkalarini tasdiqlash toʻgʻrisida maʼlumotlar") — kept verbatim rather
  than paraphrased, same rule as any other government document title on this
  site.

  It lives in `minRates.pageLede` so a translator can reach it, but ru.json
  and en.json deliberately DO NOT define it: this is the title of a Vazirlar
  Mahkamasi decision, and the Russian wording has to be the official one, not
  a rendering invented here (CLAUDE.md non-negotiable 6). Until someone
  supplies it, the deep-merge in i18n/request.ts falls back to this Uzbek —
  which is exactly what the page showed before.
*/

const NAV_KEY = "minRates";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const tNav = await getTranslations({ locale, namespace: "nav" });
  return { title: tNav(NAV_KEY) };
}

export default async function MinRatesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const [tNav, tCommon, t, regions] = await Promise.all([
    getTranslations("nav"),
    getTranslations("common"),
    getTranslations("minRates"),
    getMinRates(),
  ]);

  return (
    <Section tone="deep">
      <Breadcrumbs items={[{ label: tNav(NAV_KEY) }]} />

      <div className="mx-auto">
        <h1
          data-split
          className="font-heading text-center text-2xl font-semibold text-balance sm:text-3xl lg:text-4xl"
        >
          {tNav(NAV_KEY)}
        </h1>
        <p className="text-muted-foreground mt-3 text-center text-sm text-pretty">
          {t("pageLede")}
        </p>

        {regions.length === 0 ? (
          <p className="border-hairline text-muted-foreground mt-8 rounded-lg border border-dashed px-4 py-6 text-center text-sm text-pretty">
            <FileWarning
              aria-hidden="true"
              className="mx-auto mb-2 size-5 opacity-70"
            />
            {t("empty")}
          </p>
        ) : (
          <ul
            data-reveal="up"
            className="border-hairline divide-hairline mt-10 divide-y overflow-hidden rounded-md border"
          >
            {regions.map((region, index) => (
              <li
                key={region.regionId}
                className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:gap-4 sm:px-5"
              >
                <IconTile
                  size="sm"
                  aria-hidden="true"
                  className="font-heading shrink-0 text-sm font-semibold"
                >
                  {String(index + 1).padStart(2, "0")}
                </IconTile>
                <span className="min-w-0 flex-1 text-sm font-medium text-balance sm:text-base">
                  {region.region}
                </span>
                <Button asChild variant="outline" size="sm">
                  <a
                    // Plain HTML anchor to a public/ file — Next's basePath
                    // rewriting only covers its own <Link>/asset URLs, not a
                    // literal href like this one. See lib/base-path.ts.
                    href={withBasePath(region.pdf)}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                  >
                    <Download aria-hidden="true" />
                    {tCommon("download")}
                  </a>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}
