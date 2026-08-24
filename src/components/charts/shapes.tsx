"use client";

import { useCallback } from "react";
import type { Chart, ChartConfiguration } from "chart.js/auto";

import {
  accentGradient,
  alpha,
  ChartCanvas,
  type ChartPalette,
} from "@/components/charts/chart-canvas";

/*
  Three shapes that are not bar charts, each chosen because the QUESTION is
  not "which is biggest".

  A ranked bar list answers one question well and every page of them looks the
  same. These three each carry something a bar row cannot:

    RegionScatter   two rankings that disagree, shown disagreeing
    DistributionStrip  a whole, divided — not six separate heights
    WeekPolar       a cycle, drawn as a cycle
*/

const EASING = "easeOutQuart" as const;

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
    caretPadding: 10,
  };
}

/* ── Regions: volume against price ─────────────────────────────────────── */

/**
 * Every region as one point: how MANY lots it sold against what a square
 * metre costs there.
 *
 * This replaced two ranked bar lists side by side, and the reason is the
 * section's own sentence — "two different questions, and the answers are not
 * the same". Two lists state that and make the reader hold both orders in
 * their head to check it. One plot shows it: Namangan sells the most lots and
 * sits near the floor on price; Toshkent shahri is the opposite corner. The
 * disagreement IS the shape.
 *
 * Bubble size is the region's total annual rent, so the third figure rides
 * along without a third chart.
 */
export function RegionScatter({
  points,
  labels,
}: {
  points: {
    name: string;
    sold: number;
    perM2: number;
    total: number;
    tooltip: string;
  }[];
  labels: { x: string; y: string };
}) {
  const build = useCallback(
    (palette: ChartPalette, duration: number): ChartConfiguration => {
      const maxTotal = Math.max(...points.map((p) => p.total), 1);
      const maxPerM2 = Math.max(...points.map((p) => p.perM2), 1);
      const config: ChartConfiguration<"bubble"> = {
        type: "bubble",
        data: {
          datasets: [
            {
              label: labels.y,
              data: points.map((p) => ({
                x: p.sold,
                y: p.perM2,
                /*
                  Area, not radius, carries the value — a circle whose RADIUS
                  is proportional to a figure exaggerates it by the square, so
                  a region with twice the rent looks four times the size.
                */
                r: 7 + Math.sqrt(p.total / maxTotal) * 20,
              })),
              backgroundColor: points.map((p) =>
                alpha(palette.accent, 0.25 + (p.perM2 / maxPerM2) * 0.45),
              ),
              borderColor: palette.accent,
              borderWidth: 1.5,
              hoverBackgroundColor: palette.accent,
            },
          ],
        },
        options: {
          maintainAspectRatio: false,
          animation: { duration, easing: EASING },
          plugins: {
            legend: { display: false },
            tooltip: {
              ...tooltip(palette),
              callbacks: {
                title: (items) => points[items[0].dataIndex]?.name ?? "",
                label: (item) => points[item.dataIndex]?.tooltip ?? "",
              },
            },
          },
          scales: {
            x: {
              title: {
                display: true,
                text: labels.x,
                color: palette.muted,
                font: { size: 11, family: "inherit" },
              },
              beginAtZero: true,
              grid: { color: palette.hairline },
              border: { display: false },
              ticks: {
                color: palette.muted,
                font: { size: 11, family: "inherit" },
                maxTicksLimit: 6,
              },
            },
            y: {
              title: {
                display: true,
                text: labels.y,
                color: palette.muted,
                font: { size: 11, family: "inherit" },
              },
              beginAtZero: true,
              grid: { color: palette.hairline },
              border: { display: false },
              ticks: {
                color: palette.muted,
                font: { size: 11, family: "inherit" },
                maxTicksLimit: 5,
                /* Thousands, so the axis is not a column of seven-digit
                   numbers competing with the bubbles. */
                callback: (v) => `${Math.round(Number(v) / 1000)}k`,
              },
            },
          },
        },
        plugins: [
          {
            /*
              Names beside the bubbles. A scatter of fourteen unlabelled
              circles is a puzzle, and a legend of fourteen swatches is worse
              — the reader would map colour to name fourteen times.

              Only the ones with room: a label is skipped when it would land
              on one already drawn. Every region is still in the table and in
              the tooltip, so nothing is lost, and the plot stays readable at
              any width.
            */
            id: "bubbleLabels",
            afterDatasetsDraw(chart) {
              const { ctx } = chart;
              const meta = chart.getDatasetMeta(0);
              const placed: { x: number; y: number }[] = [];
              ctx.save();
              ctx.font = `500 11px ${getComputedStyle(chart.canvas).fontFamily}`;
              ctx.fillStyle = palette.foreground;
              ctx.textBaseline = "middle";
              meta.data.forEach((el, i) => {
                const x = el.x + (el.options as { radius: number }).radius + 6;
                const y = el.y;
                if (
                  placed.some(
                    (p) => Math.abs(p.y - y) < 13 && Math.abs(p.x - x) < 90,
                  )
                ) {
                  return;
                }
                const name = points[i]?.name ?? "";
                if (x + ctx.measureText(name).width > chart.chartArea.right) {
                  ctx.textAlign = "right";
                  ctx.fillText(
                    name,
                    el.x - (el.options as { radius: number }).radius - 6,
                    y,
                  );
                } else {
                  ctx.textAlign = "left";
                  ctx.fillText(name, x, y);
                }
                placed.push({ x, y });
              });
              ctx.restore();
            },
          },
        ],
      };
      return config as ChartConfiguration;
    },
    [points, labels],
  );

  return <ChartCanvas build={build} height={420} ariaLabel={labels.y} />;
}

