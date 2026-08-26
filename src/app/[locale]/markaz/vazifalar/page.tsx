import type { Metadata } from "next";
import { FileText } from "lucide-react";
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

  THE SPINE: a numbered list for the seven duties (short, parallel sentences —
  a numbered badge per item is enough structure), then a lettered register for
  the functions, which are long enough and numerous enough (34 items across
  seven groups) to need a table of contents. The sidebar is `lg:sticky` so a
  reader can jump to "b) …" from a) without scrolling back up — the same shape
  the news article page uses for "Boshqa yangiliklar", for the same reason: a
  long page needs a way THROUGH it, not just a way down it.
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

        <p
          data-reveal="fade"
          className="border-hairline text-muted-foreground mt-5 inline-flex items-start gap-2 rounded-full border px-4 py-2 text-sm"
        >
          <FileText aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            {t("approvedBy")}: {order.reference} — {order.statuteTitle}
          </span>
        </p>
      </Section>

      {/* ── Vazifalari ───────────────────────────────────────────────── */}
      <Section tone="deep">
        <h2 className="mb-1 text-lg font-semibold sm:text-xl">
          {duties.heading}
        </h2>
        <p
          data-reveal="fade"
          className="text-muted-foreground mb-8 max-w-3xl text-pretty"
        >
          {duties.intro}
        </p>

        <ol className="grid gap-4 sm:grid-cols-2">
          {duties.items.map((item, i) => (
            <li
              key={i}
              data-reveal="up"
              className="bg-card border-border flex gap-3 rounded-lg border p-4 [box-shadow:var(--shadow-1)]"
            >
              <span className="bg-accent text-accent-foreground font-heading flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums">
                {i + 1}
              </span>
              <span className="text-sm text-pretty">{item}</span>
            </li>
          ))}
        </ol>
      </Section>

      {/* ── Funksiyalari ─────────────────────────────────────────────── */}
      <Section tone="deep" surface="raised">
        <h2 className="mb-1 text-lg font-semibold sm:text-xl">
          {functions.heading}
        </h2>
        <p
          data-reveal="fade"
          className="text-muted-foreground mb-8 max-w-3xl text-pretty"
        >
          {functions.intro}
        </p>

        <div className="grid gap-10 lg:grid-cols-[14rem_1fr] lg:gap-12">
          {/*
            Desktop-only table of contents. Below `lg` the groups are close
            enough together (seven headings, not seventy) that a reader can
            just scroll — a sidebar squeezed above narrow-column content would
            cost more space than the jump-links save.
          */}
          <nav
            aria-label={t("contents")}
            className="hidden lg:sticky lg:top-28 lg:block lg:self-start"
          >
            <ol className="border-outline space-y-3 border-l-2 pl-4">
              {functions.groups.map((group) => (
                <li key={group.letter}>
                  <a
                    href={`#funksiya-${group.letter}`}
                    className="text-muted-foreground hover:text-accent-foreground block text-sm text-pretty transition-colors"
                  >
                    <span className="text-accent-foreground font-semibold">
                      {group.letter})
                    </span>{" "}
                    {group.heading}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <ol className="space-y-6">
            {functions.groups.map((group) => (
              <li
                key={group.letter}
                id={`funksiya-${group.letter}`}
                data-reveal="up"
                className="bg-card border-border scroll-mt-28 rounded-xl border p-5 [box-shadow:var(--shadow-1)] sm:p-6"
              >
                <h3 className="mb-4 flex items-baseline gap-2.5 font-semibold text-pretty">
                  <span className="border-outline text-accent-foreground font-heading inline-flex size-7 shrink-0 items-center justify-center rounded-full border text-sm">
                    {group.letter}
                  </span>
                  <span>{group.heading}</span>
                </h3>

                <ul className="border-hairline space-y-3 border-t pt-4">
                  {group.items.map((item, i) => (
                    <li
                      key={i}
                      className="text-muted-foreground flex gap-2.5 text-sm text-pretty"
                    >
                      <span
                        aria-hidden="true"
                        className="text-accent-foreground mt-1 block size-1 shrink-0 rounded-full bg-current"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      </Section>
    </>
  );
}
