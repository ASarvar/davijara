import "server-only";

import {
  closingStatement,
  directorAppeal,
  sections,
} from "@/content/anticorruption";
import { localizeContent, translateText } from "@/lib/i18n/content";

/*
  /markaz/korrupsiyaga-qarshi, in the reader's language. The content is
  still code (see the module note in content/anticorruption.ts); this read
  exists so the page does not import it directly, and so /ru can show the
  translators' Russian. The director's appeal was added after the workbook
  was built (22.10.2026); its Russian is Claude's interim translation
  (ru.interim.json) until the translators review it.

  The appeal's title is translated as ONE unit, its lines joined with "\n".
  Russian re-cuts the four source lines over three («Обращение» moves to the
  front), so no single line has a translation of its own, and putting
  fragments like "…markazi direktori" → "Обращение директора…" in the
  dictionary would rewrite that phrase wherever else it stands alone on /ru.
*/
export async function getAnticorruption(locale?: string) {
  const localized = localizeContent(
    { sections, directorAppeal, closingStatement },
    locale,
  );
  return {
    ...localized,
    directorAppeal: {
      ...localized.directorAppeal,
      titleLines: translateText(
        directorAppeal.titleLines.join("\n"),
        locale,
      ).split("\n"),
    },
  };
}
