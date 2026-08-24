"use client";

import { useEffect, useRef, useState } from "react";
import {
  Chart,
  type ChartConfiguration,
  type ChartType,
  type Plugin,
} from "chart.js/auto";

/*
  The Chart.js host: theming, motion and the accessible layer.

  ── WHY A CANVAS NEEDS A SERVER-RENDERED TWIN ──────────────────────────────
  Everything a `<canvas>` draws is a bitmap. It carries no text, so a screen
  reader finds nothing, a crawler indexes nothing, a print stylesheet gets a
  blurry rectangle, `data-text-size` cannot scale a single glyph inside it,
  and a visitor with JavaScript off sees an empty box on a page whose entire
  purpose is publishing figures.

  On a state portal none of that is acceptable, so the numbers are ALWAYS in
  the DOM as a real `<table>` — see `ChartFigure` below. The canvas is an
  enhancement layered over it, and the table is hidden from sight only once
  the chart has actually drawn. Turn JavaScript off and the page is still a
  complete set of statistics, just in tables.

  ── THEME ──────────────────────────────────────────────────────────────────
  Chart.js takes colours as JavaScript values, so it cannot follow
  `data-tone` / `data-theme` / `data-contrast` on its own the way a CSS-styled
  SVG does. Instead the palette is READ from the live computed styles of a
  probe element inside the chart's own section — so it picks up whatever the
  tone re-bound — and a MutationObserver on `<html>` re-reads and repaints
  when the reader flips the theme or turns on high contrast.

  ── MOTION ─────────────────────────────────────────────────────────────────
  The chart animates once, when it is scrolled into view, rather than on
  mount: a chart that played its entrance while three screens above the fold
  has simply not been seen. `prefers-reduced-motion` sets the duration to 0,
  which draws the same chart with no movement at all.
*/

/** Semantic tokens the charts draw with, resolved from the live DOM. */
export interface ChartPalette {
  accent: string;
  foreground: string;
  muted: string;
  hairline: string;
  card: string;
  heading: string;
}

/**
 * Reads the tokens as the browser has resolved them for THIS element.
 *
 * `getPropertyValue` on the custom property would return the raw declaration
 * — often another `var()` — so each token is applied to a probe and read back
 * as a finished colour instead.
 */
function readPalette(probe: HTMLElement): ChartPalette {
  const styles = getComputedStyle(probe);
  const of = (prop: string, fallback: string) => {
    const raw = styles.getPropertyValue(prop).trim();
    if (!raw) return fallback;
    // Resolve through the probe so `var()` chains and colour-mix() collapse.
    probe.style.color = `var(${prop})`;
    const resolved = getComputedStyle(probe).color;
    probe.style.color = "";
    return resolved || fallback;
  };

  return {
    accent: of("--accent-foreground", "#c8a96e"),
    foreground: of("--foreground", "#ffffff"),
    muted: of("--muted-foreground", "#94a3b8"),
    hairline: of("--hairline", "rgba(255,255,255,0.12)"),
    card: of("--card", "#0d1e45"),
    heading: of("--heading", "#ffffff"),
  };
}

/** Fade a resolved colour. Handles `rgb()` / `rgba()`, which is all we read. */
export function alpha(color: string, a: number): string {
  const match = /rgba?\(([^)]+)\)/.exec(color);
  if (!match) return color;
  const [r, g, b] = match[1].split(",").map((v) => parseFloat(v));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * A top-to-bottom gradient of the accent, for area and bar fills.
 *
 * Built against the chart AREA rather than the canvas, so the ramp lines up
 * with the plot no matter how tall the legend and axis labels turn out to be.
 */
export function accentGradient(
  ctx: CanvasRenderingContext2D,
  area: { top: number; bottom: number } | undefined,
  color: string,
  from = 0.38,
  to = 0.02,
): string | CanvasGradient {
  if (!area) return alpha(color, from);
  const gradient = ctx.createLinearGradient(0, area.top, 0, area.bottom);
  gradient.addColorStop(0, alpha(color, from));
  gradient.addColorStop(1, alpha(color, to));
  return gradient;
}

