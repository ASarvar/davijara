/**
 * The homepage banner strip, directly under the header.
 *
 * ARTWORK IS SUPPLIED BY THE OPERATOR, so both fields start `null` and
 * `<HomeBanner>` renders nothing at all until they are filled. That is
 * deliberate: pointing this at a file that has not arrived yet would put a
 * broken-image icon across the top of a state portal's homepage, and a
 * hardcoded stand-in would put invented artwork there — worse.
 *
 * TO ENABLE: drop the two files into `public/` and name them here.
 *
 *   desktop   2560 × 340 px   (7.5:1)   shown from 768px up
 *   mobile    1080 × 480 px   (2.25:1)  shown below 768px
 *
 * WHY TWO FILES. The strip is full-bleed and `object-cover`, so on a 375px
 * phone a 7.5:1 desktop image would either crop away everything but its
 * middle sixth or scale to 50px tall. The two crops are the same artwork
 * composed for two shapes — the same reason `logo.tsx` ships two lockups.
 *
 * SAFE ZONE. Because the strip is full-bleed and centred, everything that has
 * to be READ — text, emblems, the flag — must sit inside the middle 1200px of
 * the desktop file. The 680px on either side is bleed and is cropped off at
 * common laptop widths.
 *
 * TEXT IN THE IMAGE. If the artwork carries a slogan, `alt` must repeat it
 * verbatim: a screen reader, a text-only browser and a print render see
 * nothing else, and on a government portal a message only sighted visitors
 * receive is not published. `alt` is required for that reason.
 */
export const homeBanner: {
  desktop: string | null;
  mobile: string | null;
  /** Verbatim transcription of any text in the artwork. Never decorative. */
  alt: string;
  /** Optional destination if the banner is also a link. */
  href?: string;
} = {
  desktop: null,
  mobile: null,
  alt: "",
};
