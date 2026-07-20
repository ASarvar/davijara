import { cn } from "@/lib/utils";

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
  className?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("mb-10 sm:mb-14", className)}>
      {eyebrow ? (
        <p className="text-accent-foreground mb-3 text-xs font-semibold tracking-[0.18em] uppercase">
          {eyebrow}
        </p>
      ) : null}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold text-balance sm:text-4xl">
            {title}
          </h2>
          {description ? (
            <p className="text-muted-foreground mt-3 text-base text-pretty sm:text-lg">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}
