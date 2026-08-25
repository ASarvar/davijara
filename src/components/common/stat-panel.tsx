import { cn } from "@/lib/utils";
import type { Stat } from "@/types/content";
import { AnimatedStatValue } from "@/components/common/animated-stat-value";
import { Icon } from "@/components/icon";

/**
 * The hero's four headline figures.
 *
 * Each card is split in two: a solid accent block carrying the icon, and the
 * text beside it — label above, figure below. The colour sits in the block
 * and nowhere else, which is what keeps four cards in a row from reading as
 * four competing signals.
 *
 * ── ONE COLOUR, NOT FOUR ──────────────────────────────────────────────────
 *
 * The reference this follows gave each card its own hue — cyan, orange, teal,
 * pink. That is deliberately not reproduced. CLAUDE.md's second
 * non-negotiable is that components consume semantic tokens from the single
 * brand scale and never introduce a second palette; four unrelated brights
 * would be exactly that, and on a state portal they would also read as a
 * consumer dashboard rather than as an official figure. The structure is the
 * borrowed part; the palette stays this site's.
 *
 * `--accent-foreground` is the solid brand ink — gold on the dark theme,
 * cobalt on the light one — and the glyph on it takes `--background`, so the
 * pairing inverts correctly in both:
 *
 *     dark   navy glyph on gold
 *     light  near-white glyph on cobalt
 *     high   black glyph on yellow
 *
 * ── WHY THE FIGURE IS NOT GOLD HERE ───────────────────────────────────────
 *
 * It takes `--heading`: white on dark, cobalt on light. Elsewhere on the site
 * a headline figure is `--ornament` (gold), but that was written for figures
 * standing on a plain surface. Beside a cobalt block on the light theme, a
 * gold-ink number puts two brand colours in one 76px card and the block stops
 * being the thing the eye goes to. One accent per card is the whole reason
 * the reference layout reads as cleanly as it does.
 */
export function StatPanel({
  stats,
  className,
}: {
  stats: Stat[];
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4",
        className,
      )}
    >
      {stats.map((stat) => (
        /*
          A <div> grouping each <dt>/<dd> pair, which HTML5 allows inside a
          <dl> precisely so a term and its description can share a wrapper.
          The list semantics survive the layout.
        */
        <div
          key={stat.label}
          className="border-hairline bg-card flex items-stretch overflow-hidden rounded-xl border [box-shadow:var(--shadow-1)]"
        >
          {/*
            `items-stretch` on the row plus no height here: the block takes
            its height from the text beside it, so the colour runs the full
            side of the card whatever the label wraps to. Giving it a fixed
            height instead leaves a pale gap under it on the one card whose
            label runs to two lines.
          */}
          <div className="bg-accent-foreground text-background flex w-14 shrink-0 items-center justify-center sm:w-16">
            {stat.icon ? (
              <Icon name={stat.icon} className="size-6" aria-hidden="true" />
            ) : null}
          </div>

          <div className="min-w-0 flex-1 px-4 py-3">
            <dt className="text-muted-foreground text-sm leading-snug text-pretty">
              {stat.label}
            </dt>
            <dd>
              <AnimatedStatValue
                value={stat.value}
                /* `tabular-nums` so the digits hold their columns while the
                   count-up animation runs — proportional figures reflow on
                   every frame and the number visibly jitters. */
                className="font-heading text-gold-ink mt-0.5 block text-2xl font-extrabold tabular-nums"
              />
            </dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
