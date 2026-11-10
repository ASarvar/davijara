import "server-only";

import {
  contacts,
  externalLinks,
  footerNav,
  legalNav,
  site,
  socialLinks,
} from "@/content/site";
import { localizeContent } from "@/lib/i18n/content";

/*
  The footer's and the contact page's prose from content/site.ts — the
  address, the working hours, the column headings, the operator's name — in
  the reader's language.

  Only the server components that PRINT that prose read it through here.
  Code that uses site.ts for links, keys or the canonical URL (the menu, the
  sitemap, metadata, JSON-LD) still imports the module itself: those values
  are the same in every language, and JSON-LD in particular lists the
  official names in all three on purpose.
*/
export async function getSiteContent(locale?: string) {
  return localizeContent(
    { site, contacts, externalLinks, footerNav, legalNav, socialLinks },
    locale,
  );
}
