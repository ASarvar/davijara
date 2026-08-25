import { getTranslations } from "next-intl/server";

import { getHeroStats, getRegions } from "@/lib/data/catalog";
import { parseListingQuery } from "@/lib/data/listings";
import { StatList } from "@/components/common/stat-list";
import { Container } from "@/components/layout/section";

/**
 * The masthead, and the four figures under it.
 *
 * THE FIGURES FOLLOW THE SEARCH PANEL. Picking a region or a tuman below and
 * pressing Qidirish puts `?hudud=` / `?tuman=` in the URL, and all four cards
 * recount for it. The hero reads the same `searchParams` the map and the
 * catalogue do, so there is one filter state for the whole page rather than a
 * second mechanism up here.
 *
 * The one case that cannot narrow is a district the contracts register does
 * not list under a name we can match (see rent-contracts.ts). Cards 2 and 3
 * then show the REGION's figures, and the row gains a line saying so — a
 * regional total sitting unlabelled under a district's name would read as the
 * district's own.
 */
export async function Hero({
  searchParams = {},
  /**
   * Rendered inside the hero's own section, under the stat cards.
   *
   * This is where the homepage puts `<SearchWidget nested>`. A prop rather
   * than an import, so the PAGE still decides what the masthead contains and
   * in what order — the hero does not reach out and compose the search panel
   * on its own — while the panel still lands inside this section's background
   * and gradient instead of starting a new band below it.
   */
  children,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
  children?: React.ReactNode;
} = {}) {
  const t = await getTranslations("hero");
  const { region, district } = parseListingQuery(searchParams);
  const [{ stats, contractsWidened }, regions] = await Promise.all([
    getHeroStats(region, district),
    region ? getRegions() : Promise.resolve([]),
  ]);
  const regionName = region
    ? (regions.find((r) => r.slug === region)?.name ?? null)
    : null;

  return (
    <section
      data-tone="deep"
      className="bg-background relative isolate overflow-hidden"
    >
      {/* Decorative layers — ported verbatim from legacy .hero-bg /
          .hero-accent / .hero-pattern (styles.css:268-311). Purely
          presentational, hidden from the a11y tree. */}
      {/*
        `data-parallax` drifts these gradient layers against the scroll. This
        is the one place scroll-LINKED motion is right — the whole effect is
        that it tracks the scroll — which is why the provider uses `scrub`
        here and a triggered animation everywhere else.

        Applied to the decorative layer only, never to the headline: text that
        moves at a different rate than the page is harder to read, and this
        block is already `aria-hidden`.

        `-mt-[10%] h-[120%]` gives the layer room to travel without exposing
        the section background at either end of its range.
      */}
      <div
        aria-hidden="true"
        data-parallax="0.12"
        className="pointer-events-none absolute inset-x-0 -top-[10%] -z-10 h-[120%]"
      >
        {/*
          Colours come from tokens, not literals, so the same markup serves
          both themes — the alphas that read as a glow on navy read as a stain
          on white. See --hero-* in globals.css.
        */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 60% 30%, var(--hero-wash) 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 20% 80%, var(--hero-gold) 0%, transparent 60%)",
          }}
        />
        <div
          className="absolute top-0 right-0 h-full w-[45%]"
          style={{
            background:
              "radial-gradient(ellipse 80% 80% at 80% 40%, var(--hero-wash-soft) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            opacity: "var(--hero-grid-opacity)",
            backgroundImage:
              "repeating-linear-gradient(60deg, var(--hero-grid-line) 0, var(--hero-grid-line) 1px, transparent 0, transparent 50%), repeating-linear-gradient(120deg, var(--hero-grid-line) 0, var(--hero-grid-line) 1px, transparent 0, transparent 50%), repeating-linear-gradient(0deg, var(--hero-grid-line) 0, var(--hero-grid-line) 1px, transparent 0, transparent 50%)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Shorter than the 20/28 this ran at: the headline block that used to
          fill the top of the hero is gone (see the h1 below), so the same
          padding would have left a tall empty band above the stat cards. */}
      <Container className="py-10 sm:py-14">
        {/*
          THE VISIBLE HEADLINE AND EYEBROW WERE REMOVED at the operator's
          request — the banner strip above now carries the masthead message,
          and two competing statements stacked on one screen read as a
          duplicate.

          The <h1> ITSELF STAYS, as `sr-only`. A page with no h1 is not a
          styling choice: it is what a screen reader announces as the
          document's subject, what a search engine indexes as the page title,
          and what "skip to content" lands a keyboard reader on. Deleting the
          element rather than hiding it would have cost all three to remove
          something no sighted visitor sees either way.

          The word rotator went with the visible text. It was an animation of
          three synonyms and has no meaning to read aloud, so the sr-only
          heading states the page's subject plainly instead.
        */}
        <h1 className="sr-only">
          {t("titleLead")} {t("rotator.third")}
        </h1>

        <div data-enter style={{ "--enter-delay": 2 } as React.CSSProperties}>
          <StatList
            stats={stats}
            reveal={false}
            variant="card"
            /* Two columns from sm and four from lg — three no longer divides
               the row now that there is a fourth card, and 2x2 on a tablet
               beats 3+1 with a widow. */
            className="grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          />

          {/*
            Only when the register could not resolve the district — which is
            the only state in which the row can be misread. Everywhere else all
            four cards describe the same place and the line would be noise.
          */}
          {contractsWidened && district ? (
            <p className="text-muted-foreground mt-4 text-xs">
              {t.rich("statScope", {
                district,
                region: regionName ?? "",
                strong: (chunks) => (
                  <span className="text-foreground font-semibold">
                    {chunks}
                  </span>
                ),
              })}
            </p>
          ) : null}
        </div>

        {children}
      </Container>
    </section>
  );
}
