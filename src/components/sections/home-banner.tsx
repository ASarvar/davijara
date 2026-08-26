"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { BANNER_SIZE, homeBanner } from "@/content/banner";
import { withBasePath } from "@/lib/base-path";
import { Container } from "@/components/layout/section";

/**
 * The banner strip ABOVE the header, on the homepage only.
 *
 * ── WHY THIS IS A CLIENT COMPONENT ────────────────────────────────────────
 *
 * It has to sit above `<SiteHeader>`, which lives in the locale layout — so
 * the banner has to live there too. But the layout wraps every route, and the
 * banner belongs to the homepage alone: a decorative strip repeated above
 * every document list and search result costs ~200px of reading room on
 * thirty pages to say something the reader already saw on the way in.
 *
 * A layout is a Server Component and cannot ask which route it is wrapping,
 * so the route check happens here, on `usePathname` from @/i18n/navigation
 * (which returns the path WITHOUT the locale prefix, hence a bare "/").
 *
 * Being a client component costs nothing that matters: Next still renders it
 * on the server, so the image is in the initial HTML and there is no pop-in.
 *
 * CONTAINED AND ROUNDED, not full-bleed — the same treatment e-auksion gives
 * its own banner, which is the site a citizen most often arrives here from.
 * It sits inside the page's 1200px measure with the section gutters, so its
 * edges line up with the search panel and the cards below rather than running
 * out to the window. Full bleed was the first version and read as a second
 * header rather than as content: pinned edge to edge under an edge-to-edge nav
 * bar, there was nothing to say where the chrome stopped.
 *
 * NOT PART OF THE HEADER. It renders once, here, rather than in `SiteHeader`
 * — a decorative strip repeated above every article, document list and search
 * result would cost ~200px of reading room on thirty pages to say something
 * the reader has already seen on the way in.
 *
 * Renders NOTHING until `content/banner.ts` names a file. See that file for
 * the crops and why `alt` is mandatory.
 *
 * A `<picture>` with a media-qualified `<source>` rather than `next/image`,
 * for the same two reasons `logo.tsx` gives: with two crops the browser then
 * fetches ONLY the matching one — rendering both and hiding one with CSS would
 * still pull the 2460px file onto every phone — and the art direction is a
 * genuine crop change, which `next/image`'s `sizes` cannot express.
 *
 * WITH ONE FILE the `<source>` is simply omitted and the same image serves
 * every width at its own aspect ratio. That is the honest default for a strip
 * this wide: `object-cover` into a taller mobile box would have to guess which
 * part of the artwork matters, and here it would guess wrong — the slogan sits
 * right of centre, so a centre crop would cut it in half.
 */
export function HomeBanner() {
  const pathname = usePathname();
  const { desktop, mobile, alt, href } = homeBanner;

  // Homepage only. `usePathname` here is locale-stripped, so "/" covers
  // /uz, /ru and /en alike.
  if (pathname !== "/") return null;
  if (!desktop) return null;

  const image = (
    <picture>
      {/*
        Only when a narrow crop exists. `<source>` with no `srcSet` would be
        an empty candidate and the browser would render nothing at all.
      */}
      {mobile ? (
        <source media="(min-width: 768px)" srcSet={withBasePath(desktop)} />
      ) : null}
      {/*
        `withBasePath` because these are raw <picture>/<img> attributes:
        Next's basePath rewriting covers <Link> and its own chunk URLs, not
        plain HTML. Under the /site mount an unprefixed "/banner.jpg" would
        resolve against the domain root, a different project entirely.
      */}
      <img
        src={withBasePath(mobile ?? desktop)}
        alt={alt}
        /*
          The DESKTOP file's intrinsic size either way. With one file that is
          simply its size; with two, the `<img>` is the mobile candidate but
          these attributes only have to establish an aspect ratio for the box,
          and the CSS below overrides it per breakpoint anyway.
        */
        width={BANNER_SIZE.width}
        height={BANNER_SIZE.height}
        /*
          Eager and high priority: this sits directly under the header, above
          the fold on every viewport, so lazy-loading it would guarantee a
          visible pop-in on the one image every visitor sees first.
        */
        loading="eager"
        fetchPriority="high"
        decoding="async"
        className={
          mobile
            ? "aspect-[1080/480] w-full object-cover object-center md:aspect-[2460/340]"
            : // One file: full width, true aspect ratio, no crop.
              "block h-auto w-full"
        }
      />
    </picture>
  );

  return (
    /*
      `bg-background` and `data-tone="deep"`, matching the nav bar above and
      the hero below — so this reads as a band of the page rather than as its
      own surface. The strip's only edges are the image's own rounded corners.
    */
    <section data-tone="deep" className="bg-background">
      <Container className="">
        {/*
          The radius lives on this wrapper with `overflow-hidden`, not on the
          <img>. A rounded <img> is clipped by the browser at paint time and
          the corners fringe against the page; clipping the box instead is
          what the card primitives do, and it also keeps the corners correct
          if a `mobile` crop with a different aspect ratio is added later.
        */}
        <div className="overflow-hidden">
          {href ? (
            <Link href={href} className="block">
              {image}
            </Link>
          ) : (
            image
          )}
        </div>
      </Container>
    </section>
  );
}
