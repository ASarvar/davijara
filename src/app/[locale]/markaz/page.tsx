import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { getAbout } from "@/lib/data/about";
import { formatDate } from "@/lib/format";
import { Section } from "@/components/layout/section";

/*
  Markaz haqida — establishment and official naming.

  Built from the operator's own supply, transliterated from Cyrillic to this
  site's Latin Uzbek — see src/content/about.ts for the full account of what
  was and was not converted (the Russian and English official names stay in
  their own languages, quoted rather than rendered).

  PLAIN TEXT, per the operator's explicit request — no icon tiles, no card
  grid. The shape is the same one the news article page uses for its body:
  a heading, a citation line, paragraphs, and (for the three official names)
  a stacked, divided list rather than a row of boxed cards.
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

      <div className="max-w-3xl">
        <h1
          data-split
          className="font-heading text-2xl font-semibold text-balance sm:text-3xl lg:text-4xl"
        >
          {tNav(NAV_KEY)}
        </h1>

        {/* ── Tashkil etilishi ───────────────────────────────────────── */}
        <p data-reveal="fade" className="text-muted-foreground mt-6 text-sm">
          {t("establishedBy")}: {establishmentOrder.reference}{" "}
          <time dateTime={establishmentOrder.date}>
            ({formatDate(establishmentOrder.date)})
          </time>
        </p>

        <p data-reveal="fade" className="text-foreground/90 mt-4 text-pretty">
          {establishment.body}
        </p>

        {/* ── Nomi va joylashgan joyi ───────────────────────────────── */}
        <h2 className="mt-10 text-lg font-semibold sm:text-xl">
          {officialNaming.heading}
        </h2>
        <p className="text-muted-foreground mt-2 text-sm">
          {officialNaming.intro}
        </p>

        <dl className="border-hairline divide-hairline mt-6 divide-y border-t">
          {officialNaming.names.map((name) => (
            <div key={name.language} data-reveal="fade" className="py-5">
              <dt className="text-accent-foreground text-xs font-semibold tracking-[0.14em] uppercase">
                {name.language}
              </dt>
              {/*
                `lang` set per entry: the Russian and English names are not
                Uzbek text and must not be picked up by the page's own
                language, or a screen reader in Uzbek voice reads Russian
                words with Uzbek phonetics.
              */}
              <dd
                lang={
                  name.language === "Rus tilida"
                    ? "ru"
                    : name.language === "Ingliz tilida"
                      ? "en"
                      : undefined
                }
                className="text-foreground mt-2 text-pretty"
              >
                {name.full}
              </dd>
              <dd
                lang={
                  name.language === "Rus tilida"
                    ? "ru"
                    : name.language === "Ingliz tilida"
                      ? "en"
                      : undefined
                }
                className="text-muted-foreground mt-1 text-sm text-pretty"
              >
                {t("shortName")}: {name.short}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </Section>
  );
}
