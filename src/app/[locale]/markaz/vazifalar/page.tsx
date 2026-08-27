import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { getDuties } from "@/lib/data/duties";
import { Section } from "@/components/layout/section";

/*
  Vazifa va funksiyalar — the Centre's duties and functions.

  Built from the operator's own supply, transliterated from Cyrillic to this
  site's Latin Uzbek — see src/content/duties.ts for the full account,
  including why the function groups are lettered a/b/v/g/d/e/j rather than
  a/b/c/d/e/f/g (the source statute's own letters, not a Latin re-sequencing).

  PLAIN TEXT, per the operator's explicit request: the numbered-card grid and
  the sticky table-of-contents sidebar are gone. What is left is a single
  reading column — a numbered list for the seven duties, then a heading per
  lettered group followed by its own bulleted list, read top to bottom like
  the statute itself.
*/

const NAV_KEY = "duties";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const [tNav, t] = await Promise.all([
    getTranslations({ locale, namespace: "nav" }),
    getTranslations({ locale, namespace: "duties" }),
  ]);
  return { title: tNav(NAV_KEY), description: t("metaDescription") };
}

export default async function DutiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const [t, tNav, tCommon] = await Promise.all([
    getTranslations("duties"),
    getTranslations("nav"),
    getTranslations("common"),
  ]);
  const { order, duties, functions } = await getDuties();

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

      <div className="mx-auto max-w-3xl">
        {/*
          Title and its citation centered as a masthead block; everything
          below stays left-aligned — see the identical note in markaz/page.tsx
          for why (and for what the outer `mx-auto` actually fixes).
        */}
        <div className="text-center">
          <h1
            data-split
            className="font-heading text-2xl font-semibold text-balance sm:text-3xl lg:text-4xl"
          >
            {tNav(NAV_KEY)}
          </h1>

          <p data-reveal="fade" className="text-muted-foreground mt-6 text-sm">
            {t("approvedBy")}: {order.reference} — {order.statuteTitle}
          </p>
        </div>

        {/* ── Vazifalari ───────────────────────────────────────────────── */}
        <h2 className="mt-10 text-lg font-semibold sm:text-xl">
          {duties.heading}
        </h2>
        <p
          data-reveal="fade"
          className="text-muted-foreground mt-2 text-pretty"
        >
          {duties.intro}
        </p>

        <ol className="text-foreground/90 marker:text-muted-foreground mt-5 list-decimal space-y-3 pl-5 text-pretty">
          {duties.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>

        {/* ── Funksiyalari ─────────────────────────────────────────────── */}
        <h2 className="mt-12 text-lg font-semibold sm:text-xl">
          {functions.heading}
        </h2>
        <p
          data-reveal="fade"
          className="text-muted-foreground mt-2 text-pretty"
        >
          {functions.intro}
        </p>

        <div className="mt-6 space-y-8">
          {functions.groups.map((group) => (
            <div key={group.letter}>
              <h3 className="text-foreground font-semibold text-pretty">
                <span className="text-accent-foreground">{group.letter})</span>{" "}
                {group.heading}
              </h3>
              <ul className="text-muted-foreground marker:text-muted-foreground mt-3 list-disc space-y-2 pl-5 text-pretty">
                {group.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
