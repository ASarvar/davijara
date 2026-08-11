/*
  The sub-path this app is mounted at, e.g. "/site".

  The site does not own the domain root: davijara.uz/ is a different project,
  and nginx forwards only `location /site` here. `basePath` in next.config.ts
  handles most of that automatically — Next's own asset URLs, and every href
  passed through `<Link>` or `next/navigation`.

  This helper exists for the cases it does NOT handle, because they are plain
  HTML that Next never parses:

    <img src="/logo.svg">          → withBasePath("/logo.svg")
    <source srcSet="/logo.svg">    → withBasePath("/logo.svg")
    <form action="/uz/obyektlar">  → withBasePath(`/${locale}/obyektlar`)

  Miss one and it silently 404s against the OTHER project at the domain root,
  which is worse than a normal 404 — the request succeeds against something
  unrelated instead of failing loudly.

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
