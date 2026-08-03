import { Roboto, Inter } from "next/font/google";

/*
  The legacy site declared these two families in styles.css but loaded Noto
  Sans + Open Sans in <head>. Neither declared font ever resolved, so the
  whole site rendered in the system sans-serif fallback. These are the fonts
  the design was actually written for.

  next/font self-hosts them, which also removes the two render-blocking
  requests to fonts.googleapis.com / fonts.gstatic.com from the critical path.

  Subsets:
    latin-ext — required for Uzbek Latin (oʻ, gʻ, sh, ch, ʼ)
    cyrillic  — required for the /ru locale
*/

export const roboto = Roboto({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-roboto",
  display: "swap",
});

// Display face — headings only, so it can skip cyrillic and let Russian
// headings fall back to Inter rather than shipping a subset nothing uses.
export const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

export const fontVariables = `${roboto.variable} ${inter.variable}`;
