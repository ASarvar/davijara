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
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
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

  images: {
    // AVIF first, WebP fallback. The legacy site hotlinked every photo to
    // third-party hosts with no format negotiation at all.
    formats: ["image/avif", "image/webp"],
  },

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
