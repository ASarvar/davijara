"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDb } from "@/lib/db";
import { audit } from "@/lib/auth/audit";
import { NotAuthorisedError, requireAdminForAction } from "@/lib/auth/guard";
import {
  getPrivilege,
  nextPrivilegePosition,
  swapPrivilegePosition,
} from "@/lib/data/privileges-admin";
import { PRIVILEGE_CATEGORIES } from "@/lib/data/privileges";
import { routing } from "@/i18n/routing";

/*
  Statutory content — the 24 rent privileges.

  ┌──────────────────────────────────────────────────────────────────────────┐
  │ ADMIN ONLY, NOT EDITOR. This is the one content area an editor cannot    │
  │ touch. A news item that is wrong is embarrassing; a privilege whose      │
  │ `legalBasis` is wrong tells a citizen they are entitled to something     │
  │ they are not, or that they are not entitled to something they are.       │
  │                                                                          │
  │ EVERY CHANGE CARRIES A FULL BEFORE/AFTER SNAPSHOT. That is the whole     │
  │ arrangement under which this text stopped being git-only: the audit log  │
  │ is what replaced the reviewed diff, so an action here that skipped it    │
  │ would quietly remove the safeguard the decision was made on.             │
  └──────────────────────────────────────────────────────────────────────────┘
*/

const CATEGORY_VALUES = PRIVILEGE_CATEGORIES.map((c) => c.value) as [
  "ijtimoiy",
  "talim",
  "it",
  "boshqa",
];

const schema = z.object({
  id: z.coerce.number().int().positive().optional(),
  category: z.enum(CATEGORY_VALUES),
  tag: z.string().trim().min(1, "Yorliqni kiriting.").max(80),
  title: z.string().trim().min(1, "Sarlavhani kiriting.").max(300),
  description: z.string().trim().min(1, "Tavsifni kiriting.").max(2000),
  subject: z
    .string()
    .trim()
    .min(1, "Foydalanuvchi subyektni kiriting.")
    .max(500),
  duration: z.string().trim().min(1, "Davriylikni kiriting.").max(300),
  legalBasis: z.string().trim().min(1, "Huquqiy asosni kiriting.").max(500),
});

export type PrivilegeFormState = { error?: string; ok?: string };

function revalidatePrivileges(): void {
  /*
    Every locale, and both the index and each category route. The category
    pages are real routes (/imtiyozlar/it and friends — the filter is links,
    not client state, per CLAUDE.md non-negotiable 3), so clearing only the
    index would leave a stale citation on the filtered view that a reader is
    more likely to be on.
  */
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/imtiyozlar`);
    for (const category of PRIVILEGE_CATEGORIES) {
      revalidatePath(`/${locale}/imtiyozlar/${category.value}`);
    }
  }
}

export async function savePrivilegeAction(
  _prev: PrivilegeFormState,
  formData: FormData,
): Promise<PrivilegeFormState> {
  let actor;
  try {
    actor = await requireAdminForAction();
  } catch (error) {
    if (error instanceof NotAuthorisedError) return { error: error.message };
    throw error;
  }

  const parsed = schema.safeParse({
    id: formData.get("id") || undefined,
    category: formData.get("category"),
    tag: formData.get("tag"),
    title: formData.get("title"),
    description: formData.get("description"),
    subject: formData.get("subject"),
    duration: formData.get("duration"),
    legalBasis: formData.get("legalBasis"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Maʼlumotlar notoʻgʻri.",
    };
  }

  const {
    id,
    category,
    tag,
    title,
    description,
    subject,
    duration,
    legalBasis,
  } = parsed.data;
  const db = getDb();
  const now = new Date().toISOString();

  if (!id) {
    const info = db
      .prepare(
        `INSERT INTO privileges
           (position, category, tag, title, description, subject, duration,
            legal_basis, updated_at, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        nextPrivilegePosition(),
        category,
        tag,
        title,
        description,
        subject,
        duration,
        legalBasis,
        now,
        actor.id,
      );

    const newId = Number(info.lastInsertRowid);
    audit({
      user: actor,
      action: "create",
      entity: "privilege",
      entityId: newId,
      summary: `Imtiyoz qoʻshildi: ${title}`,
      after: getPrivilege(newId),
    });

    revalidatePrivileges();
    redirect(`/admin/hujjatlar/${newId}`);
  }

  const before = getPrivilege(id);
  if (!before) return { error: "Imtiyoz topilmadi." };

  db.prepare(
    `UPDATE privileges
        SET category = ?, tag = ?, title = ?, description = ?, subject = ?,
            duration = ?, legal_basis = ?, updated_at = ?, updated_by = ?
      WHERE id = ?`,
  ).run(
    category,
    tag,
    title,
    description,
    subject,
    duration,
    legalBasis,
    now,
    actor.id,
    id,
  );

  const after = getPrivilege(id);

  audit({
    user: actor,
    action: "update",
    entity: "privilege",
    entityId: id,
    summary:
      before.legalBasis !== legalBasis
        ? `Imtiyoz tahrirlandi (HUQUQIY ASOS OʻZGARDI): ${title}`
        : `Imtiyoz tahrirlandi: ${title}`,
    before,
    after,
  });

  revalidatePrivileges();
  return { ok: "Saqlandi." };
}

export async function movePrivilegeAction(formData: FormData): Promise<void> {
  const actor = await requireAdminForAction();
  const id = z.coerce.number().int().positive().parse(formData.get("id"));
  const direction = formData.get("direction") === "up" ? "up" : "down";

  const result = swapPrivilegePosition(id, direction);
  if (!result) return;

  audit({
    user: actor,
    action: "update",
    entity: "privilege",
    entityId: id,
    summary: `Tartib oʻzgardi: "${result.moved.title}" ${
      direction === "up" ? "yuqoriga" : "pastga"
    } koʻchirildi`,
  });

  revalidatePrivileges();
}

export async function deletePrivilegeAction(formData: FormData): Promise<void> {
  const actor = await requireAdminForAction();
  const id = z.coerce.number().int().positive().parse(formData.get("id"));

  const before = getPrivilege(id);
  if (!before) return;

  getDb().prepare("DELETE FROM privileges WHERE id = ?").run(id);

  /*
    A hard delete with the complete record in the audit log's `before`. The
    numbered badges on the public list renumber themselves (they are computed
    from position at read time, not stored), so removing one leaves no gap —
    and the removed text can be read back word for word from the log.
  */
  audit({
    user: actor,
    action: "delete",
    entity: "privilege",
    entityId: id,
    summary: `Imtiyoz oʻchirildi: ${before.title} (${before.legalBasis})`,
    before,
  });

  revalidatePrivileges();
  redirect("/admin/hujjatlar");
}
