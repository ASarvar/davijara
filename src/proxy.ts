import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

/*
  Locale negotiation and redirects.

  Note the filename: as of Next.js 16 this convention is `proxy.ts`, not
  `middleware.ts` — the file was renamed, though the signature is unchanged.
  next-intl still exports its factory under `next-intl/middleware`; that is
  just the package's export name and is unrelated to the file convention.
*/
export default createMiddleware(routing);

export const config = {
  matcher: [
    /*
      The root, listed explicitly.

      The catch-all below does not reach it once the app is mounted under a
      basePath: Next strips the base before the proxy sees the path, so a
      request for "/site" arrives as a bare root that the pattern misses.
      Symptom, reproduced against a production build: "/site/" 308-redirected
      to "/site", which then 404'd — a dead end on the site's own front door,
      while every deeper path ("/site/imtiyozlar" -> "/site/uz/imtiyozlar")
      redirected fine. This entry is also what next-intl's own documented
      matcher starts with.
    */
    "/",
    /*
      Everything except Next internals, API routes, the admin panel, and
      anything that looks like a static file (has a dot). Without the file
      exclusion the proxy would try to locale-prefix /logo-dm-light.svg and
      404 it.

      `admin` is excluded because the panel lives OUTSIDE `[locale]` and has
      no locale prefix: left in, this would redirect /admin to /uz/admin,
      which is not a route, so the whole panel would 404. The panel is
      Uzbek-only by design — see the note in app/admin/layout.tsx.

      This exclusion is a ROUTING decision and carries no authorisation
      weight. Nothing here protects the panel; every admin page and every
      Server Action checks the session for itself (lib/auth/guard.ts).
    */
    "/((?!api|admin|_next|_vercel|.*\\..*).*)",
  ],
};
