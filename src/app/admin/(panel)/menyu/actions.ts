"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { audit } from "@/lib/auth/audit";
import { NotAuthorisedError, requireUserForAction } from "@/lib/auth/guard";
import {
  createMenuSection,
  deleteMenuSection,
  getMenuSection,
  moveMenuSection,
  movePageInMenu,
  pagesInMenu,
  updateMenuSection,
} from "@/lib/data/menu-admin";

/*
  Menu mutations.

  Every export calls requireUserForAction() before anything else — a Server
  Action is a POST endpoint and the layout's guard never runs for it.

  EVERY WRITE REVALIDATES THE WHOLE LAYOUT, because the header is in the root
  layout and therefore on every page of the site. Revalidating one path would
  leave a renamed section still reading its old name everywhere else.
*/

export type MenuFormState = { error?: string; ok?: string };

const labelSchema = z.object({
  uz: z.string().trim().min(1, "Menyu nomini kiriting.").max(80),
  ru: z.string().trim().max(80).optional().default(""),
  en: z.string().trim().max(80).optional().default(""),
});

const keySchema = z.string().trim().min(1).max(64);

function revalidateMenu(): void {
  revalidatePath("/", "layout");
}

function labelsFrom(formData: FormData) {
  return labelSchema.safeParse({
    uz: formData.get("labelUz") ?? "",
    ru: formData.get("labelRu") ?? "",
    en: formData.get("labelEn") ?? "",
  });
}

export async function createMenuAction(
  _prev: MenuFormState,
  formData: FormData,
): Promise<MenuFormState> {
  let user;
  try {
    user = await requireUserForAction();
  } catch (error) {
    if (error instanceof NotAuthorisedError) return { error: error.message };
    throw error;
  }

  const parsed = labelsFrom(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Nom notoʻgʻri." };
  }

  const key = createMenuSection(parsed.data.uz, user.id, {
    ru: parsed.data.ru,
    en: parsed.data.en,
  });

  audit({
    user,
    action: "create",
    entity: "menu",
    entityId: key,
    summary: `Menyu yaratildi: ${parsed.data.uz}`,
    after: getMenuSection(key),
  });

  revalidateMenu();
  return {
    ok: `«${parsed.data.uz}» qoʻshildi. Sahifa biriktirilgunicha saytda koʻrinmaydi.`,
  };
}

export async function renameMenuAction(
  _prev: MenuFormState,
  formData: FormData,
): Promise<MenuFormState> {
  let user;
  try {
    user = await requireUserForAction();
  } catch (error) {
    if (error instanceof NotAuthorisedError) return { error: error.message };
    throw error;
  }

  const key = keySchema.safeParse(formData.get("key"));
  if (!key.success) return { error: "Menyu topilmadi." };

  const before = getMenuSection(key.data);
  if (!before) return { error: "Menyu topilmadi." };

  const parsed = labelsFrom(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Nom notoʻgʻri." };
  }

  updateMenuSection(key.data, parsed.data);

  audit({
    user,
    action: "update",
    entity: "menu",
    entityId: key.data,
    summary: `Menyu nomi oʻzgardi: ${before.labelUz} → ${parsed.data.uz}`,
    before,
    after: getMenuSection(key.data),
  });

  revalidateMenu();
  return { ok: "Saqlandi." };
}

export async function deleteMenuAction(formData: FormData): Promise<void> {
  const user = await requireUserForAction();

  const key = keySchema.safeParse(formData.get("key"));
  if (!key.success) return;

  const before = getMenuSection(key.data);
  if (!before) return;

  /*
    The pages are recorded in the audit entry alongside the section, because
    deleting it detaches them. Without that list, undoing this would mean
    remembering by hand which four pages used to live here.
  */
  const detached = pagesInMenu(key.data);

  deleteMenuSection(key.data);

  audit({
    user,
    action: "delete",
    entity: "menu",
    entityId: key.data,
    summary: `Menyu oʻchirildi: ${before.labelUz}${
      detached.length ? ` (${detached.length} ta sahifa menyudan chiqarildi)` : ""
    }`,
    before: { ...before, pages: detached },
  });

  revalidateMenu();
}

const directionSchema = z.enum(["up", "down"]);

export async function moveMenuAction(formData: FormData): Promise<void> {
  await requireUserForAction();

  const key = keySchema.safeParse(formData.get("key"));
  const direction = directionSchema.safeParse(formData.get("direction"));
  if (!key.success || !direction.success) return;

  moveMenuSection(key.data, direction.data === "up" ? -1 : 1);
  revalidateMenu();
}

const pageIdSchema = z.coerce.number().int().positive();

export async function movePageAction(formData: FormData): Promise<void> {
  await requireUserForAction();

  const id = pageIdSchema.safeParse(formData.get("id"));
  const direction = directionSchema.safeParse(formData.get("direction"));
  if (!id.success || !direction.success) return;

  movePageInMenu(id.data, direction.data === "up" ? -1 : 1);
  revalidateMenu();
}

/*
  Reordering is NOT audited.

  The audit log exists so a change to what the portal says can be reviewed
  and undone; the order of two links in one dropdown is neither. Logging it
  would bury the entries that matter — a statutory text edited, a page
  unpublished — under a stream of arrow presses.
*/
