import "server-only";

import {
  closingStatement,
  directorAppeal,
  sections,
} from "@/content/anticorruption";
import { localizeContent } from "@/lib/i18n/content";

/*
  /markaz/korrupsiyaga-qarshi, in the reader's language. The content is
  still code (see the module note in content/anticorruption.ts); this read
  exists so the page does not import it directly, and so /ru can show the
  translators' Russian. The director's appeal was added after the workbook
  was built (22.10.2026), so it has no translation yet and stays Uzbek.
*/
export async function getAnticorruption(locale?: string) {
  return localizeContent(
    { sections, directorAppeal, closingStatement },
    locale,
  );
}