/* ── A whole, divided ──────────────────────────────────────────────────── */

/**
 * One bar, segmented — the size bands as parts of the year rather than six
 * separate heights.
 *
 * A column chart of six bands invites the reader to compare band to band. The
 * real statement is about the WHOLE: of everything let this year, this much
 * was a single room and this much was a field. A stacked strip says that in
 * one object, and the segments animate out from the left in order, which is
 * also the order of the bands.
 */
export function DistributionStrip({
  segments,
  height = 150,
}: {
  segments: { label: string; value: number; tooltip: string }[];
  height?: number;
}) {
  const build = useCallback(
    (palette: ChartPalette, duration: number): ChartConfiguration => ({
      type: "bar",
      data: {
        labels: [""],
        datasets: segments.map((s, i) => ({
          label: s.label,
          data: [s.value],
          /*
            A ramp from the accent to the muted ink across the bands, so the
            strip reads left to right as an ordered scale rather than as a set
            of unrelated categories. The first band — the most common one —
            is the full accent.
          */
          backgroundColor: alpha(
            palette.accent,
            0.9 - (i / Math.max(segments.length - 1, 1)) * 0.62,
          ),
          hoverBackgroundColor: palette.accent,
          borderColor: palette.card,
          borderWidth: 1,
          borderRadius: 4,
          borderSkipped: false,
          barThickness: 44,
        })),
      },
      options: {
        indexAxis: "y",
        maintainAspectRatio: false,
        animation: {
          duration,
          easing: EASING,
          delay: (ctx: {
            type: string;
            mode?: string;
            datasetIndex: number;
          }) =>
            ctx.type === "data" && ctx.mode === "default"
              ? ctx.datasetIndex * 90
              : 0,
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            ...tooltip(palette),
            callbacks: {
              title: (items) => segments[items[0].datasetIndex]?.label ?? "",
              label: (item) => segments[item.datasetIndex]?.tooltip ?? "",
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            display: false,
            grid: { display: false },
          },
          y: { stacked: true, display: false, grid: { display: false } },
        },
      },
    }),
    [segments],
  );

  return (
    <ChartCanvas
      build={build}
      height={height}
      ariaLabel={segments[0]?.label ?? ""}
    />
  );
}

/* ── A week, drawn as a cycle ──────────────────────────────────────────── */

/**
 * The auction week as a polar area — seven wedges, radius by lot count.
 *
 * A column chart of weekdays is seven bars with two at zero. A ring makes the
 * week a week: the two empty wedges are a gap you can see the shape of, and
 * the busy end of the working week reads as a lean rather than as a taller
 * rectangle.
 */
