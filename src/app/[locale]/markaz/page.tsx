import type { Metadata } from "next";
import { FileText, Landmark } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { getAbout } from "@/lib/data/about";
import { formatDate } from "@/lib/format";
import { SurfaceCard } from "@/components/common/surface-card";
import { Section } from "@/components/layout/section";

/*
  Markaz haqida — establishment and official naming.

  Built from the operator's own supply, transliterated from Cyrillic to this
  site's Latin Uzbek — see src/content/about.ts for the full account of what
  was and was not converted (the Russian and English official names stay in
  their own languages, quoted rather than rendered).

  THE SPINE: one citation (the founding decree) above a three-card row — one
  card per language the Centre is officially named in. A grid of exactly
  three is the shape the source itself has; nothing here invents a fourth.
*/

const NAV_KEY = "about";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const [tNav, t] = await Promise.all([
    getTranslations({ locale, namespace: "nav" }),
    getTranslations({ locale, namespace: "about" }),
  ]);
  return { title: tNav(NAV_KEY), description: t("metaDescription") };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const [t, tNav, tCommon] = await Promise.all([
    getTranslations("about"),
    getTranslations("nav"),
    getTranslations("common"),
  ]);
  const { establishmentOrder, establishment, officialNaming } =
    await getAbout();

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

        <h1
          data-split
          className="font-heading max-w-3xl text-2xl font-semibold text-balance sm:text-3xl lg:text-4xl"
        >
          {tNav(NAV_KEY)}
        </h1>
      </Section>

      {/* ── Tashkil etilishi ─────────────────────────────────────────── */}
      <Section tone="deep">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.6fr] lg:gap-12">
          <div data-reveal="left">
            <span className="bg-accent text-accent-foreground mb-4 flex size-11 items-center justify-center rounded-lg">
              <Landmark aria-hidden="true" className="size-5" />
            </span>
            <h2 className="text-lg font-semibold sm:text-xl">
              {establishment.heading}
            </h2>
            {/*
              The founding decree, cited the same way the tuzilma page cites
              its order — a small pill, not a paragraph, so it reads as a
              reference rather than as more prose to get through.
            */}
            <p className="border-hairline text-muted-foreground mt-4 inline-flex items-start gap-2 rounded-full border px-4 py-2 text-sm">
              <FileText aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span>
                {t("establishedBy")}: {establishmentOrder.reference}
                <time dateTime={establishmentOrder.date} className="sr-only">
                  {" "}
                  {formatDate(establishmentOrder.date)}
                </time>
              </span>
            </p>
          </div>

          <p
            data-reveal="fade"
            className="text-muted-foreground max-w-3xl text-pretty"
          >
            {establishment.body}
          </p>
        </div>
      </Section>

      {/* ── Nomi va joylashgan joyi ──────────────────────────────────── */}
      <Section tone="deep" surface="raised">
        <h2 className="mb-1 text-lg font-semibold sm:text-xl">
          {officialNaming.heading}
        </h2>
        <p className="text-muted-foreground mb-8 text-sm">
          {officialNaming.intro}
        </p>

        <ul className="grid gap-5 lg:grid-cols-3">
          {officialNaming.names.map((name) => (
            <SurfaceCard
              as="li"
              key={name.language}
              radius="lg"
              data-reveal="up"
              className="flex flex-col"
            >
              <span className="text-accent-foreground mb-4 text-xs font-semibold tracking-[0.14em] uppercase">
                {name.language}
              </span>

              <div className="mb-4">
                <p className="text-muted-foreground mb-1 text-xs">
                  {t("fullName")}
                </p>
                {/*
                  `lang` set per card: the Russian and English names are not
                  Uzbek text and must not be picked up by the page's own
                  language, or a screen reader in Uzbek voice reads Russian
                  words with Uzbek phonetics.
                */}
                <p
                  lang={
                    name.language === "Rus tilida"
                      ? "ru"
                      : name.language === "Ingliz tilida"
                        ? "en"
                        : undefined
                  }
                  className="text-sm font-medium text-pretty"
                >
                  {name.full}
                </p>
              </div>

              <div className="mt-auto">
                <p className="text-muted-foreground mb-1 text-xs">
                  {t("shortName")}
                </p>
                <p
                  lang={
                    name.language === "Rus tilida"
                      ? "ru"
                      : name.language === "Ingliz tilida"
                        ? "en"
                        : undefined
                  }
                  className="text-sm font-medium text-pretty"
                >
                  {name.short}
                </p>
              </div>
            </SurfaceCard>
          ))}
        </ul>
      </Section>
    </>
  );
}
