import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/*
  Content Security Policy.

  Self-hosting the fonts (next/font) and dropping the Leaflet / Chart.js /
  Font Awesome CDN tags means there are no third-party script or style origins
  left to allow — so the policy can be far tighter than anything the legacy
  site could have used. It loaded four unpinned CDN bundles with no SRI hashes.

  'unsafe-inline' remains on style-src because Next injects inline styles;
  script-src uses 'unsafe-inline' only as the ignored fallback for browsers
  that do not support nonces/strict-dynamic.
*/
/*
  React's development build uses eval() for debugging features (reconstructing
  call stacks across environments) and logs a CSP error on every page load
  without it. Production never uses eval — React says so explicitly — so this
  is allowed in dev only. A permanent false alarm in the console is worse than
  useless: it trains you to ignore the console, which is where real problems
  appear.
*/
const isDev = process.env.NODE_ENV === "development";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  /*
    Carto's basemap CDN serves the Leaflet map tiles. They are plain raster
    <img> requests made by Leaflet, so the tile hosts must be allowed here or
    the map renders as an empty grid — Next's image config has no say in it.
    Scoped to the specific CDN rather than a wildcard.

    Carto basemaps are free for this use with attribution, which the map
    renders. The legacy site scraped Google's tiles instead, against their
    terms; that is not restored.
  */
  "img-src 'self' data: blob: https://*.basemaps.cartocdn.com",
  "font-src 'self' data:",
  // Dev needs the HMR websocket.
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  /*
    Allows a build to target its own output directory. `next dev` and
    `next build` both write to .next, so measuring a production bundle while a
    dev server is running silently mixes HMR chunks into the numbers. Set
    NEXT_DIST_DIR=.next-prod for a clean bundle measurement or CI build.
  */
  distDir: process.env.NEXT_DIST_DIR || ".next",

  // Stable in Next.js 16. Auto-memoises components, so no manual useMemo /
  // useCallback is needed in the handful of client components here.
  reactCompiler: true,

  experimental: {
    /*
      React's <ViewTransition> integration. Route navigations are already
      Transitions in the App Router, so wrapping the page content is enough to
      get a cross-fade between routes.

      Degrades silently: browsers without the View Transitions API just
      navigate normally. Remove this flag to turn the feature off entirely.
    */
    viewTransition: true,
  },

  images: {
    // AVIF first, WebP fallback. The legacy site hotlinked every photo to
    // third-party hosts with no format negotiation at all.
    formats: ["image/avif", "image/webp"],

    /*
      Required as of Next.js 16 — a `quality` value outside this allowlist
      throws at runtime rather than falling back. Nothing uses next/image yet
      (placeholders are inline SVG), but this is here so the first real
      photograph does not hit a confusing error.

      When adding remote images later, `remotePatterns` AND the CSP `img-src`
      below must be widened together, or the browser blocks the image even
      after Next allows it.
    */
    qualities: [75],
  },

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
