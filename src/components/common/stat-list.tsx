import { cn } from "@/lib/utils";
import type { Stat } from "@/types/content";
import { AnimatedStatValue } from "@/components/common/animated-stat-value";

/*
  Figure + label grid, shared by the hero and the impact band.

  Semantics matter here: the visible big number is meaningless to a screen
  reader on its own, so each pair is a <dt>/<dd> with the label as the term
  (visually hidden, since it is repeated below the figure).
*/
export function StatList({
  stats,
  align = "start",
  bordered = false,
  reveal = true,
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
      {stats.map((stat, i) => (
        <div
          key={stat.label}
          data-reveal={reveal ? "up" : undefined}
          style={reveal ? ({ "--i": i } as React.CSSProperties) : undefined}
          className={cn(bordered && "border-border border-t pt-4")}
        >
          <dt className="sr-only">{stat.label}</dt>
          <dd>
            <AnimatedStatValue
              value={stat.value}
              className="font-heading text-accent-foreground block text-3xl font-extrabold sm:text-4xl"
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
        </div>
      ))}
    </dl>
  );
}
