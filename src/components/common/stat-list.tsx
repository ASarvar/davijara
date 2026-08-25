import { cn } from "@/lib/utils";
import type { Stat } from "@/types/content";
import { AnimatedStatValue } from "@/components/common/animated-stat-value";
import { IconTile } from "@/components/common/icon-tile";

/*
  Figure + label grid, shared by the hero and the impact band.

  Semantics matter here: the visible big number is meaningless to a screen
  reader on its own, so each pair is a <dt>/<dd> with the label as the term.
  The `plain` variant hides the <dt> and repeats the label visually below the
  figure; `card` shows the <dt> itself, above the figure, next to its icon.
*/
export function StatList({
  stats,
  align = "start",
  bordered = false,
  reveal = true,
  variant = "plain",
  className,
}: {
  stats: Stat[];
  align?: "start" | "center";
  /** Hairline above each figure — used in the hero. */
  bordered?: boolean;
  /**
   * Set false when an ancestor already animates this in. The hero does: it
   * uses the time-based `data-enter` entrance, and stacking a scroll reveal
   * on the children would be two animations fighting over the same content.
   */
  reveal?: boolean;
  /** "card" wraps each stat in a bordered surface with an icon + label row above the figure. */
  variant?: "plain" | "card";
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4",
        align === "center" && "text-center",
        className,
      )}
    >
      {stats.map((stat) => (
        <div
          key={stat.label}
          /* "down" — figures drop in from above, which sets them apart from the
             card grids that rise. See the FROM map in motion-provider.tsx. */
          data-reveal={reveal ? "down" : undefined}
          className={cn(
            bordered && "border-border border-t pt-4",
            variant === "card" &&
              "border-hairline bg-card rounded-xl border p-4 sm:p-5",
          )}
        >
          {variant === "card" ? (
            <>
              {/*
                ONE LEFT EDGE for the whole card. The figure used to be
                centred under a left-aligned label, which put the two halves
                on different axes and made a card that is only three lines
                tall read as two stacked blocks. Aligning both to the same
                edge is most of what "compact" means here — the rest is
                padding.
              */}
              <div className="flex items-start gap-2.5">
                {stat.icon && <IconTile name={stat.icon} size="sm" />}
                <dt className="text-muted-foreground text-sm leading-snug text-pretty">
                  {stat.label}
                </dt>
              </div>
              <dd>
                <AnimatedStatValue
                  value={stat.value}
                  /* `--ornament`, not `--accent-foreground`: in the light
                     theme accent is cobalt, and these figures are the one
                     place the brand still wants a warm highlight against
                     it. Gold on deep, gold-ink on light, yellow in high
                     contrast — see the token in globals.css.

                     A step down from the old text-3xl/4xl. At that size the
                     number dominated a card whose label is the part that
                     says what it counts; 2xl/3xl still leads the card
                     without swamping it, and takes ~12px off the height. */
                  className="font-heading text-ornament mt-3 block text-2xl font-extrabold sm:text-3xl"
                />
              </dd>
              {stat.note ? (
                <dd className="text-muted-foreground mt-2 text-xs text-pretty">
                  {stat.note}
                </dd>
              ) : null}
            </>
          ) : (
            <>
              <dt className="sr-only">{stat.label}</dt>
              <dd>
                <AnimatedStatValue
                  value={stat.value}
                  className="font-heading text-ornament block text-3xl font-extrabold sm:text-4xl"
                />
                <span
                  className={cn(
                    "text-muted-foreground mt-1.5 block text-sm",
                    align === "center" && "mx-auto max-w-[16rem]",
                  )}
                >
                  {stat.label}
                </span>
              </dd>
            </>
          )}
        </div>
      ))}
    </dl>
  );
}
