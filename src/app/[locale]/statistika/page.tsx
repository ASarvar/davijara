import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { getRegions } from "@/lib/data/catalog";
import { getStatistics, STATS_YEAR } from "@/lib/data/statistics";
import { formatArea, formatNumber, formatSom } from "@/lib/format";
import { ChartFigure } from "@/components/charts/chart-figure";
import { StaleNotice } from "@/components/common/stale-notice";
import { MonthlyChart, OutcomeDonut } from "@/components/charts/charts";
import {
  DistributionStrip,
  RegionScatter,
  RegisterArea,
} from "@/components/charts/shapes";
import { ScopeSelect } from "@/components/charts/scope-select";
import { LotImage } from "@/components/common/lot-image";
import { StatList } from "@/components/common/stat-list";
import { SurfaceCard } from "@/components/common/surface-card";
import { Section, SectionHeader } from "@/components/layout/section";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "stats" });
  return { title: t("title"), description: t("metaDescription") };
}

const MONTHS = [
  "Yanvar",
  "Fevral",
  "Mart",
  "Aprel",
  "May",
  "Iyun",
  "Iyul",
  "Avgust",
  "Sentyabr",
  "Oktyabr",
  "Noyabr",
  "Dekabr",
];

/** `×5,9` — the same shape the sold-lot card prints. */
const rise = (lot: { soldPrice: number; startPrice: number }) =>
  lot.startPrice > 0
    ? `${(lot.soldPrice / lot.startPrice).toFixed(1).replace(".", ",")}×`
    : "—";

/** `1,1×` / `10×` — a decimal only where there is one. */
const multiple = (at: number) =>
  `${Number.isInteger(at) ? String(at) : at.toFixed(1).replace(".", ",")}×`;

/** `69,7%`, with the Uzbek decimal comma. */
const share = (value: number, total: number) =>
  `${((value / Math.max(total, 1)) * 100).toFixed(1).replace(".", ",")}%`;

/**
 * /statistika — what the year's auctions actually did.
 *
 * SCOPED BY `?hudud=`, and by nothing else. The catalogue's filters ask "what
 * could I rent"; this page asks "what happened", and the only cut that changes
 * the answer without also destroying the sample is the region. A district
 * holds a few dozen sales in a year — every average on this page would be
 * noise, and an average of nine lots printed beside Toshkent's 354 invites a
 * comparison the data cannot carry.
 *
 * See lib/data/statistics.ts for why this is one year, why the headline
 * figures are arithmetic means, and why floor area alone is not.
 */
