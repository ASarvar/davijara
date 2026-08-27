"use server";

import { revalidatePath } from "next/cache";

import { audit } from "@/lib/auth/audit";
import { NotAuthorisedError, requireAdminForAction } from "@/lib/auth/guard";
import {
  getAboutDocument,
  getDutiesDocument,
  writeDocument,
} from "@/lib/data/documents";
import {
  DOCUMENT_KEYS,
  DOCUMENT_LABELS,
  DOCUMENT_PATHS,
  DOCUMENT_SCHEMAS,
  type DocumentKey,
} from "@/types/documents";
import { routing } from "@/i18n/routing";

/*
  Saving one of the two statutory documents.

  ONE ACTION FOR BOTH, because the difference between them is entirely in
  their schema — which is looked up by key rather than branched on. Two
  near-identical actions would be two places to forget the audit call.

  ADMIN ONLY, and every save writes a complete before/after snapshot. Same
  arrangement as the privileges: this log is what replaced the reviewed git
  diff when the operator asked for this text to become editable.
*/

export type DocumentFormState = { error?: string; ok?: string };

function isDocumentKey(value: unknown): value is DocumentKey {
  return DOCUMENT_KEYS.includes(value as DocumentKey);
}

function currentDocument(key: DocumentKey): unknown {
  return key === "about" ? getAboutDocument() : getDutiesDocument();
}

export async function saveDocumentAction(
  _prev: DocumentFormState,
  formData: FormData,
): Promise<DocumentFormState> {
  let actor;
  try {
    actor = await requireAdminForAction();
  } catch (error) {
    if (error instanceof NotAuthorisedError) return { error: error.message };
    throw error;
  }

  const key = formData.get("key");
  if (!isDocumentKey(key)) return { error: "Nomaʼlum hujjat." };

  /*
    The whole document arrives as one JSON field from the editor's React
    state. Re-validated here against the same schema the editor used: a
    hidden input is as editable as any other, and this is the boundary.
  */
  let candidate: unknown;
  try {
    candidate = JSON.parse(String(formData.get("data") ?? ""));
  } catch {
    return { error: "Maʼlumot buzilgan. Sahifani yangilab, qaytadan urining." };
  }

  const parsed = DOCUMENT_SCHEMAS[key].safeParse(candidate);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    /*
      The path is included because these documents are deeply nested — an
      error that says only "Required" leaves an admin hunting through seven
      lettered groups for the empty field.
    */
    const where = issue?.path.length ? ` (${issue.path.join(" → ")})` : "";
    return {
      error: `${issue?.message ?? "Maʼlumotlar notoʻgʻri."}${where}`,
    };
  }

  const before = currentDocument(key);
  writeDocument(key, parsed.data, actor.id);

  audit({
    user: actor,
    action: "update",
    entity: key,
    entityId: key,
    summary: `Huquqiy matn tahrirlandi: ${DOCUMENT_LABELS[key]}`,
    before,
    after: parsed.data,
  });

  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/${DOCUMENT_PATHS[key]}`);
  }

  return { ok: "Saqlandi." };
}
