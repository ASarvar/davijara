/*
  The sub-path this app is mounted at. EMPTY in production today — the site
  serves davijara.uz itself.

  It was "/site" until the site took over the domain root; davlat mulki
  monitoring moved to /obyektlar in the same change. The helper is kept
  rather than deleted because the domain is STILL shared — /obyektlar,
  /kadastr, /api2, *.php and /api/search all belong to other projects — so
  remounting under a sub-path has to stay possible, and every call site here
  is already correct for that day.

  `basePath` in next.config.ts handles most of the work automatically — Next's
  own asset URLs, and every href passed through `<Link>` or `next/navigation`.

  This helper exists for the cases it does NOT handle, because they are plain
  HTML that Next never parses:

    <img src="/logo.svg">          → withBasePath("/logo.svg")
    <source srcSet="/logo.svg">    → withBasePath("/logo.svg")
    <form action="/uz/imtiyozlar"> → withBasePath(`/${locale}/imtiyozlar`)

  With an empty base path these are all no-ops, so a missed call site cannot
  be spotted by testing — it only breaks on the day the app is remounted.
  Keep using the helper.

  Read from a NEXT_PUBLIC_ variable rather than from the Next config, because
  `basePath` is not exposed to components in the App Router. Both are fed the
  same env var so they cannot drift apart.
*/
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * Prefixes a root-absolute path with the app's base path.
 *
 * Only for raw HTML attributes. Anything going through `@/i18n/navigation`'s
 * `Link` — which is everything the nav and cards use — is already handled by
 * Next and must NOT be passed through here, or the prefix lands twice.
 */
export function withBasePath(path: string): string {
  return `${BASE_PATH}${path}`;
}
