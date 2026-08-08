import { cn } from "@/lib/utils";
import { Eyebrow } from "@/components/common/eyebrow";

export type Tone = "deep" | "light";

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
   * Surface tone. `deep` is navy (the page default), `light` is bone.
   *
   * This sets `data-tone`, which re-binds every semantic colour token for
   * the whole subtree (see globals.css). Descendants — including shadcn/ui
   * components — pick up the correct colours with no props of their own,
   * so long as they style with semantic utilities (`bg-card`, `text-muted-
   * foreground`) rather than raw brand colours.
   */
  tone?: Tone;
  /** Set false to opt out of the max-width wrapper (e.g. full-bleed maps). */
  contained?: boolean;
  containerClassName?: string;
  children?: React.ReactNode;
}

export function Section({
  tone = "deep",
  contained = true,
  className,
  containerClassName,
  children,
  ...props
}: SectionProps) {
  return (
    <section
      data-tone={tone}
      className={cn("bg-background text-foreground py-16 sm:py-24", className)}
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
      data-reveal="up"
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
          */}
          <h2
            className={cn(
              "font-semibold text-balance",
              compact ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl",
            )}
          >
            {title}
          </h2>
          {description ? (
            /* Body copy, so it sits on the same step as the rest of the page
               rather than a size of its own. */
            <p className="text-muted-foreground mt-3 text-sm text-pretty sm:text-base">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}
