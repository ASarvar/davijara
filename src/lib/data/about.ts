import "server-only";

import {
  establishment,
  establishmentOrder,
  officialNaming,
} from "@/content/about";
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
export async function getAbout() {
  const stored = getAboutDocument();
  if (stored) return stored;

  return { establishmentOrder, establishment, officialNaming };
}
