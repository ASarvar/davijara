/**
 * The homepage banner strip, directly under the header.
 *
 * ARTWORK IS SUPPLIED BY THE OPERATOR. `<HomeBanner>` renders nothing at all
 * while `desktop` is null, so a file that has not arrived yet cannot put a
 * broken-image icon across the top of a state portal's homepage.
 *
 * `mobile` IS OPTIONAL, and when it is absent the strip simply shows the whole
 * desktop file at its own aspect ratio on every width. Nothing is cropped and
 * nothing is stretched — but a 7,2:1 image is ~52px tall on a 375px phone, so
 * the slogan inside it becomes decorative rather than readable. A second crop
 * composed for roughly 2,25:1 (e.g. 1080 × 480) is what makes it legible
 * there; drop it in `public/` and name it here.
 *
 * SAFE ZONE, if a cropped `mobile` file is ever added: everything that has to
 * be READ must sit inside the middle of the frame, because the strip is
 * full-bleed and `object-cover` trims from the sides.
 *
 * TEXT IN THE IMAGE. The artwork carries a slogan, so `alt` repeats it
 * verbatim: a screen reader, a text-only browser and a print render see
 * nothing else, and on a government portal a message only sighted visitors
 * receive is not published.
 */
export const homeBanner: {
  desktop: string | null;
  /** Optional narrow crop. Falls back to `desktop` when absent — see above. */
  mobile?: string | null;
  /** Verbatim transcription of any text in the artwork. Never decorative. */
  alt: string;
  /** Optional destination if the banner is also a link. */
  href?: string;
} = {
  /*
    1280 × 176 (7,27:1) — the privileges banner (operator, 28.10.2026),
    linking to /imtiyozlar. A NEW NAME for each artwork rather than
    overwriting the old file, so no browser or proxy that cached the previous
    one can go on showing it under an unchanged URL.
  */
  desktop: "/banner-imtiyozlar.jpg",
  mobile: null,
  /*
    The slogan verbatim. As the image is now the link's only content, this is
    also the link's accessible name — and it already says where it goes.
  */
  alt: "Davlat mulki ijarasi boʻyicha barcha imtiyozlar haqida batafsil",
  // Locale-relative: the banner renders through @/i18n/navigation's Link,
  // which prefixes the reader's locale (/uz/imtiyozlar).
  href: "/imtiyozlar",
};

/**
 * The intrinsic size of `desktop`, in pixels.
 *
 * Given rather than measured because the strip is a plain `<img>`: without a
 * width and height the browser reserves no box for it, and the whole page
 * jumps down by the banner's height the moment it decodes. Update both
 * numbers together whenever the artwork is replaced.
 */
export const BANNER_SIZE = { width: 1280, height: 176 } as const;
