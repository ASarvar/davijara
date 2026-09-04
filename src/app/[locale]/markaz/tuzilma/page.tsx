import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Breadcrumbs } from "@/components/common/breadcrumbs";
import type { Locale } from "@/i18n/routing";
import { getOrgStructure } from "@/lib/data/structure";
import { OrgChart } from "@/components/sections/org-chart";
import { Section } from "@/components/layout/section";

/*
  Tashkiliy tuzilma — the central apparatus structure.

  Built from "Markaz direktorining 2026-yil «14»-iyuldagi 27-I/ch-son
  buyrug'iga 1-ilova". Names and staff figures are verbatim and live in
  src/content/structure.ts; that file also records how the reporting lines
  were read out of the source PDF's vector paths rather than guessed from the
  positions of the boxes.

  DRAWN, NOT SUMMARISED. The page is the chart and its own name — no citation
  pill, no notes, no derived figures underneath it. The operator asked for
  those out, and the reasoning for keeping them (the citation, in particular)
  is preserved in this file's git history rather than repeated here.
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

  const [tNav] = await Promise.all([
    getTranslations("nav"),
  ]);
  const structure = await getOrgStructure();

  return (
    <>
      <Section tone="deep" className="pb-6">
        <Breadcrumbs items={[{ label: tNav("centre"), href: "/markaz" }, { label: tNav(NAV_KEY) }]} />

        {/*
          Centred, unlike its siblings on the other five pages — the operator
          asked for it on this one specifically, so `mx-auto text-center` is
          set here rather than folded into the shared size the six pages
          otherwise share.
        */}
        <h1
          data-split
          className="font-heading mx-auto max-w-3xl text-center text-xl font-semibold text-balance sm:text-2xl lg:text-3xl"
        >
          {tNav(NAV_KEY)}
        </h1>

        {/*
          The organisation's name as the ORDER writes it, not as `site.ts`
          writes it — the two differ by one word ("samarali"), and the
          document's own wording is what belongs under a chart taken from it.
          See the note in content/structure.ts.
        */}
        <p
          data-reveal="fade"
          className="text-muted-foreground mx-auto mt-4 max-w-2xl text-center text-sm text-pretty"
        >
          {structure.order.organisation}
        </p>
      </Section>

      <Section tone="deep">
        <OrgChart structure={structure} />
      </Section>
    </>
  );
}