export default async function StatisticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const tCommon = await getTranslations("common");

  const sp = await searchParams;
  const t = await getTranslations("stats");

  const raw = Array.isArray(sp.hudud) ? sp.hudud[0] : sp.hudud;
  const regions = await getRegions();
  // Resolved against the table, so `?hudud=nonsense` shows the republic
  // rather than an empty page.
  const region = regions.find((r) => r.slug === raw);
  const stats = await getStatistics(region?.slug);

  if (!stats) {
    return (
      <Section tone="deep">
        <h1 className="font-heading text-3xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground mt-4">{t("unavailable")}</p>
      </Section>
    );
  }

  const scopeName = region ? region.name : t("republic");
  const published = stats.sold + stats.pending + stats.unsold;
  /* Regions with enough measured lots to carry a rate — see the 20-lot floor
     in statistics.ts — ordered by the rate itself. */
  const rated = stats.byRegion
    .filter((r) => r.perM2 !== null)
    .sort((a, b) => (b.perM2 ?? 0) - (a.perM2 ?? 0));

  /*
    The three figures that carry the rise section.

    Read off the bands rather than recomputed, so the cards and the chart
    beside them can never disagree: `oneStep` is the 1,0–1,5× band and
    `tenPlus` is the last one, both by position in the list that draws the
    chart.
  */
  const oneStep = stats.rise[1]?.count ?? 0;
  const tenPlus = stats.rise[stats.rise.length - 1]?.count ?? 0;
  const riseCallouts = [
    {
      label: t("avgRise"),
      value: `${stats.avgRise.toFixed(2).replace(".", ",")}×`,
      note: t("avgRiseNote"),
      icon: "Equal",
    },
    {
      label: t("oneStepShare"),
      value: share(oneStep, stats.sold),
      note: t("oneStepNote"),
      icon: "TrendingUp",
    },
    {
      label: t("tenPlusShare"),
      value: share(tenPlus, stats.sold),
      note: t("tenPlusNote"),
      icon: "Flame",
    },
  ];

  /*
    Four figures, and each one is a different KIND of fact: how many, how
    much, what a typical lot costs, and how reliably lots find a buyer. A row
    of four counts would say one thing four times.
  */
  const headline = [
    {
      value: formatNumber(stats.sold),
      label: t("soldLots"),
      icon: "Building2",
    },
    { value: formatSom(stats.total), label: t("totalValue"), icon: "Wallet" },
    {
      value: formatSom(stats.avgPrice),
      label: t("avgPrice"),
      icon: "Tag",
    },
    {
      value: `${(stats.sellRate * 100).toFixed(1).replace(".", ",")}%`,
      label: t("sellRate"),
      icon: "Gavel",
    },
  ];

  return (
    <>
      <Section tone="deep" className="pb-5">
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
            <li className="text-foreground">{t("title")}</li>
          </ol>
        </nav>

        <h1
          data-enter
          className="font-heading max-w-3xl text-xl font-semibold text-balance sm:text-2xl lg:text-3xl"
        >
          {t("title")}
        </h1>
        <p
          data-enter
          style={{ "--enter-delay": 1 } as React.CSSProperties}
          className="text-muted-foreground mt-4 max-w-2xl text-sm text-pretty"
        >
          {t("lede", { year: STATS_YEAR, scope: scopeName })}
        </p>

        {/*
          The listings service was unreachable and every figure below comes
          from its last real answer. Directly under the lede rather than at the
          foot of the page: it qualifies all thirty-odd numbers on this page,
          so it has to be read before them, not after.
        */}
        {stats.asOf ? <StaleNotice asOf={stats.asOf} className="mt-4" /> : null}

        {/*
          One select rather than fifteen chips. Two wrapped rows of
          regions pushed the four headline figures off the first screen,
          on a page whose first job is to state them. The control still
          navigates to a real URL — see ScopeSelect.
        */}
        <div className="mt-8">
          <ScopeSelect
            value={region?.slug}
            regions={regions.map((r) => ({ slug: r.slug, name: r.name }))}
            labels={{ republic: t("republic"), label: t("scopeLabel") }}
          />
        </div>

        {/*
          THE SAME COMPONENT THE HOMEPAGE HERO USES, not a second set of
          cards that merely resemble it.

          These four figures answer the same question the hero's four do,
          one page deeper, so they should be the same object: icon tile and
          label on one row, the figure centred beneath it in `--ornament`,
          on a bordered card surface. Rebuilding that by hand is how two
          rows of stats drift apart — which they already had, with the
          figure here in `--heading` and left-aligned.
        */}
        <StatList
          stats={headline}
          variant="card"
          className="mt-10 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        />

        {/*
          The total is annual RENT, not a sale price, and the difference is
          not pedantry — these lots are leased, not sold, and a reader who
          takes 117 mlrd for a disposal has been misinformed by us.
        */}
        {/* <p className="text-muted-foreground mt-6 max-w-2xl text-xs">
          {t("valueNote")}
        </p> */}
      </Section>

      <Section tone="light">
        <SectionHeader
          title={t("monthlyTitle")}
          // description={t("monthlyBody")}
        />
        <ChartFigure
          legend={[
            { label: t("soldLots"), color: "accent" },
            { label: t("avgPrice"), color: "muted", line: true },
          ]}
          columns={[t("month"), t("soldLots"), t("avgPrice")]}
          rows={stats.months.map((m) => [
            MONTHS[m.month - 1],
            formatNumber(m.sold),
            formatSom(m.avg),
          ])}
        >
          <MonthlyChart
            labels={stats.months.map((m) => MONTHS[m.month - 1])}
            counts={stats.months.map((m) => m.sold)}
            averages={stats.months.map((m) => m.avg)}
            countLabel={t("soldLots")}
            averageLabel={t("avgPrice")}
            /* Serialised: a Server Component cannot hand a client one a
               function, so the tooltip is told the unit rather than given
               `formatSom`. Millions, because every monthly average is in
               single-digit millions. */
            formatAverage={{ unit: "mln", divisor: 1_000_000, decimals: 1 }}
          />
        </ChartFigure>
      </Section>

      {/*
        Two views of the same 4 518 lots: what became of them, and how big
        they were. They belong beside each other — both answer "what was
        put up this year", where the rise and the region cuts answer "what
        happened at the auction".
      */}
      <Section tone="deep">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="mb-4 text-base font-semibold">
              {t("outcomeTitle")}
            </h2>
            <p className="text-muted-foreground mb-7 max-w-md text-sm text-pretty">
              {t("outcomeBody")}
            </p>
            {/*
              THE CENTRE IS THE TOTAL, not the sale rate — and that is a
              correction, not a preference. With 99,0% in the hole the legend
              beside it read "Sotilgan · 67,2%", because a slice is a share of
              every lot published while the rate is a share of the lots that
              CONCLUDED. Both numbers were right and together they looked like
              a contradiction. The rate has its own place in the headline row;
              here the ring is simply how the year's lots divide.
            */}
            <ChartFigure
              legend={[
                { label: t("sold"), color: "accent" },
                { label: t("pending"), color: "muted" },
                { label: t("noBuyer"), color: "faint" },
              ]}
              columns={[t("outcomeTitle"), t("lots"), t("share")]}
              rows={[
                [t("sold"), stats.sold],
                [t("pending"), stats.pending],
                [t("noBuyer"), stats.unsold],
              ].map(([label, n]) => [
                label as string,
                formatNumber(n as number),
                share(n as number, published),
              ])}
            >
              <OutcomeDonut
                labels={[t("sold"), t("pending"), t("noBuyer")]}
                values={[stats.sold, stats.pending, stats.unsold]}
                centre={formatNumber(published)}
                centreLabel={t("published")}
              />
            </ChartFigure>
          </div>

          <div>
            <h2 className="mb-4 text-base font-semibold">{t("sizeTitle")}</h2>
            <p className="text-muted-foreground mb-7 max-w-md text-sm text-pretty">
              {t("sizeBody", { typical: formatArea(stats.typicalArea) })}
            </p>
            {/*
              ONE bar, divided — not six.

              Six columns invite the reader to compare band against band.
              The statement worth making is about the whole: of everything
              let this year, this much was a single room and this much was
              a field. A strip says that as one object.
            */}
            <ChartFigure
              // caption={t("sizeNote")}
              legend={stats.area.map((b, i) => ({
                label: b.label,
                color: i === 0 ? "accent" : i < 3 ? "muted" : "faint",
              }))}
              columns={[t("sizeTitle"), t("lots"), t("share")]}
              rows={stats.area.map((b) => [
                b.label,
                formatNumber(b.count),
                share(b.count, stats.sold),
              ])}
            >
              <DistributionStrip
                segments={stats.area.map((b) => ({
                  label: b.label,
                  value: b.count,
                  tooltip: `${formatNumber(b.count)} ${t("lots")} · ${share(
                    b.count,
                    stats.sold,
                  )}`,
                }))}
              />
            </ChartFigure>
          </div>
        </div>
      </Section>

      {/*
        Hidden when a single region is in scope: a one-bar ranking chart is
        not a ranking, and the per-m² comparison is the point of this block.
      */}
      {stats.byRegion.length > 1 ? (
        <Section tone="light">
          <SectionHeader
            title={t("regionTitle")}
            description={t("regionBody")}
          />
          <ChartFigure
            // caption={t("scatterNote")}
            columns={[t("region"), t("soldLots"), t("perM2Short")]}
            rows={stats.byRegion.map((r) => [
              r.name,
              formatNumber(r.sold),
              r.perM2 === null
                ? "—"
                : `${formatNumber(Math.round(r.perM2))} so'm`,
            ])}
          >
            <RegionScatter
              labels={{ x: t("byCount"), y: t("byPerM2") }}
              points={rated.map((r) => ({
                name: r.name,
                sold: r.sold,
                perM2: Math.round(r.perM2 ?? 0),
                total: r.total,
                tooltip: `${formatNumber(r.sold)} ${t("lots")} · ${formatNumber(
                  Math.round(r.perM2 ?? 0),
                )} so'm/m² · ${formatSom(r.total)}`,
              }))}
            />
          </ChartFigure>
        </Section>
      ) : null}

      {/*
        The rise gets the full width, and three figures instead of a
        caption. It is the one distribution on this page with a real
        headline in it — nearly seven in ten lots move one step, and one in
        sixteen goes past ten times — and a chart alone makes the reader
        work that out from bar heights.

        The "Savdo taqvimi" block that used to sit here is gone. Which
        weekday holds the most auctions is a fact about the operator's
        calendar, not about the market, and it was taking a half-width
        chart to say "not at weekends".
      */}
      <Section tone="deep">
        <SectionHeader
          title={t("riseTitle")}
          description={t("riseBody", {
            average: stats.avgRise.toFixed(2).replace(".", ","),
          })}
        />

        {/*
          A ROW ABOVE THE CHART, not a column beside it.

          Side by side, the three cards had to be stretched to the plot's
          height to stop the section reading as two unrelated blocks — and
          stretching a card that holds three short lines just puts a void
          under the text. Three across, then the chart at full width, needs
          no stretching at all: each card is the height of its own content
          and the plot gets the width a decay curve actually wants.
        */}
        <StatList
          stats={riseCallouts}
          variant="card"
          className="grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-3"
        />

        <div className="mt-10">
          <ChartFigure
            caption={t("cumulativeNote")}
            columns={[t("atLeast"), t("lots"), t("share")]}
            rows={stats.cumulative.map((c) => [
              multiple(c.at),
              formatNumber(c.count),
              share(c.count, stats.sold),
            ])}
          >
            <RegisterArea
              labels={stats.cumulative.map((c) => multiple(c.at))}
              values={stats.cumulative.map((c) =>
                Number(((c.count / Math.max(stats.sold, 1)) * 100).toFixed(1)),
              )}
              formatted={stats.cumulative.map(
                (c) =>
                  `${formatNumber(c.count)} ${t("lots")} · ${share(c.count, stats.sold)}`,
              )}
              tickSuffix="%"
              rotateLabels={false}
              height={340}
            />
          </ChartFigure>
        </div>
      </Section>

      <Section tone="light">
        <SectionHeader
          title={t("recordsTitle")}
          description={t("recordsBody")}
        />
        {/*
          THESE ARE REAL BUILDINGS, so they get their photographs.

          The records were two lists of text — the same shape as the tables
          three sections above them, on the one block of the page that is
          about specific places rather than about aggregates. Every lot here
          carries an `orderId`, which is all `LotImage` needs, so the section
          can show what was actually let. That is the energy the block was
          missing; it was never going to come from a larger typeface.

          The leader in each column is a full card with its photograph and the
          figure over it; the two behind it are compact rows. A podium, not a
          list of three equals.
        */}
        {/*
          `items-start`, opting the two columns out of CSS Grid's default
          `align-items: stretch`.

          Without it, Grid stretches both column <div>s to the height of the
          TALLER one — "Eng ko'p oshganlari" runs longer titles than "Eng
          qimmat sotilganlari" most of the time, so its column is naturally
          taller. The lead card underneath carries `h-full` (real elsewhere,
          for the rank-2/3 pair to match each other), and once its own column
          div had a definite stretched height, that `h-full` inflated the
          card to fill it — a slab of blank space between the caption and the
          card's bottom edge, worst on the shorter column. `items-start` lets
          each column keep its own natural height instead.
        */}
        <div className="grid items-start gap-10 lg:grid-cols-2">
          <RecordColumn
            title={t("topByPrice")}
            lots={stats.topByPrice}
            figure={(l) => formatSom(l.soldPrice)}
            sub={(l) => `${rise(l)} · ${formatArea(l.area)}`}
            regionName={(slug) =>
              regions.find((r) => r.slug === slug)?.name ?? slug
            }
          />
          <RecordColumn
            title={t("topByRise")}
            lots={stats.topByRise}
            figure={rise}
            sub={(l) =>
              `${formatSom(l.startPrice)} → ${formatSom(l.soldPrice)}`
            }
            regionName={(slug) =>
              regions.find((r) => r.slug === slug)?.name ?? slug
            }
          />
        </div>
      </Section>
    </>
  );
}

