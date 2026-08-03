import { cn } from "@/lib/utils";

/**
 * Small uppercase label above a heading (the legacy `.eyebrow`).
 * Was six near-identical copies with drifting margins.
 *
 * `as` exists because the eyebrow is sometimes decorative (a `<p>` above a
 * real heading) and sometimes IS the section's heading — the search widget's
 * label is the only heading that section has, so it must stay an `<h2>` or
 * the document outline loses a landmark.
 */
export function Eyebrow({
  as: Tag = "p",
  dot = false,
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLElement> & {
  as?: "p" | "h2" | "h3" | "span" | "div";
  /**
   * Pill badge with a pulsing dot — the hero's distinct treatment, ported
   * from legacy `.hero-eyebrow` (styles.css:332-362). Every other eyebrow on
   * the site stays the plain uppercase label.
   */
  dot?: boolean;
}) {
  return (
    <Tag
      className={cn(
        "text-accent-foreground text-xs font-semibold tracking-[0.18em] uppercase",
        dot &&
          "border-outline bg-accent inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5",
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          aria-hidden="true"
          className="eyebrow-pulse-dot bg-emerald-500 size-2 shrink-0 rounded-full"
        />
      )}
      {children}
    </Tag>
  );
}
