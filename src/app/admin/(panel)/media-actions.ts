"use server";

import { audit } from "@/lib/auth/audit";
import { NotAuthorisedError, requireUserForAction } from "@/lib/auth/guard";
import {
  deleteMedia,
  listMedia,
  mediaPath,
  storeUpload,
} from "@/lib/media/store";
import type { MediaItem } from "@/lib/media/types";

/*
  Upload and delete for images.

  Shared by every editor that can carry a picture — the news form today, the
  page editor next — so it sits at the panel root rather than under one
  section's folder.

  Both actions call requireUserForAction() first: a Server Action is a POST
  endpoint reachable without the page that renders its form. An upload
  endpoint that skips that check is an open file drop on a government server.
*/

export type UploadState = {
  error?: string;
  /** Set on success — the picker reads these back into the form. */
  uploaded?: { path: string; item: MediaItem };
};

export async function uploadImageAction(
  _prev: UploadState,
  formData: FormData,
): Promise<UploadState> {
  let user;
  try {
    user = await requireUserForAction();
  } catch (error) {
    if (error instanceof NotAuthorisedError) return { error: error.message };
    throw error;
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Fayl tanlanmadi." };

  const alt = String(formData.get("alt") ?? "");

  const result = await storeUpload(file, user.id, alt);
  if (!result.ok) return { error: result.error };

  audit({
    user,
    action: "create",
    entity: "media",
    entityId: result.item.id,
    summary: `Rasm yuklandi: ${result.item.originalName}`,
    after: result.item,
  });

  return { uploaded: { path: mediaPath(result.item.id), item: result.item } };
}

/** The library, for the picker's "choose an existing image" list. */
export async function listImagesAction(): Promise<MediaItem[]> {
  await requireUserForAction();
  return listMedia(60);
}

export async function deleteImageAction(
  id: string,
): Promise<{ error?: string }> {
  let user;
  try {
    user = await requireUserForAction();
  } catch (error) {
    if (error instanceof NotAuthorisedError) return { error: error.message };
    throw error;
  }

  /*
    NOT checked against what is using it. A file removed here while an
    article still points at it leaves a broken image — which is visible, and
    fixable by re-uploading, because the id is the content hash: the same file
    uploaded again gets the same URL back. Refusing the delete instead would
    need a usage scan across news, pages and every block body, and would still
    be wrong the moment a draft references it.
  */
  const item = await deleteMedia(id);
  if (!item) return { error: "Rasm topilmadi." };

  audit({
    user,
    action: "delete",
    entity: "media",
    entityId: id,
    summary: `Rasm oʻchirildi: ${item.originalName}`,
    before: item,
  });

  return {};
}
