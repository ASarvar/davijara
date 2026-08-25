"use client";

import { useCallback } from "react";
import type { Chart, ChartConfiguration } from "chart.js/auto";

import {
  accentGradient,
  alpha,
  ChartCanvas,
  crosshair,
  type ChartPalette,
} from "@/components/charts/chart-canvas";

/*
  The four chart types this site draws, as thin configuration over
  `ChartCanvas`. Everything shared — palette, motion, the theme observer, the
  accessible table — lives one level up; these files only decide shape.

  ── THE HOUSE STYLE ────────────────────────────────────────────────────────
  · No chart junk. No axis lines, no tick marks, no box: a faint dashed
    horizontal grid and nothing else. The vertical grid is off entirely
    because time already reads left to right.
  · Rounded ends on every bar, and bars sit ON the baseline with no border.
  · Areas are a gradient of the accent fading to nothing, never a flat fill —
    a solid block hides the grid and makes the line look like a wall.
  · One accent per chart. A second colour is reserved for the one case where
    two series genuinely differ in kind (count vs price), and there it is the
    body ink and dashed, so it cannot be mistaken for a second measure of the
    same thing.
  · Tooltips follow the reader with a crosshair, and are drawn in the card
    colour with the section's hairline — the same surface a card uses.

  ── STAGGER ────────────────────────────────────────────────────────────────
  Bars grow in sequence rather than together, which is the one Flourish
  principle worth borrowing: a staged reveal gives the eye time to read the
  shape instead of presenting it all at once. `delay` is per data index and
  runs only on the first draw — on a theme repaint the chart appears at once,
  because the reader is already looking at it.
*/

const EASING = "easeOutQuart" as const;

/**
 * Duration, easing and a per-element delay, as one `animation` block.
 *
 * The delay is scriptable and Chart.js calls it once per drawn element, so
 * `dataIndex` staggers the bars along the axis. Guarded on `mode`: only the
 * FIRST draw staggers. A repaint after a theme flip runs in `resize`/`none`
 * mode, and re-playing an eight-step entrance while the reader is looking
 * straight at the chart reads as a glitch rather than as motion.
 *
 * The step shrinks as the series grows and is capped at 60ms, so eight
 * months feel deliberate and fourteen regions still finish inside a second.
 */
const animation = (count: number, duration: number) => {
  const step = duration === 0 ? 0 : Math.min(110, 1000 / Math.max(count, 1));
  return {
    duration,
    easing: EASING,
    delay: (ctx: { type: string; mode?: string; dataIndex: number }) =>
      ctx.type === "data" && ctx.mode === "default" ? ctx.dataIndex * step : 0,
  } as const;
};

function baseScales(palette: ChartPalette, opts: { maxTicks?: number } = {}) {
  return {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: {
        color: palette.muted,
        font: { size: 12, family: "inherit" },
        maxRotation: 0,
        autoSkipPadding: 12,
      },
    },
    y: {
      beginAtZero: true,
      grid: { color: palette.hairline },
      border: { display: false, dash: [4, 4] },
      ticks: {
        color: palette.muted,
        font: { size: 11, family: "inherit" },
        maxTicksLimit: opts.maxTicks ?? 5,
        padding: 8,
      },
    },
  };
}

function tooltip(palette: ChartPalette) {
  return {
    backgroundColor: palette.card,
    titleColor: palette.heading,
    bodyColor: palette.foreground,
    borderColor: palette.hairline,
    borderWidth: 1,
    padding: 12,
    cornerRadius: 10,
    displayColors: false,
    titleFont: { size: 12, weight: 600 as const, family: "inherit" },
    bodyFont: { size: 13, family: "inherit" },
    caretSize: 0,
    caretPadding: 12,
  };
}

/* ── Months: bars for the count, a dashed line for the median ──────────── */

