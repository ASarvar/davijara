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

/*
  Two call sites, two size/breakpoint pairings. Enumerated rather than
  composed from separate props because Tailwind only sees literal class
  strings — a template-built class would not survive the build.

  Heights are paired with an explicit width at the SAME aspect ratio as the
  file (wordmark 313:69, mark 57:69) so the box is correct before the SVG
  arrives.
*/
const VARIANTS = {
  /*
    Header. Two independent decisions here, which is why the media query and
    the size classes use different breakpoints:

      WHICH FILE  — the mark only below `sm`, where a 4.5:1 wordmark would
                    eat a third of a 375px header. From `sm` there is ample
                    room, so the wordmark loads.
      HOW BIG     — 40px tall through the tablet range, growing to 52px at
                    `xl`, where the nav row is wide enough to carry it.

    The `xl` step is capped by the nav, not by taste: logo + seven nav labels
    + Kirish has to fit the 1200px container, and 236px is what is left over
    with ~50px of slack. Growing it further wraps the nav onto a second line.

    Widths are pinned per step at the file's own aspect ratio (mark 57:69,
    wordmark 313:69) so the box is correct before the SVG arrives.
  */
  header: {
    media: 640,
    className: "h-10 w-[33px] sm:w-[181px] xl:h-13 xl:w-[236px]",
  },
  /*
    Footer. There is room for the wordmark from sm up, and no nav competing
    for the row, so it runs slightly taller than the header's small step.

    ⚠ Height and width must be changed TOGETHER. Both are set on the <img>, so
    the SVG is stretched to whatever box they describe — it is not fitted to
    it. This pairing drifted once already: the height went 32px → 40px while
    the width stayed at 145px (which had been correct for 32px), leaving the
    wordmark rendered at 3.625:1 against its true 4.536:1 — squashed 20%
    horizontally, with no error anywhere to say so.

      wordmark 313:69 → 4.536  ·  44px tall → 200px
      mark      57:69 → 0.826  ·  44px tall →  36px
  */
  footer: {
    media: 640,
    className: "h-11 w-[36px] sm:w-[200px]",
  },
} as const;

export function Logo({
  className,
  variant = "footer",
  /**
   * Set for the header logo, which is above the fold on every page. Leave off
   * elsewhere (the footer) so it loads lazily and stays off the critical path.
   */
  priority = false,
}: {
  className?: string;
  variant?: keyof typeof VARIANTS;
  priority?: boolean;
}) {
  const { media, className: sizeClass } = VARIANTS[variant];

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
        className={cn(sizeClass, className)}
      />
    </picture>
  );
}
