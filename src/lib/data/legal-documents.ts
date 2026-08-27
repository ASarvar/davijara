import { legalDocuments, type LegalDocument } from "@/content/legal-documents";

export type { LegalDocument };

export async function getLegalDocuments(): Promise<LegalDocument[]> {
  return legalDocuments;
}
