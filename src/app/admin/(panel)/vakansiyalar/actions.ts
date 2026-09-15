"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDb } from "@/lib/db";
import { audit } from "@/lib/auth/audit";
import { NotAuthorisedError, requireUserForAction } from "@/lib/auth/guard";
import { getVacancyRecord } from "@/lib/data/vacancies-admin";
import { blocksSchema } from "@/types/blocks";
import { routing } from "@/i18n/routing";

/*
  Vacancy mutations.

  EVERY EXPORT CALLS requireUserForAction() FIRST — a Server Action is a POST
  endpoint reachable without the page that renders its form. Repeated per
  action rather than wrapped, for the reason given at the top of
  ../yangiliklar/actions.ts.
*/

const DAY = z
  .string()
  .trim()
  .regex(
    /^(\d{4}-\d{2}-\d{2})?$/,
    "Sana YYYY-MM-DD koʻrinishida boʻlishi kerak.",
  );

const saveSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  title: z.string().trim().min(1, "Lavozim nomi toʻldirilishi shart.").max(500),
  unit: z.string().trim().max(300),
  deadline: DAY,
  testDate: DAY,
  email: z
    .string()
    .trim()
    .max(200)
    .regex(
      /^([^\s@]+@[^\s@]+\.[^\s@]+)?$/,
      "Elektron pochta manzili notoʻgʻri.",
    ),
  blocks: z.string(),
});

const idSchema = z.coerce.number().int().positive();

export type VacancyFormState = { error?: string; ok?: string };

/*
  The public page in every locale — revalidatePath does not expand the
  [locale] segment on its own — and the panel's own pages, whose status
  column and per-row buttons have just changed.
*/
function revalidateVacancies(): void {
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/markaz/bosh-ish-orinlari`);
  }
  revalidatePath("/admin/vakansiyalar", "layout");
}

export async function saveVacancyAction(
  _prev: VacancyFormState,
  formData: FormData,
): Promise<VacancyFormState> {
  let user;
  try {
    user = await requireUserForAction();
  } catch (error) {
    if (error instanceof NotAuthorisedError) return { error: error.message };
    throw error;
  }

  const parsed = saveSchema.safeParse({
    id: formData.get("id") || undefined,
    title: formData.get("title") ?? "",
    unit: formData.get("unit") ?? "",
    deadline: formData.get("deadline") ?? "",
    testDate: formData.get("testDate") ?? "",
    email: formData.get("email") ?? "",
    blocks: formData.get("blocks") ?? "[]",
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Maʼlumotlar notoʻgʻri.",
    };
  }

  /*
    Re-validated here rather than trusted: the editor component produced this
    JSON, but a hidden input is as editable as any other field.
  */
  let blocks: string;
  try {
    const validated = blocksSchema.safeParse(JSON.parse(parsed.data.blocks));
    if (!validated.success) {
      return { error: "Eʼlon matnida xato bor. Boʻsh bloklarni oʻchiring." };
    }
    blocks = JSON.stringify(validated.data);
  } catch {
    return { error: "Eʼlon matni buzilgan." };
  }

  const { id, title, unit, deadline, testDate, email } = parsed.data;
  const before = id ? getVacancyRecord(id) : undefined;
  if (id && !before) return { error: "Vakansiya topilmadi." };

  const db = getDb();
  const now = new Date().toISOString();
  let vacancyId = id;

  if (vacancyId) {
    db.prepare(
      `UPDATE vacancies
          SET title = ?, unit = ?, deadline = ?, test_date = ?, email = ?,
              blocks = ?, updated_at = ?, updated_by = ?
        WHERE id = ?`,
    ).run(
      title,
      unit,
      deadline || null,
      testDate || null,
      email,
      blocks,
      now,
      user.id,
      vacancyId,
    );
  } else {
    /* Starts 'closed' — see migration 13: saving is not publishing. */
    const info = db
      .prepare(
        `INSERT INTO vacancies
           (status, title, unit, deadline, test_date, email, blocks, created_at, created_by)
         VALUES ('closed', ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        title,
        unit,
        deadline || null,
        testDate || null,
        email,
        blocks,
        now,
        user.id,
      );
    vacancyId = Number(info.lastInsertRowid);
  }

  audit({
    user,
    action: id ? "update" : "create",
    entity: "vacancy",
    entityId: vacancyId,
    summary: id
      ? `Vakansiya tahrirlandi: ${title}`
      : `Vakansiya yaratildi: ${title}`,
    before,
    after: getVacancyRecord(vacancyId),
  });

  revalidateVacancies();

  /*
    A new record redirects to its own edit page, so a second Save edits it
    instead of creating a duplicate.
  */
  if (!id) redirect(`/admin/vakansiyalar/${vacancyId}`);

  return { ok: "Saqlandi." };
}

/** Open (show on the site) or close (take it down). */
export async function setVacancyStatusAction(
  formData: FormData,
): Promise<void> {
  const user = await requireUserForAction();
  const id = idSchema.parse(formData.get("id"));
  const open = formData.get("open") === "1";

  const before = getVacancyRecord(id);
  if (!before) return;

  getDb()
    .prepare(
      "UPDATE vacancies SET status = ?, updated_at = ?, updated_by = ? WHERE id = ?",
    )
    .run(open ? "open" : "closed", new Date().toISOString(), user.id, id);

  audit({
    user,
    action: open ? "publish" : "unpublish",
    entity: "vacancy",
    entityId: id,
    summary: open
      ? `Vakansiya saytda eʼlon qilindi: ${before.title}`
      : `Vakansiya yopildi: ${before.title}`,
    before,
    after: getVacancyRecord(id),
  });

  revalidateVacancies();
}

export async function deleteVacancyAction(formData: FormData): Promise<void> {
  const user = await requireUserForAction();
  const id = idSchema.parse(formData.get("id"));

  const before = getVacancyRecord(id);
  if (!before) return;

  /*
    A hard delete; the whole record survives in the audit log's `before`
    snapshot, which is what makes a mistaken delete recoverable. Closing is
    the normal way an announcement comes down — this is for one created by
    mistake.
  */
  getDb().prepare("DELETE FROM vacancies WHERE id = ?").run(id);

  audit({
    user,
    action: "delete",
    entity: "vacancy",
    entityId: id,
    summary: `Vakansiya oʻchirildi: ${before.title}`,
    before,
  });

  revalidateVacancies();
  redirect("/admin/vakansiyalar");
}
