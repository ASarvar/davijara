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
              "border-hairline bg-card rounded-xl border p-5 sm:p-6",
          )}
        >
          {variant === "card" ? (
            <>
              <div className="mb-3 flex items-center gap-3">
                {stat.icon && <IconTile name={stat.icon} size="sm" />}
                <dt className="text-muted-foreground text-sm">{stat.label}</dt>
              </div>
              <dd>
                <AnimatedStatValue
                  value={stat.value}
                  /* `--ornament`, not `--accent-foreground`: in the light
                     theme accent is cobalt, and these three figures are the
                     one place the brand still wants a warm highlight against
                     it. Gold on deep, gold-ink on light, yellow in high
                     contrast — see the token in globals.css. */
                  className="font-heading text-ornament block pt-3 text-center text-3xl font-extrabold sm:text-4xl"
                />
              </dd>
              {stat.note ? (
                <dd className="text-muted-foreground mt-3 text-xs text-pretty">
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