/*
  The hover crosshair.

  A vertical rule dropped from the active point to the baseline — the detail
  that makes a dashboard chart feel like an instrument rather than a picture.
  Chart.js has no built-in for it, and it is eleven lines.
*/
export const crosshair: Plugin<ChartType> = {
  id: "crosshair",
  afterDatasetsDraw(chart) {
    const active = chart.getActiveElements();
    if (active.length === 0) return;
    const { ctx, chartArea } = chart;
    const x = active[0].element.x;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, chartArea.top);
    ctx.lineTo(x, chartArea.bottom);
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle =
      (chart.options as { crosshairColor?: string }).crosshairColor ??
      "rgba(148,163,184,0.5)";
    ctx.stroke();
    ctx.restore();
  },
};

export function ChartCanvas({
  build,
  height,
  ariaLabel,
  className,
}: {
  /** Given the palette and whether motion is allowed, the Chart.js config. */
  build: (palette: ChartPalette, duration: number) => ChartConfiguration;
  /** CSS height. The canvas fills its box; Chart.js handles the DPR. */
  height: number;
  ariaLabel: string;
  className?: string;
}) {
  const holderRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const holder = holderRef.current;
    if (!canvas || !holder) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    /*
      1,6s, not the 0,9s this started at.

      At 900ms with a 60ms stagger the whole eight-column entrance was over
      before the section had finished scrolling into place — the reader
      arrived to a finished chart and saw no motion at all. Slower also suits
      what the motion is FOR here: the bars rising in sequence is the reader
      being walked through the shape, and that cannot be rushed.
    */
    const duration = reduced ? 0 : 1600;

    let cancelled = false;

    const draw = () => {
      if (cancelled) return;
      /*
        Guarded, because the stylesheet hides this chart's table as soon as it
        knows JavaScript is running — before any chart has drawn. That is what
        stops a page of tables flashing on the way down, but it means a chart
        that throws would take its figures off the page with it. Marking the
        figure brings the table straight back.
      */
      try {
        chartRef.current?.destroy();
        const config = build(readPalette(holder), duration);
        chartRef.current = new Chart(canvas, config);
        holder.closest("figure")?.removeAttribute("data-chart-failed");
        setDrawn(true);
      } catch (error) {
        console.error("[chart] could not draw", error);
        chartRef.current = null;
        holder.closest("figure")?.setAttribute("data-chart-failed", "");
      }
    };

    /*
      Repaint on a theme change. The attributes are set by the blocking
      accessibility script and by the header toggle, both of which write to
      `<html>`, so one observer covers every route into a new palette.

      `redraw` rather than `update`: the palette is baked into the dataset
      options when the config is built, so the chart has to be rebuilt from a
      fresh config rather than nudged.
    */
    const observer = new MutationObserver(() => {
      if (chartRef.current) draw();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "data-contrast", "data-text-size"],
    });

    /*
      Drawn when it is reached, not when it mounts — an entrance animation
      that played four screens above the reader never happened as far as they
      are concerned.

      AND REPLAYED ON EVERY RETURN. The observer used to disconnect after the
      first hit, so scrolling back up to a chart showed a static picture of
      something that had animated once, minutes ago. Now it redraws each time
      the chart comes back into view, which is what makes the page feel alive
      on the way back up as well as the way down.

      `visible` latches the state so only a genuine leave-and-return replays.
      Without it every intersection callback — and they fire on resize, on a
      neighbouring layout change, on the scrollbar appearing — would restart
      the animation while the reader was already reading the chart.

      `rootMargin` is deliberately NOT symmetric: 0px on the way in so the
      chart is properly on screen before it starts, and the leave is only
      registered once it is a good way off, so a small scroll nudge near the
      boundary cannot flicker it.
    */
    let visible = false;
    const io = new IntersectionObserver(
      (entries) => {
        const showing = entries.some((e) => e.isIntersecting);
        if (showing && !visible) {
          visible = true;
          draw();
        } else if (!showing) {
          visible = false;
        }
      },
      { rootMargin: "-40px 0px -40px 0px", threshold: 0.25 },
    );
    io.observe(holder);

    return () => {
      cancelled = true;
      io.disconnect();
      observer.disconnect();
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [build]);

  return (
    <div
      ref={holderRef}
      style={{ height }}
      className={`relative w-full ${className ?? ""}`}
    >
      {/*
        `aria-hidden`, because the table beside it carries the same numbers as
        text. Announcing an unlabelled canvas as an image adds a stop on the
        way to the data without adding any of it.
      */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        data-drawn={drawn ? "" : undefined}
        aria-label={ariaLabel}
        className="!h-full !w-full"
      />
    </div>
  );
}
