import "server-only";

import {
  establishment,
  establishmentOrder,
  officialNaming,
} from "@/content/about";
import { localizeContent } from "@/lib/i18n/content";

import { getAboutDocument } from "./documents";

/*
  Data access for /markaz — now backed by the admin panel.

  Async against the day it stopped reading a local module, which is the same
  contract every module in this folder keeps; see the note in privileges.ts.
  Migration 6 copied the document into the database and the panel edits it
  from there.

  THE TYPESCRIPT MODULE IS THE FALLBACK, NOT DEAD CODE. `getAboutDocument()`
  returns undefined when the row is missing or does not validate — a restored
  backup from before migration 6, a hand-run UPDATE that went wrong. In that
  case /markaz renders the transcription that shipped in the repository rather
  than an empty page. On a state portal, the last known-good text is a better
  answer than nothing, and it is already right here.
*/
export async function getAbout(locale?: string) {
  const doc = getAboutDocument() ?? {
    establishmentOrder,
    establishment,
    officialNaming,
  };
  const localized = localizeContent(doc, locale);

  /*
    The three official names are shown side by side, each under the language
    it is written in. The Uzbek one, under "На государственном языке", must
    stay Uzbek on /ru, so the names themselves are never translated, only
    their labels.
  */
  return {
    ...localized,
    officialNaming: {
      ...localized.officialNaming,
      names: doc.officialNaming.names.map((name, i) => ({
        ...name,
        language: localized.officialNaming.names[i]?.language ?? name.language,
      })),
    },
  };
}
