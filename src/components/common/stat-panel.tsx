import { cn } from "@/lib/utils";
import type { Stat } from "@/types/content";
import { AnimatedStatValue } from "@/components/common/animated-stat-value";
import { Icon } from "@/components/icon";

/**
 * The hero's four headline figures.
 *
 * Icon and figure share the top line, centred; the label sits under them.
 *
 * ── WHY THE ICON IS BESIDE THE NUMBER, NOT ABOVE IT ───────────────────────
 *
 * It halves the card's height. More than that, an icon on its own line reads
 * as a heading for the card and competes with the figure; on the same line at
 * the same optical weight it reads as punctuation for it, which is all a
 * decorative glyph should be doing here.
 *
 * ── ORDER, NOT DOM ────────────────────────────────────────────────────────
 *
 * The <dt> comes FIRST in the DOM and is moved below visually with `order`.
 * A description list must present the term before its description or a screen
 * reader announces "1 562 — Ijaraga berilayotgan obyektlar" backwards; the
 * visual arrangement is the only thing that flips.
 *
 * ── TWO ANIMATIONS, ON TWO DIFFERENT ELEMENTS, AND THAT IS FORCED ─────────
 *
 * The entrance (`data-enter`) animates `transform` and fills `both`, so it
 * holds `transform: none` forever after it plays — and an animation's value
 * beats any normal declaration in the cascade. A `hover:-translate-y` on the
 * same element would therefore never apply. So the card's own hover is
 * background, border and shadow (no transform at all), and the movement comes
 * from the ICON scaling, which carries no animation of its own.
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
        "grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4",
        className,
      )}
    >
      {stats.map((stat, i) => (
        /*
          A <div> grouping each <dt>/<dd> pair, which HTML5 allows inside a
          <dl> precisely so a term and its description can share a wrapper.
          The list semantics survive the layout.
        */
        <div
          key={stat.label}
          /*
            Staggered entrance. `data-enter` is the time-based one — the hero
            is above the fold, where a scroll-driven `view()` timeline is
            already past its range on load and resolves straight to the end
            state, animating nothing. It rises without fading, deliberately:
            see the long note on `[data-enter]` in globals.css for why fading
            here would strand the content invisible in a background tab.

            Delays start at 3 so the cards follow the heading above them
            rather than racing it.
          */
          data-enter
          style={{ "--enter-delay": 3 + i } as React.CSSProperties}
          className={cn(
            "group flex flex-col items-center justify-center rounded-xl border border-dashed px-3 py-3 text-center sm:px-4 sm:py-5",
            /*
              MOSTLY TRANSPARENT, so the hero's own gradient reads through the
              card — that lightness is the point, and an opaque card would put
              four slabs over a background chosen to be seen.

              ONLY THE LIGHT THEME IS REDUCED, and that is forced by what the
              token already holds: on the dark theme `--card` is
              `rgba(255,255,255,0.04)`, so a `/20` there multiplies to 0.008
              and the card stops existing. `--card` is opaque white only on
              the light theme, which is the one that needed thinning.

              THE `!` IS LOAD-BEARING. `dark:` compiles to
              `:where(:root:not([data-theme="light"]), …)`, and `:where()`
              contributes ZERO specificity — so `dark:bg-card` and
              `bg-card/20` tie exactly and source order decides. Measured: the
              `/20` won on BOTH themes, leaving the dark card at 0.8% white.

              An arbitrary variant was tried first and is worse: Tailwind
              escaped `[:root[data-theme='light']_&]:bg-card/20` into a
              literal class NAME rather than expanding it to a descendant
              selector, so it matched nothing at all. Confirmed in the
              compiled stylesheet.
            */
            "bg-card/50 dark:bg-card!",
            "border-hairline",
            /*
              Hover: the dashed border goes GOLD and the surface firms up from
              50% to 80%, with a shadow lifting the card.

              `--ornament`, NOT `--outline`, and the difference is the whole
              point of the request. `--outline` is the "emphasis border" token
              and it is gold only on the dark theme; on the light theme it is
              deliberately COBALT (rgba(26,58,124,0.38)), because cobalt is
              that theme's identity colour — see the note in the root
              CLAUDE.md. `--ornament` is the token that stays gold in every
              combination: gold on deep, gold-ink on light, yellow in high
              contrast.

              Still a token rather than a raw `border-gold/40`: a fixed alpha
              bakes itself into the utility, and a 40%-gold line is invisible
              on the pure black of high-contrast mode.

              `--ornament` is normally reserved for things a reader does NOT
              click. These cards are figures, not links, so a gold hover here
              does not compete with `--accent`'s job of marking what is
              actionable.

              The surface only moves on the LIGHT theme, and that falls out of
              the `!` above rather than needing a rule of its own: the
              important `dark:bg-card` outranks this ordinary hover too. On
              dark the border going hairline -> gold is the visible change,
              and it is a large one.
            */
            "transition-[background-color,border-color,box-shadow] duration-300 ease-out",
            "hover:border-ornament hover:bg-card/80 hover:[box-shadow:var(--shadow-2)]",
          )}
        >
          <dt className="text-muted-foreground order-2 mt-1.5 text-sm leading-snug text-pretty">
            {stat.label}
          </dt>

          <dd className="order-1 flex items-baseline justify-center gap-2">
            {stat.icon ? (
              /*
                Inside the <dd> so it stays on the figure's line without a
                third flex child to order around it. `aria-hidden` because the
                <dt> beside it already says what this counts.

                `self-center` because the row is `items-baseline` for the
                unit's sake — a glyph has no baseline worth aligning to and
                would hang low against one.
              */
              <Icon
                name={stat.icon}
                aria-hidden="true"
                className="text-muted-foreground size-5 shrink-0 self-center transition-transform duration-300 ease-out group-hover:scale-125"
              />
            ) : null}

            <AnimatedStatValue
              value={stat.value}
              /*
                `--ornament`: gold on deep, gold-ink on light, yellow in high
                contrast. `tabular-nums` so the digits hold their columns
                while the count-up animation runs — proportional figures
                reflow on every frame and the number visibly jitters.
              */
              className="font-heading text-ornament block text-xl font-extrabold tabular-nums sm:text-2xl"
            />

            {stat.unit ? (
              /*
                Baseline-aligned with the figure and two steps down in size,
                so it reads as the number's unit rather than as a second
                figure. It sat in the label as "(mln m²)" before, where it
                pushed the description onto a second line and left the number
                looking unqualified.
              */
              <span className="text-muted-foreground text-xs font-medium">
                {stat.unit}
              </span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}
