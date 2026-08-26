import { cn } from "@/lib/utils";

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

interface SectionProps extends Omit<
  React.ComponentProps<"section">,
  "children"
> {
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
        Halved twice, both times at the operator's request: py-16/24 (64/96px)
        -> py-8/12 -> py-4/6 (16/24px). Every section on the site reads this,
        so each cut shortens the whole page at once.

        The tone alternation is what separates sections — it was never the
        whitespace doing that work — so the boundaries survive the cut.
      */
      className={cn("bg-background text-foreground py-4 sm:py-6", className)}
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

/*
  NO EYEBROW. Every section carried a small uppercase label above its heading
  (legacy `.eyebrow`), and the prop is gone rather than merely unused at the
  call sites — a decorative slot that nothing fills is a slot someone fills
  again by accident.

  They were removed at the operator's request. They were also the weakest text
  on the page: "MATBUOT MARKAZI" over "Yangiliklar" and "XARITA" over "Ijara
  obyektlari xaritada" both spent a line restating the heading underneath in
  smaller, lower-contrast type.

  `Eyebrow` itself stays — the hero pill and the form panels' headings still
  use it, and those are labels rather than decoration.
*/
interface SectionHeaderProps {
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
      className={cn(compact ? "mb-3.5" : "mb-5 sm:mb-7", className)}
    >
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
          <h2
            data-split
            className="text-xl font-semibold text-balance sm:text-2xl"
          >
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