export function MonthlyChart({
  labels,
  counts,
  averages,
  averageLabel,
  countLabel,
  formatAverage,
}: {
  labels: string[];
  counts: number[];
  averages: number[];
  countLabel: string;
  averageLabel: string;
  /** Serialised so the client component takes no function prop. */
  formatAverage: { unit: string; divisor: number; decimals: number };
}) {
  const build = useCallback(
    (palette: ChartPalette, duration: number): ChartConfiguration => ({
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            type: "bar" as const,
            label: countLabel,
            data: counts,
            /*
              A gradient down the bar, but a SHALLOW one.

              The first version ramped 0,95 → 0,45 alpha, which looks rich on
              navy and washes out completely on the mist tone — the bar ends
              up paler than the accent it is supposed to be, and stops
              matching the legend swatch beside it, which is solid. Fading a
              fill toward transparency only works when the surface behind it
              is dark. 1 → 0,72 reads as depth on both.
            */
            backgroundColor: (ctx: { chart: Chart }) =>
              accentGradient(
                ctx.chart.ctx,
                ctx.chart.chartArea,
                palette.accent,
                1,
                0.72,
              ),
            hoverBackgroundColor: palette.accent,
            borderRadius: 8,
            borderSkipped: false,
            maxBarThickness: 46,
            order: 2,
            yAxisID: "y",
          },
          {
            type: "line" as const,
            label: averageLabel,
            data: averages,
            borderColor: palette.foreground,
            borderDash: [6, 5],
            borderWidth: 2,
            pointBackgroundColor: palette.foreground,
            pointBorderColor: palette.card,
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.35,
            fill: false,
            order: 1,
            yAxisID: "yMedian",
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        animation: animation(counts.length, duration),
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            ...tooltip(palette),
            callbacks: {
              label: (item) => {
                const v = item.parsed.y ?? 0;
                if (item.datasetIndex === 0) return `${countLabel}: ${v}`;
                const scaled = v / formatAverage.divisor;
                return `${averageLabel}: ${scaled
                  .toFixed(formatAverage.decimals)
                  .replace(".", ",")} ${formatAverage.unit}`;
              },
            },
          },
        },
        scales: {
          ...baseScales(palette),
          /*
            The median rides a SECOND, hidden axis. Lot counts run to the
            hundreds and prices to the millions, so on one axis the price line
            would be flat against the floor. The axis is hidden because two
            visible scales on one chart is a reliable way to have the reader
            attribute the wrong one to the wrong series — the tooltip names
            the figure instead.
          */
          yMedian: {
            display: false,
            beginAtZero: true,
            // Headroom so the line never collides with the tallest bar.
            suggestedMax: Math.max(...averages, 1) * 1.45,
          },
        },
        crosshairColor: alpha(palette.muted, 0.45),
      } as ChartConfiguration["options"],
      plugins: [crosshair],
    }),
    [labels, counts, averages, countLabel, averageLabel, formatAverage],
  );

  return <ChartCanvas build={build} height={320} ariaLabel={countLabel} />;
}

/* ── Horizontal bars: regions, weekdays, any ranking ───────────────────── */

export function RankedBarChart({
  labels,
  values,
  formatted,
  height,
  highlightTop = true,
}: {
  labels: string[];
  values: number[];
  /**
   * What the tooltip prints, one per bar, already formatted by the server.
   *
   * NOT `toLocaleString`. `lib/format.ts` groups thousands by hand precisely
   * because several runtimes get `uz-UZ` wrong and because Intl output can
   * differ between Node and the browser. A tooltip that formatted its own
   * numbers would disagree with the table three lines below it — same figure,
   * different separator — so the strings are built once, on the server, and
   * both surfaces print the same ones.
   */
  formatted: string[];
  height: number;
  highlightTop?: boolean;
}) {
  const build = useCallback(
    (palette: ChartPalette, duration: number): ChartConfiguration => {
      const max = Math.max(...values);
      return {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "",
              data: values,
              /*
                One bar is the accent and the rest are muted, so the chart has
                a subject rather than fourteen equal claims on the eye. Rank
                is already carried by length; colour carries "this is the one".
              */
              backgroundColor: values.map((v) =>
                highlightTop && v === max
                  ? palette.accent
                  : alpha(palette.muted, 0.5),
              ),
              hoverBackgroundColor: values.map(() => palette.accent),
              borderRadius: 6,
              borderSkipped: false,
              barThickness: 14,
            },
          ],
        },
        options: {
          indexAxis: "y",
          maintainAspectRatio: false,
          animation: animation(values.length, duration),
          interaction: { mode: "index", intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              ...tooltip(palette),
              callbacks: {
                label: (item) => formatted[item.dataIndex] ?? "",
              },
            },
          },
          scales: {
            x: {
              beginAtZero: true,
              /*
                No gridlines here. On a ranked chart the value axis carries no
                tick labels — the figures are in the table — so a grid would
                be a set of unlabelled vertical rules crossing every bar, and
                a reader cannot read a value off a line that has no number on
                it. Length does the comparing.
              */
              grid: { display: false },
              border: { display: false },
              ticks: { display: false },
            },
            y: {
              grid: { display: false },
              border: { display: false },
              ticks: {
                color: palette.foreground,
                font: { size: 12, family: "inherit" },
                padding: 4,
              },
            },
          },
        },
      };
    },
    [labels, values, formatted, highlightTop],
  );

  return (
    <ChartCanvas build={build} height={height} ariaLabel={labels[0] ?? ""} />
  );
}

