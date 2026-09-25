import "server-only";

import { stat } from "node:fs/promises";
import { join } from "node:path";

import { documentDrafts, type DocumentDraft } from "@/content/document-drafts";

export type DocumentDraftItem = DocumentDraft & {
  /**
   * Read from the file itself, never typed in: a replaced PDF cannot leave a
   * stale size on the page. Absent if the file cannot be read, and the page
   * then prints no size rather than a wrong one.
   */
  sizeBytes?: number;
};

/** Newest first. */
export async function getDocumentDrafts(): Promise<DocumentDraftItem[]> {
  const items = await Promise.all(
    documentDrafts.map(async (doc) => {
      try {
        const { size } = await stat(join(process.cwd(), "public", doc.file));
        return { ...doc, sizeBytes: size };
      } catch {
        return { ...doc };
      }
    }),
  );
  return items.sort((a, b) => b.date.localeCompare(a.date));
}
