import { Link } from "@/i18n/navigation";
import { homeBanner } from "@/content/banner";
import { withBasePath } from "@/lib/base-path";

/**
 * The full-bleed banner strip under the header, on the homepage only.
 *
 * NOT PART OF THE HEADER. It renders once, here, rather than in `SiteHeader`
 * — a decorative strip repeated above every article, document list and search
 * result would cost ~200px of reading room on thirty pages to say something
 * the reader has already seen on the way in.
 *
 * Renders NOTHING until `content/banner.ts` names both files. See that file
 * for the crops, the safe zone and why `alt` is mandatory.
 *
 * A `<picture>` with a media-qualified `<source>`, not `next/image`, for the
 * same two reasons `logo.tsx` gives: the browser then fetches ONLY the
 * matching crop — rendering both and hiding one with CSS would still pull the
 * 2560px file onto every phone — and the art direction here is a genuine crop
 * change, which `next/image`'s `sizes` cannot express.
 *
 * The aspect ratio is set in CSS at BOTH breakpoints, so the box is reserved
 * before the file arrives and adding the banner causes no layout shift.
 */
export function HomeBanner() {
  const { desktop, mobile, alt, href } = homeBanner;
  if (!desktop || !mobile) return null;

  const image = (
    <picture>
      <source
        media="(min-width: 768px)"
        srcSet={withBasePath(desktop)}
        width={2560}
        height={340}
      />
      {/*
        `withBasePath` because these are raw <picture>/<img> attributes:
        Next's basePath rewriting covers <Link> and its own chunk URLs, not
        plain HTML. Under the /site mount an unprefixed "/banner…" would
        resolve against the domain root, a different project entirely.
      */}
      <img
        src={withBasePath(mobile)}
        alt={alt}
        width={1080}
        height={480}
        /*
          Eager and high priority: this sits directly under the header, above
          the fold on every viewport, so lazy-loading it would guarantee a
          visible pop-in on the one image every visitor sees first.
        */
        loading="eager"
        fetchPriority="high"
        decoding="async"
        className="aspect-[1080/480] w-full object-cover object-center md:aspect-[2560/340]"
      />
    </picture>
  );

  return (
    /*
      `data-tone="deep"` so the strip's own surround follows the theme rather
      than sitting on whatever tone happens to precede it, and `bg-band` shows
      through in the sliver above and below the image while it decodes.
    */
    <div data-tone="deep" className="bg-band w-full overflow-hidden">
      {href ? (
        <Link href={href} className="block">
          {image}
        </Link>
      ) : (
        image
      )}
    </div>
  );
}
