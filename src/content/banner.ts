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
    1440 × 199 (7,24:1) — the State Flag Day greeting, 18 November (operator,
    17.11.2026), replacing the privileges banner (`/banner-imtiyozlar.jpg`,
    1280 × 176, linked to /imtiyozlar — kept in public/ to put back). A NEW
    NAME for each artwork rather than overwriting the old file, so no browser
    or proxy that cached the previous one can go on showing it under an
    unchanged URL. No `href`: a greeting has nowhere to send the reader.
  */
  desktop: "/banner-bayroq-kuni.jpg",
  mobile: null,
  // The artwork's four lines verbatim, apostrophes normalised to ʻ.
  alt: "18-noyabr - Oʻzbekiston Respublikasi Davlat bayrogʻi qabul qilingan kun! Davlat bayrogʻimiz - xalqimizning milliy gʻururi, mustaqilligi va birdamligi ramzidir. Ushbu qutlugʻ sana munosabati bilan barcha yurtdoshlarimizni samimiy tabriklaymiz! Oʻzbekiston Respublikasi Davlat bayrogʻi qabul qilingan kun muborak boʻlsin!",
};

/**
 * The intrinsic size of `desktop`, in pixels.
 *
 * Given rather than measured because the strip is a plain `<img>`: without a
 * width and height the browser reserves no box for it, and the whole page
 * jumps down by the banner's height the moment it decodes. Update both
 * numbers together whenever the artwork is replaced.
 */
export const BANNER_SIZE = { width: 1440, height: 199 } as const;