export function WeekPolar({
  labels,
  values,
  formatted,
}: {
  labels: string[];
  values: number[];
  formatted: string[];
}) {
  const build = useCallback(
    (palette: ChartPalette, duration: number): ChartConfiguration => {
      const max = Math.max(...values);
      const config: ChartConfiguration<"polarArea"> = {
        type: "polarArea",
        data: {
          labels,
          datasets: [
            {
              data: values,
              backgroundColor: values.map((v) =>
                alpha(palette.accent, v === max ? 0.85 : 0.2 + (v / max) * 0.4),
              ),
              borderColor: palette.card,
              borderWidth: 2,
              hoverBackgroundColor: palette.accent,
            },
          ],
        },
        options: {
          maintainAspectRatio: false,
          animation: { duration, easing: EASING, animateRotate: true },
          plugins: {
            legend: { display: false },
            tooltip: {
              ...tooltip(palette),
              callbacks: {
                title: (items) => labels[items[0].dataIndex] ?? "",
                label: (item) => formatted[item.dataIndex] ?? "",
              },
            },
          },
          scales: {
            r: {
              beginAtZero: true,
              grid: { color: palette.hairline },
              angleLines: { color: palette.hairline },
              /* The radial number axis is dropped: a wedge's area already
                 says "more", and the figures are in the table below. */
              ticks: { display: false, backdropColor: "transparent" },
              pointLabels: {
                display: true,
                centerPointLabels: true,
                color: palette.muted,
                font: { size: 11, family: "inherit" },
              },
            },
          },
        },
      };
      return config as ChartConfiguration;
    },
    [labels, values, formatted],
  );

  return <ChartCanvas build={build} height={300} ariaLabel={labels[0] ?? ""} />;
}

/* ── Register: contracts by region ─────────────────────────────────────── */

/**
 * The register's own figures, as an area under a line.
 *
 * The section used to be two plain numbers in two boxes. The register also
 * returns a row per region, so the same request already carries the shape of
 * where those contracts are — and a filled area gives the section something
 * to look at without claiming a trend the data does not have (this is one
 * year; the ordering is by size, not by time).
 */
export function RegisterArea({
  labels,
  values,
  formatted,
  tickSuffix = "",
  rotateLabels = true,
  height = 280,
}: {
  labels: string[];
  values: number[];
  formatted: string[];
  /** Appended to each y tick, e.g. "%". */
  tickSuffix?: string;
  /** Off for short labels that fit horizontally. */
  rotateLabels?: boolean;
  height?: number;
}) {
  const build = useCallback(
    (palette: ChartPalette, duration: number): ChartConfiguration => ({
      type: "line",
      data: {
        labels,
        datasets: [
          {
            data: values,
            borderColor: palette.accent,
            borderWidth: 2.5,
            fill: true,
            backgroundColor: (ctx: { chart: Chart }) =>
              accentGradient(
                ctx.chart.ctx,
                ctx.chart.chartArea,
                palette.accent,
                0.42,
                0.02,
              ),
            pointBackgroundColor: palette.card,
            pointBorderColor: palette.accent,
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 7,
            /*
              MONOTONE, not a plain tension.

              Both series drawn with this component only ever fall — the
              cumulative rise curve by definition, the register profile
              because it is sorted by size. A standard cubic spline overshoots
              between control points, and it did: between 1,5x and 2x the
              curve dipped and came back up, drawing more lots above 2x than
              above 1,5x. That is not a smoothing artefact anyone should have
              to explain away on a page of official figures, it is the chart
              stating something false.

              Monotone interpolation keeps the curve within its points, so a
              series that never rises is never drawn rising.
            */
            cubicInterpolationMode: "monotone" as const,
            tension: 0.4,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        animation: { duration, easing: EASING },
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            ...tooltip(palette),
            callbacks: {
              title: (items) => labels[items[0].dataIndex] ?? "",
              label: (item) => formatted[item.dataIndex] ?? "",
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: {
              color: palette.muted,
              font: { size: 11, family: "inherit" },
              maxRotation: rotateLabels ? 45 : 0,
              minRotation: rotateLabels ? 45 : 0,
            },
          },
          y: {
            beginAtZero: true,
            grid: { color: palette.hairline },
            border: { display: false },
            ticks: {
              color: palette.muted,
              font: { size: 11, family: "inherit" },
              maxTicksLimit: 5,
              callback: (v) => `${v}${tickSuffix}`,
            },
          },
        },
      },
    }),
    [labels, values, formatted, tickSuffix, rotateLabels],
  );

  return (
    <ChartCanvas build={build} height={height} ariaLabel={labels[0] ?? ""} />
  );
}
