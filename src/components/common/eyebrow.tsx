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
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLElement> & {
  as?: "p" | "h2" | "h3" | "span" | "div";
}) {
  return (
    <Tag
      className={cn(
        "text-accent-foreground text-xs font-semibold tracking-[0.18em] uppercase",
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
