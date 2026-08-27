import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  Calculator,
  Car,
  ClipboardList,
  CreditCard,
  Download,
  Globe,
  Plane,
  Scale,
  ShoppingCart,
  Users,
} from "lucide-react";

import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { Section } from "@/components/layout/section";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  getAvailablePeriods,
  getLatestPeriod,
  getOpenDataForPeriod,
} from "@/lib/data/open-data";

/*
  Ochiq maʼlumotlar — one quarter's worth of the Centre's nine budget-
  transparency disclosures at a time, picked with a `?davr=YYYY-Q` select.

  FOURTH pass at this page's shape (2026-08-28). Earlier versions: a flat
  numbered accordion (2026 Q2 only) → nine cards each showing the latest
  quarter plus an expandable per-card archive. The operator rejected both
  the stat-row header and the expandable archive and asked instead for a
  single period selector up top and one plain row per category — see the
  reference layout the operator supplied directly (not the predecessor
  site this time). FILTER STATE LIVES IN THE URL, the same rule every other
  filter on this site follows (CLAUDE.md §3): `?davr=2026-2` is linkable,
  back-button-correct, and needs no client JS beyond the SelectField itself.

  Categories don't all start the same quarter — lib/data/open-data.ts's
  `getOpenDataForPeriod` simply omits a category that published nothing for
  the chosen period, so an early period (2023 Q1) legitimately shows fewer
  than nine rows.
*/

const NAV_KEY = "openData";

export const revalidate = 300;

/** categoryId -> the icon that leads its row. Direct lucide imports — no registry entry needed here. */
const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "smeta-ijrosi": Calculator,
  "veb-sayt-3299": Globe,
  balans: Scale,
  qarzdorlik: CreditCard,
  "tarmoq-shtat": Users,
  "davlat-xaridlari": ShoppingCart,
  "xizmat-safari": Plane,
  "xaridlar-rejasi": ClipboardList,
  "xizmat-avtotransport": Car,
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const tNav = await getTranslations({ locale, namespace: "nav" });
  return { title: tNav(NAV_KEY) };
}

export default async function OpenDataPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ davr?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const [tNav, tCommon, sp, periods, defaultPeriod] = await Promise.all([
    getTranslations("nav"),
    getTranslations("common"),
    searchParams,
    getAvailablePeriods(),
    getLatestPeriod(),
  ]);

  const requested = periods.find((p) => p.value === sp.davr);
  const selected = requested ?? defaultPeriod;
  const entries = selected
    ? await getOpenDataForPeriod(selected.year, selected.quarter)
    : [];

  return (
    <Section tone="deep">
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
          <li>
            <Link
              href="/"
              className="hover:text-accent-foreground transition-colors"
            >
              {tCommon("breadcrumbHome")}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground">{tNav(NAV_KEY)}</li>
        </ol>
      </nav>

      <div className="mx-auto">
        <h1
          data-split
          className="font-heading text-center text-2xl font-semibold text-balance sm:text-3xl lg:text-4xl"
        >
          {tNav(NAV_KEY)}
        </h1>
        <p className="text-muted-foreground mt-3 text-center text-sm text-pretty">
          Byudjet toʻgʻrisidagi qonunchilik hujjatlariga muvofiq ochiq
          maʼlumotlar — maʼlumotlar har chorakda yangilanib boradi.
        </p>

        {periods.length > 0 ? (
          <form method="get" className="mt-8 flex justify-end gap-2">
            <Select name="davr" defaultValue={selected?.value}>
              <SelectTrigger
                id="davr"
                aria-label="Davr"
                className="border-input bg-card text-foreground hover:border-ring/50 w-44 rounded-sm px-3 text-sm"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {periods.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" variant="outline">
              Tanlash
            </Button>
          </form>
        ) : null}

        {entries.length === 0 ? (
          <p className="border-hairline text-muted-foreground mt-8 rounded-md border border-dashed px-4 py-6 text-center text-sm text-pretty">
            {periods.length === 0
              ? "Ochiq maʼlumotlar hozircha kiritilmagan."
              : "Bu davr uchun hujjat topilmadi."}
          </p>
        ) : (
          <div className="mt-8 space-y-3">
            {entries.map((entry) => {
              const Icon = CATEGORY_ICONS[entry.categoryId];
              return (
                <div
                  key={entry.categoryId}
                  className="bg-secondary/50 flex flex-wrap items-center gap-4 rounded-xs p-3 sm:flex-nowrap sm:p-4"
                >
                  <div className="bg-card border-hairline flex size-14 shrink-0 items-center justify-center rounded-md border sm:size-16">
                    {Icon ? (
                      <Icon
                        aria-hidden="true"
                        className="text-muted-foreground size-6"
                      />
                    ) : null}
                  </div>
                  <p className="min-w-0 flex-1 basis-full text-sm font-medium text-pretty sm:basis-0 sm:text-base">
                    {entry.heading}
                  </p>
                  <div className="flex shrink-0 flex-wrap justify-end gap-2">
                    {entry.files.map((file, i) => (
                      <Button key={i} asChild variant="outline" size="sm">
                        <a
                          href={file.path}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                        >
                          <Download aria-hidden="true" />
                          {entry.files.length > 1 ? `${i + 1}-fayl` : "1-fayl"}
                        </a>
                      </Button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Section>
  );
}
