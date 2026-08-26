import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { getOrgStructure } from "@/lib/data/structure";
import { formatDate } from "@/lib/format";
import { OrgChart } from "@/components/sections/org-chart";
import { Section } from "@/components/layout/section";

/*
  Tashkiliy tuzilma — the central apparatus structure.

  Built from "Markaz direktorining 2026-yil «14»-iyuldagi 27-I/ch-son
  buyrug'iga 1-ilova". Names, staff figures and the three notes are verbatim
  and live in src/content/structure.ts; that file also records how the
  reporting lines were read out of the source PDF's vector paths rather than
  guessed from the positions of the boxes.

  THE ORDER IS CITED ON THE PAGE, not just in a comment. A structure chart on
  a state portal is a claim about who is responsible for what, and a reader
  has to be able to check it against the document that established it.

  THREE FIGURES OPEN THE PAGE, and all three are counted from the chart rather
  than typed in — see the labelling note on `unitStaffTotal` in the data layer
  for why the staff figure is captioned the way it is.
*/

const NAV_KEY = "structure";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const [tNav, t] = await Promise.all([
    getTranslations({ locale, namespace: "nav" }),
    getTranslations({ locale, namespace: "structure" }),
  ]);
  return { title: tNav(NAV_KEY), description: t("metaDescription") };
}

export default async function StructurePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const [t, tNav, tCommon] = await Promise.all([
    getTranslations("structure"),
    getTranslations("nav"),
    getTranslations("common"),
  ]);
  const structure = await getOrgStructure();

  const figures = [
    { value: structure.unitCount, label: t("statUnits") },
    { value: structure.unitStaffTotal, label: t("statStaff") },
    { value: structure.leadershipCount, label: t("statLeadership") },
  ];

  return (
    <>
      <Section tone="deep" className="pb-6">
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
            <li>
              <Link
                href="/markaz"
                className="hover:text-accent-foreground transition-colors"
              >
                {tNav("centre")}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-foreground">{tNav(NAV_KEY)}</li>
          </ol>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-end lg:gap-12">
          <div>
            <h1
              data-split
              className="font-heading text-3xl font-semibold text-balance sm:text-4xl lg:text-5xl"
            >
              {tNav(NAV_KEY)}
            </h1>

            {/*
              The organisation's name as the ORDER writes it, not as `site.ts`
              writes it — the two differ by one word ("samarali"), and the
              document's own wording is what belongs under a chart taken from
              it. See the note in content/structure.ts.
            */}
            <p
              data-reveal="fade"
              className="text-muted-foreground mt-4 max-w-2xl text-pretty"
            >
              {structure.order.organisation}
            </p>

            <p
              data-reveal="fade"
              className="border-hairline text-muted-foreground mt-5 inline-flex items-start gap-2 rounded-full border px-4 py-2 text-sm"
            >
              <FileText aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span>
                {structure.order.reference}
                {/* Machine-readable alongside the order's own wording, which
                    spells the date out in Uzbek. */}
                <time dateTime={structure.order.date} className="sr-only">
                  {formatDate(structure.order.date)}
                </time>
              </span>
            </p>
          </div>

          {/*
            The three figures the chart can be counted from. `dt` before `dd`
            in the DOM, order-swapped visually, so a screen reader hears the
            label before the number it belongs to.
          */}
          <dl
            data-reveal="up"
            className="bg-card border-border divide-border grid divide-y rounded-2xl border [box-shadow:var(--shadow-1)]"
          >
            {figures.map((figure) => (
              <div
                key={figure.label}
                className="flex items-baseline justify-between gap-4 px-5 py-4"
              >
                <dt className="text-muted-foreground text-sm">
                  {figure.label}
                </dt>
                <dd className="font-heading text-accent-foreground text-2xl font-semibold tabular-nums">
                  {figure.value}
                </dd>
              </div>
            ))}
            <p className="text-muted-foreground px-5 py-3 text-xs text-pretty">
              {t("statCaption")}
            </p>
          </dl>
        </div>
      </Section>

      <Section tone="deep">
        <OrgChart structure={structure} />
      </Section>

      <Section tone="deep" surface="raised">
        <h2 className="mb-4 text-base font-semibold">{t("notesLabel")}</h2>
        {/*
          The three notes printed under the source chart, verbatim and in the
          order they appear. They are part of the document, not commentary on
          it: the first one is what makes every figure above provisional.
        */}
        <ol className="grid gap-4 sm:grid-cols-3">
          {structure.notes.map((note, i) => (
            <li
              key={i}
              data-reveal="up"
              className="border-hairline flex gap-3 border-t pt-4 text-pretty"
            >
              <span
                aria-hidden="true"
                className="font-heading text-accent-foreground text-sm font-semibold tabular-nums"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-muted-foreground text-sm">{note}</span>
            </li>
          ))}
        </ol>
      </Section>
    </>
  );
}
