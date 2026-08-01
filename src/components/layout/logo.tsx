import { cn } from "@/lib/utils";
import { site } from "@/content/site";

/*
  Two lockups:

    logo-dm-light.svg    313x69  full wordmark  (9.9 KB)
    logo-short-light.svg  57x69  mark only      (~0.6 KB)

  The wordmark is 4.5:1 — at a 32px cap height it occupies ~145px, which is a
  lot of a 375px phone header once the menu button is accounted for. The mark
  alone takes ~26px.

  Deliberately a <picture> with a media-qualified <source> rather than
  next/image:

  1. The browser fetches ONLY the matching source. Rendering both <Image>s and
     hiding one with CSS would still download the 9.9 KB wordmark on phones
     that never display it.
  2. next/image does not optimise SVG anyway (that needs dangerouslyAllowSVG),
     so it would pass the file through unchanged and add nothing here.

  Widths are pinned per breakpoint instead of `w-auto` so the box is reserved
  before the file loads — the two lockups have different aspect ratios, so
  `w-auto` would shift the header as the image arrives.
*/

export function Logo({
  className,
  /** Breakpoint at which the full wordmark takes over. */
  from = "sm",
  /**
   * Set for the header logo, which is above the fold on every page. Leave off
   * elsewhere (the footer) so it loads lazily and stays off the critical path.
   */
  priority = false,
}: {
  className?: string;
  from?: "sm" | "md" | "lg";
  priority?: boolean;
}) {
  const media = { sm: 640, md: 768, lg: 1024 }[from];

  const widthClass = {
    sm: "w-[26px] sm:w-[145px]",
    md: "w-[26px] md:w-[145px]",
    lg: "w-[26px] lg:w-[145px]",
  }[from];

  return (
    <picture>
      <source media={`(min-width: ${media}px)`} srcSet="/logo-dm-light.svg" />
      <img
        src="/logo-short-light.svg"
        alt={`${site.name} — ${site.tagline}`}
        width={57}
        height={69}
        fetchPriority={priority ? "high" : "auto"}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className={cn("h-8", widthClass, className)}
      />
    </picture>
  );
}
