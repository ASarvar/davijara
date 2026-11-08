import { legalDocuments, type LegalDocument } from "@/content/legal-documents";
import { localizeContent } from "@/lib/i18n/content";

export type { LegalDocument };

export async function getLegalDocuments(
  locale?: string,
): Promise<LegalDocument[]> {
  return localizeContent(legalDocuments, locale);
}