type RecordLot = {
  id: string;
  title: string;
  region: string;
  district?: string;
  area: number;
  startPrice: number;
  soldPrice: number;
  orderId?: string;
  auctionUrl?: string;
};

function RecordColumn({
  title,
  lots,
  figure,
  sub,
  regionName,
}: {
  title: string;
  lots: RecordLot[];
  figure: (lot: RecordLot) => string;
  sub: (lot: RecordLot) => string;
  regionName: (slug: string) => string;
}) {
  const [lead, ...rest] = lots;
  if (!lead) return null;

  return (
    <div>
      <h3 className="text-muted-foreground mb-5 text-xs font-semibold tracking-[0.14em] uppercase">
        {title}
      </h3>

      {/*
        THE LEADER FULL WIDTH, THE OTHER TWO BESIDE EACH OTHER.

        The first version gave the leader a photograph and left the runners-up
        as text rows, which read as two different kinds of thing on a block
        that is about three of the same thing. Now every record is a
        photograph — a 16:9 for the leader, a squarer 4:3 for the pair — so
        the column is one composition with a clear first place instead of a
        card followed by a list.
      */}
      <RecordCard
        lot={lead}
        rank={1}
        figure={figure(lead)}
        sub={sub(lead)}
        regionName={regionName(lead.region)}
        lead
      />

      <div className="mt-4 grid items-stretch gap-4 sm:grid-cols-2">
        {rest.map((lot, i) => (
          <RecordCard
            key={lot.id}
            lot={lot}
            rank={i + 2}
            figure={figure(lot)}
            sub={sub(lot)}
            regionName={regionName(lot.region)}
          />
        ))}
      </div>
    </div>
  );
}