/* ── Doughnut: the outcome partition ───────────────────────────────────── */

export function OutcomeDonut({
  labels,
  values,
  centre,
  centreLabel,
}: {
  labels: string[];
  values: number[];
  centre: string;
  centreLabel: string;
}) {
  const build = useCallback(
    (palette: ChartPalette, duration: number): ChartConfiguration => {
      /*
        Typed as a doughnut and widened once on return.

        `ChartConfiguration` with no type argument is the union across every
        chart kind, and options that belong to one controller — `cutout`,
        `animateRotate` — are not on it. Naming the kind here keeps them
        checked properly instead of scattering casts over each line.
      */
      const config: ChartConfiguration<"doughnut"> = {
        type: "doughnut",
        data: {
          labels,
          datasets: [
            {
              data: values,
              backgroundColor: [
                palette.accent,
                alpha(palette.muted, 0.55),
                alpha(palette.muted, 0.25),
              ],
              borderColor: palette.card,
              borderWidth: 3,
              hoverOffset: 10,
              // A hairline gap between slices, so the ring reads as parts.
              spacing: 2,
            },
          ],
        },
        options: {
          maintainAspectRatio: false,
          // A ring, not a pie: the hole is where the total goes.
          cutout: "68%",
          /*
            Sweeps clockwise from twelve o'clock as it draws rather than
            fading in place, which is what makes a ring read as a total being
            filled in.
          */
          animation: {
            duration,
            easing: EASING,
            animateRotate: true,
            animateScale: false,
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              ...tooltip(palette),
              callbacks: {
                label: (item) => {
                  const total = values.reduce((a, b) => a + b, 0) || 1;
                  const value = item.parsed;
                  const pct = ((value / total) * 100)
                    .toFixed(1)
                    .replace(".", ",");
                  return `${value
                    .toLocaleString("ru-RU")
                    .replace(/\u00a0/g, " ")} (${pct}%)`;
                },
              },
            },
          },
        },
        plugins: [
          {
            /*
              The centre label, drawn rather than positioned: a DOM element in
              the hole would need the ring's exact pixel centre, which moves
              with the container. Painting it in `afterDraw` puts it where the
              chart actually is, at any size.
            */
            id: "centreText",
            afterDraw(chart) {
              const { ctx, chartArea } = chart;
              const x = (chartArea.left + chartArea.right) / 2;
              const y = (chartArea.top + chartArea.bottom) / 2;
              const family = getComputedStyle(chart.canvas).fontFamily;
              ctx.save();
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillStyle = palette.heading;
              ctx.font = `600 26px ${family}`;
              ctx.fillText(centre, x, y - 6);
              ctx.fillStyle = palette.muted;
              ctx.font = `400 11px ${family}`;
              ctx.fillText(centreLabel, x, y + 16);
              ctx.restore();
            },
          },
        ],
      };
      return config as ChartConfiguration;
    },
    [labels, values, centre, centreLabel],
  );

  return <ChartCanvas build={build} height={240} ariaLabel={centreLabel} />;
}
