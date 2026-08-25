import { cn } from "@/lib/utils";
import { Eyebrow } from "@/components/common/eyebrow";

export type Tone = "deep" | "light";

/**
 * How far forward the section's own background sits within its tone.
 *
 * `raised` is one small step up from `base` — the mechanism that gives the
 * page its rhythm now that sections no longer alternate deep/light. See the
 * surface ladder in globals.css for why the step is as small as it is.
 */
export type Surface = "base" | "raised";

/**
 * Constrains content to the legacy 1200px measure with 32px gutters.
 * Use standalone inside a bare <section>, or via `<Section>` which wraps
 * its children in one automatically.
 */
export function Container({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto w-full max-w-[1200px] px-5 sm:px-8", className)}
      {...props}
    >
      {children}
    </div>
  );
}

interface SectionProps extends Omit<React.ComponentProps<"section">, "children"> {
  /**
   * Surface tone. `deep` is navy (the page default), `light` is mist — a
   * pale tint of the same navy, not a warm cream.
   *
   * This sets `data-tone`, which re-binds every semantic colour token for
   * the whole subtree (see globals.css). Descendants — including shadcn/ui
   * components — pick up the correct colours with no props of their own,
   * so long as they style with semantic utilities (`bg-card`, `text-muted-
   * foreground`) rather than raw brand colours.
   */
  tone?: Tone;
  /**
   * Elevation within the tone. Alternate `base` and `raised` down the page —
   * that alternation is what replaced the old deep/light flip.
   */
  surface?: Surface;
  /** Set false to opt out of the max-width wrapper (e.g. full-bleed maps). */
  contained?: boolean;
  containerClassName?: string;
  children?: React.ReactNode;
}

export function Section({
  tone = "deep",
  surface = "base",
  contained = true,
  className,
  containerClassName,
  children,
  ...props
}: SectionProps) {
  return (
    <section
      data-tone={tone}
      /*
        Omitted entirely at `base` rather than written as data-surface="base".
        The attribute then means one thing — "this section is lifted" — and
        the DOM shows at a glance which sections carry the rhythm.
      */
      data-surface={surface === "raised" ? "raised" : undefined}
      /*
        Halved, at the operator's request: py-16/24 (64/96px) -> py-8/12
        (32/48px). Every section on the site reads this, so the page gets
        roughly 400px shorter overall and the rhythm tightens.

        The tone alternation is what still separates sections — it was never
        the whitespace doing that work — so the boundaries survive the cut.
      */
      className={cn("bg-background text-foreground py-8 sm:py-12", className)}
      {...props}
    >
      {contained ? (
        <Container className={containerClassName}>{children}</Container>
      ) : (
        children
      )}
    </section>
  );
}

interface SectionHeaderProps {
  /** Small uppercase label above the heading (legacy `.eyebrow`). */
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Optional trailing link, rendered right-aligned on wide viewports. */
  action?: React.ReactNode;
  /**
   * `compact` is for headers inside a column rather than spanning the page —
   * smaller type and tighter margins. news-and-docs used to hand-roll this,
   * which is how its eyebrow drifted to `mb-2` and its heading to `text-2xl`
   * while every other section used `mb-3` / `text-3xl`.
   */
  size?: "default" | "compact";
  className?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  size = "default",
  className,
}: SectionHeaderProps) {
  const compact = size === "compact";

  return (
    <div
      data-reveal="fade"
      className={cn(compact ? "mb-7" : "mb-10 sm:mb-14", className)}
    >
      {eyebrow ? <Eyebrow className="mb-3">{eyebrow}</Eyebrow> : null}
      <div
        className={cn(
          "flex flex-col gap-4",
          compact
            ? "sm:flex-row sm:items-end sm:justify-between"
            : "md:flex-row md:items-end md:justify-between",
        )}
      >
        <div className="max-w-2xl">
          {/*
            One step below the page <h1> (1.875/2.25/3rem), not level with it.
            These were 1.875/2.25rem — the same size as the h1 at its first two
            breakpoints — so a section heading carried as much weight as the
            title of the whole page, and six of them down the homepage read as
            six page titles rather than as sections of one.

            Trimmed again here: 1.25/1.5rem, one notch below the original
            "smaller" pass. `compact` used to be the one step down from
            `default` (text-xl sm:text-2xl vs text-2xl sm:text-3xl) — now both
            sizes share the same type scale, and `compact` is purely the
            tighter margins/breakpoint its name promises.
          */}
          {/* `data-split` — the motion provider splits this into visual lines
              and rises each one out of its own mask. Every section heading on
              the site goes through here, so this one attribute is the whole
              line-reveal treatment. */}
          <h2 data-split className="font-semibold text-balance text-xl sm:text-2xl">
            {title}
          </h2>
          {description ? (
            /*
              Flat text-sm, not text-sm sm:text-base. Every other paragraph on
              the site — LotCard, FAQ answers, privileges, the hero lede — is a
              plain text-sm with no breakpoint bump; this was the one outlier
              that grew at sm, which is what made the whole header block read
              oversized against the rest of the page's type.
            */
            <p className="text-muted-foreground mt-3 text-sm text-pretty">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}
