import { cn } from "@/lib/utils";
import { withBasePath } from "@/lib/base-path";
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

  /*
    `withBasePath` because these are raw <picture>/<img> attributes: Next's
    basePath rewriting covers `<Link>` and its own chunk URLs, not plain HTML.
    Under the /site mount an unprefixed "/logo-…svg" would resolve against
    the domain root, which is a different project entirely.
  */
  const alt = `${site.name} — ${site.tagline}`;
  const imgProps = {
    alt,
    width: 57,
    height: 69,
    fetchPriority: priority ? ("high" as const) : ("auto" as const),
    loading: priority ? ("eager" as const) : ("lazy" as const),
    decoding: "async" as const,
    className: cn(sizeClass, className),
  };

  /*
    TWO lockups, one per theme, swapped by CSS rather than by JavaScript.

    The colour is baked into each SVG (white throughout in one, #07102B in the
    other), so there is no way to recolour a single file from a token — an
    <img> is opaque to CSS `color`. Rendering both and hiding one keeps the
    switch instant and flash-free: the correct logo is in the server HTML,
    chosen by the same `data-theme` attribute the pre-paint script sets.

    Cost is one extra request, and a small one: each <picture> independently
    resolves to the tiny mark below its breakpoint, so a phone fetches two
    0.6 KB files, not two 9.9 KB ones. Doing this in JS instead would either
    flash the wrong logo for a frame or drag the header into a client
    component for a purely visual swap.

    ARIA: only ONE carries the alt text. `display: none` keeps the hidden one
    out of the accessibility tree, but if both were named, any tool that
    ignores the CSS — some crawlers, reader modes — would announce the site
    name twice. The second is marked decorative instead.
  */
  return (
    <>
      {/*
        The white lockup — shown for the dark theme AND under high contrast.

        The two selectors below are exact complements of each other, and that
        is deliberate rather than tidy. High contrast paints everything on pure
        black whatever the theme, so navy-on-black would be near-invisible and
        the white lockup is the right one there. Writing the navy rule as a
        plain `[data-theme='light']` and then trying to undo it with a separate
        high-contrast rule leaves both pictures hidden when a reader has light
        theme AND high contrast on — no logo at all. Excluding high contrast
        inside the one condition makes that state unreachable.
      */}
      <picture className="[:root:not([data-contrast='high'])[data-theme='light']_&]:hidden">
        <source
          media={`(min-width: ${media}px)`}
          srcSet={withBasePath("/logo-dm-light.svg")}
        />
        {/* eslint-disable-next-line jsx-a11y/alt-text -- alt is supplied via imgProps. */}
        <img src={withBasePath("/logo-short-light.svg")} {...imgProps} />
      </picture>

      {/* The navy lockup — light theme only, and only at normal contrast. */}
      <picture className="hidden [:root:not([data-contrast='high'])[data-theme='light']_&]:inline">
        <source
          media={`(min-width: ${media}px)`}
          srcSet={withBasePath("/logo.svg")}
        />
        {/* `alt=""` after the spread, deliberately: decorative duplicate, so
            the empty alt must override imgProps' name rather than be
            overridden by it. The lockup above is the one that carries it. */}
        <img {...imgProps} src={withBasePath("/logo-short.svg")} alt="" />
      </picture>
    </>
  );
}
