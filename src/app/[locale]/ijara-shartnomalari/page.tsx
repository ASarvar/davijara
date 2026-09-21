import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Breadcrumbs } from "@/components/common/breadcrumbs";
import {
  LeasedObjectsTable,
  type LeasedObjectsLabels,
} from "@/components/common/leased-objects-table";
import { Pager } from "@/components/common/pager";
import { StatPanel } from "@/components/common/stat-panel";
import { Section } from "@/components/layout/section";
import { LeaseFilter } from "@/components/sections/lease-filter";
import type { Locale } from "@/i18n/routing";
import { formatLeasedArea, getRegions } from "@/lib/data/catalog";
import {
  getLeasedObjects,
  leaseYear,
  parseLeaseQuery,
  withNames,
} from "@/lib/data/lease-contracts";
import { parsePage } from "@/lib/data/listings";
import { formatNumber } from "@/lib/format";

/*
  "Ijara shartnomalari" — every lease contract signed this year, by object.

  Reached from the hero's "Tuzilgan ijara shartnomalari" figure: that card is
  the register's total, and this page is the register itself, so the two
  always count the same contracts (lib/data/lease-contracts.ts).

  AN OBJECT IS A CADASTRE NUMBER. The register lists contracts; a building
  leased to five tenants appears five times. Grouping by the number turns
  that into one row with "5" beside it, which is the question a citizen is
  asking — what is leased, where, and how much of it. The contracts
  themselves are not listed, at the operator's request.

  NAMES ARE FETCHED FOR ONE PAGE AT A TIME. The register has no building
  names; the cadastre has them, one request per number. So the page groups
  and filters everything, cuts out the twenty rows it will show, and only
  then asks the cadastre about those — see lib/data/cadastre.ts for the cache
  that makes a second visit free.

  Rendered per request: the search is in the URL, and the rows behind it are
  held in memory for an hour, so the cost of that is the grouping, not the
  register.
*/

const PER_PAGE = 20;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "leaseContracts" });
  return { title: t("pageTitle"), description: t("metaDescription") };
}

export default async function LeaseContractsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const sp = await searchParams;
  const query = parseLeaseQuery(sp);

  const [t, result, regions] = await Promise.all([
    getTranslations("leaseContracts"),
    getLeasedObjects(query),
    getRegions(),
  ]);

  const regionName = (slug: string) =>
    regions.find((r) => r.slug === slug)?.name ?? slug;

  const pageCount = Math.max(1, Math.ceil(result.objects.length / PER_PAGE));
  const current = Math.min(parsePage(sp), pageCount);
  const shown = await withNames(
    result.objects.slice((current - 1) * PER_PAGE, current * PER_PAGE),
  );

  const pageHref = (n: number) => {
    const params = new URLSearchParams();
    if (query.q) params.set("q", query.q);
    if (query.region) params.set("hudud", query.region);
    if (query.district) params.set("tuman", query.district);
    if (n > 1) params.set("sahifa", String(n));
    const qs = params.toString();
    return qs ? `/ijara-shartnomalari?${qs}` : "/ijara-shartnomalari";
  };

  const labels: LeasedObjectsLabels = {
    colObject: t("colObject"),
    colAddress: t("address"),
    colContracts: t("colContracts"),
    colArea: t("colArea"),
    noCadastre: t("noCadastre"),
  };

  /*
    Derived from the rows on screen's own query, never typed: with no filter
    the contract count is the hero's figure for the same year.
  */
  const stats = [
    {
      label: t("statContracts"),
      value: formatNumber(result.contracts),
      icon: "FileText",
    },
    {
      label: t("statObjects"),
      value: formatNumber(result.objects.length),
      icon: "Building2",
    },
    {
      label: t("statArea"),
      ...formatLeasedArea(result.areaM2),
      icon: "LandPlot",
    },
  ];

  const nothingAtAll = result.objects.length === 0 && result.missingRegions > 0;

  return (
    <>
      <Section tone="deep" className="pb-4">
        <Breadcrumbs items={[{ label: t("pageTitle") }]} />

        <h1
          data-enter
          className="font-heading max-w-3xl text-xl font-semibold text-balance sm:text-2xl lg:text-3xl"
        >
          {t("pageTitle")}
        </h1>
        <p
          data-enter
          style={{ "--enter-delay": 1 } as React.CSSProperties}
          className="text-muted-foreground mt-4 max-w-2xl text-sm text-pretty"
        >
          {t("pageLede", { year: leaseYear() })}
        </p>

        {nothingAtAll ? null : (
          <StatPanel stats={stats} className="mt-8 lg:grid-cols-3" />
        )}

      </Section>

      <LeaseFilter query={query} />

      <Section tone="deep">
        {result.missingRegions > 0 && !nothingAtAll ? (
          <p className="text-muted-foreground mb-6 text-sm">
            {t("partial", { count: result.missingRegions })}
          </p>
        ) : null}

        {shown.length > 0 ? (
          <>
            {query.q || query.region ? (
              <p role="status" className="text-muted-foreground mb-4 text-sm">
                {t("found", {
                  objects: formatNumber(result.objects.length),
                  contracts: formatNumber(result.contracts),
                })}
              </p>
            ) : null}

            <LeasedObjectsTable
              objects={shown}
              regionName={regionName}
              labels={labels}
            />

            <Pager
              current={current}
              pageCount={pageCount}
              href={pageHref}
              label={t("pagination")}
            />
          </>
        ) : (
          <p className="border-hairline text-muted-foreground rounded-lg border border-dashed px-6 py-12 text-center text-sm">
            {nothingAtAll ? t("unavailable") : t("empty")}
          </p>
        )}
      </Section>
    </>
  );
}
