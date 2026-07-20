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
  /*
    Run on everything except Next internals, API routes, and anything that
    looks like a static file (has a dot). Without the file exclusion the
    proxy would try to locale-prefix /logo-dm-light.svg and 404 it.
  */
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
