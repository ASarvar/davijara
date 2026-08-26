import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { getRegions } from "@/lib/data/catalog";
import {
  getSoldLots,
  parsePage,
  parseSoldQuery,
  SOLD_FROM_KEY,
  SOLD_TO_KEY,
} from "@/lib/data/listings";
import { formatDate, formatNumber } from "@/lib/format";
import { SoldLotCard } from "@/components/common/sold-lot-card";
import { Section } from "@/components/layout/section";
import { SoldFilter } from "@/components/sections/sold-filter";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "sold" });
  return { title: t("pageTitle"), description: t("metaDescription") };
}

/** Four rows of three at the widest grid, as on /obyektlar. */
const PER_PAGE = 12;

/**
 * "Ijaraga berilgan obyektlar" — the results the homepage strip is a window
 * onto.
 *
 * THE ROUTE IS STILL `/sotilgan-obyektlar` while the page is titled "Ijaraga
 * berilgan obyektlar", and that gap is deliberate. The wording was corrected
 * because state property is LEASED, not sold — the statistics copy already
 * said so ("davlat mulki ijaraga beriladi, sotilmaydi") while this page's
 * heading contradicted it. The URL was not, because it is the address the
 * homepage strip, the sitemap and any link already made to this page all use;
 * renaming it would break them for a string no reader has to type.
 *
 * Built to the same shape as /obyektlar, deliberately: a deep header block, the
 * filter band with its gold hairlines, then a deep results section. The first
 * version put the results on the `light` tone, which in the DARK theme is a
 * mist slab — a white page in the middle of a navy site, and nothing like the
 * catalogue it sits beside.
 *
 * THE WHOLE YEAR, not a rolling window. The hero counts the year's sales, so a
 * results page covering only the last six weeks of it disagreed with the figure
 * directly above it on the homepage.
 */
export default async function SoldObjectsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const sp = await searchParams;
  const t = await getTranslations("sold");
  const tCommon = await getTranslations("common");

  const query = parseSoldQuery(sp);
  const [lots, regions] = await Promise.all([getSoldLots(query), getRegions()]);

  const regionName = (slug: string) =>
    regions.find((r) => r.slug === slug)?.name ?? slug;

  const page = parsePage(sp);
  const pageCount = Math.max(1, Math.ceil(lots.length / PER_PAGE));
  // Clamped rather than 404'd: a hand-edited `?sahifa=99` should land on the
  // last page of real results, not on an error.
  const current = Math.min(page, pageCount);
  const shown = lots.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  /** A page link that keeps every active filter. */
  const pageHref = (n: number) => {
    const params = new URLSearchParams();
    if (query.region) params.set("hudud", query.region);
    if (query.district) params.set("tuman", query.district);
    if (query.from) params.set(SOLD_FROM_KEY, query.from);
    if (query.to) params.set(SOLD_TO_KEY, query.to);
    if (n > 1) params.set("sahifa", String(n));
    const qs = params.toString();
    return qs ? `/sotilgan-obyektlar?${qs}` : "/sotilgan-obyektlar";
  };

  const labels = {
    start: t("startPrice"),
    sold: t("soldPrice"),
    noRise: t("noRise"),
  };

  return (
    <>
      <Section tone="deep" className="pb-8">
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="text-muted-foreground flex items-center gap-2 text-sm">
            <li>
              <Link
                href="/"
                className="hover:text-accent-foreground transition-colors"
              >
                {tCommon("breadcrumbHome")}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-foreground">{t("pageTitle")}</li>
          </ol>
        </nav>

        <h1
          data-enter
          className="font-heading max-w-3xl text-3xl font-semibold text-balance sm:text-4xl lg:text-5xl"
        >
          {t("pageTitle")}
        </h1>
        <p
          data-enter
          style={{ "--enter-delay": 1 } as React.CSSProperties}
          className="text-muted-foreground mt-4 max-w-2xl text-pretty"
        >
          {/*
            The count first, because it is the answer to "how much of this is
            there". The range is only spelled out when the reader chose one —
            unfiltered, the page is simply the year, and saying so beats
            printing two dates they did not ask for.
          */}
          {lots.length === 0
            ? t("pageEmpty")
            : query.from || query.to
              ? t("pageLedeRange", {
                  count: formatNumber(lots.length),
                  from: formatDate(lots[lots.length - 1].auctionDate),
                  to: formatDate(lots[0].auctionDate),
                })
              : t("pageLede", { count: formatNumber(lots.length) })}
        </p>
      </Section>

      <SoldFilter values={sp} />

      <Section tone="deep">
        {shown.length > 0 ? (
          <>
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((lot) => (
                <SoldLotCard
                  key={lot.id}
                  lot={lot}
                  regionName={regionName(lot.region)}
                  labels={labels}
                  showDate
                />
              ))}
            </ul>

            {pageCount > 1 ? (
              <nav
                aria-label={t("pagination")}
                className="mt-10 flex flex-wrap items-center justify-center gap-2"
              >
                {/*
                  Real links, not buttons: each page of results is its own URL,
                  so it can be shared, bookmarked and reached by the back
                  button — the same rule the catalogue's pager follows.
                */}
                {Array.from({ length: pageCount }, (_, i) => i + 1)
                  // Only the neighbourhood of the current page, or a 250-page
                  // run would wrap to a dozen lines on a phone.
                  .filter(
                    (n) =>
                      n === 1 || n === pageCount || Math.abs(n - current) <= 2,
                  )
                  .map((n, i, list) => (
                    <span key={n} className="flex items-center gap-2">
                      {i > 0 && list[i - 1] !== n - 1 ? (
                        <span
                          aria-hidden="true"
                          className="text-muted-foreground"
                        >
                          …
                        </span>
                      ) : null}
                      <Link
                        href={pageHref(n)}
                        aria-current={n === current ? "page" : undefined}
                        className={
                          n === current
                            ? "border-outline bg-accent text-accent-foreground rounded-md border px-3 py-1.5 text-sm font-semibold tabular-nums"
                            : "border-hairline text-muted-foreground hover:text-accent-foreground hover:border-outline rounded-md border px-3 py-1.5 text-sm tabular-nums transition-colors"
                        }
                      >
                        {n}
                      </Link>
                    </span>
                  ))}
              </nav>
            ) : null}
          </>
        ) : (
          <p className="border-hairline text-muted-foreground rounded-lg border border-dashed px-6 py-12 text-center text-sm">
            {t("pageEmpty")}
          </p>
        )}
      </Section>
    </>
  );
}