function RecordCard({
  lot,
  rank,
  figure,
  sub,
  regionName,
  lead = false,
}: {
  lot: RecordLot;
  rank: number;
  figure: string;
  sub: string;
  regionName: string;
  /** First place: wider crop, larger figure. */
  lead?: boolean;
}) {
  return (
    <SurfaceCard
      radius="md"
      padding="none"
      interactive
      data-reveal="up"
      style={{ "--i": rank - 1 } as React.CSSProperties}
      className="group h-full overflow-hidden"
    >
      <a
        href={lot.auctionUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-full flex-col"
      >
        <div
          className={`relative overflow-hidden ${lead ? "aspect-[16/9]" : "aspect-[4/3]"}`}
        >
          <LotImage
            orderId={lot.orderId}
            region={lot.region}
            zoom="fast"
            sizes={
              lead
                ? "(max-width: 1024px) 92vw, 560px"
                : "(max-width: 640px) 92vw, 280px"
            }
            className="h-full w-full"
          />
          {/*
            A scrim that only reaches a third of the way up, so the photograph
            is still a photograph and the figure still has something solid
            under it whatever landed behind.
          */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[color:var(--color-navy)]/92 via-[color:var(--color-navy)]/50 to-transparent"
          />
          <span
            className={`absolute top-3 left-3 flex items-center justify-center rounded-full bg-[color:var(--color-navy)]/85 font-semibold text-[color:var(--color-gold-light)] backdrop-blur-sm ${
              lead ? "size-8 text-sm" : "size-7 text-xs"
            }`}
          >
            {rank}
          </span>
          <div className="absolute inset-x-0 bottom-0 p-4">
            <p
              className={`font-heading font-semibold text-[color:var(--color-gold-light)] tabular-nums ${
                lead ? "text-3xl" : "text-xl"
              }`}
            >
              {figure}
            </p>
            <p className="mt-0.5 text-xs text-white/85">{sub}</p>
          </div>
        </div>

        {/*
          EVERY TEXT LINE HAS A RESERVED BOX, and that is what makes the six
          cards the same height.

          Without it each card grew to its own content: a two-line title in
          one column and a three-line one in the other, "Toshkent shahri" on
          one row and "Qoraqalpog'iston Respublikasi" wrapping to two on
          another. The two columns then ended at different points and the
          pairs inside them were uneven — visible in the layout as four
          different card heights.

           caps the tall case and  holds the short one, so
          the box is the same either way. The numbers are the line height at
          this size multiplied out: 2 x 1,25rem for the lead title, 3 x for
          the others, 2 x 1rem for the place.
        */}
        <div className="flex flex-1 flex-col p-4">
          <p
            className={`group-hover:text-accent-foreground text-sm font-semibold transition-colors ${
              lead
                ? "line-clamp-2 min-h-[2.5rem]"
                : "line-clamp-3 min-h-[3.75rem]"
            }`}
          >
            {lot.title}
          </p>
          <p className="text-muted-foreground mt-1 line-clamp-2 min-h-[2rem] text-xs">
            {lot.district ? `${lot.district} · ` : ""}
            {regionName}
          </p>
        </div>
      </a>
    </SurfaceCard>
  );
}
