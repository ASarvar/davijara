"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDb } from "@/lib/db";
import { audit } from "@/lib/auth/audit";
import { NotAuthorisedError, requireAdminForAction } from "@/lib/auth/guard";
import { hashPassword, passwordProblem } from "@/lib/auth/password";
import { destroyAllSessionsFor } from "@/lib/auth/session";
import {
  getUser,
  otherActiveAdmins,
  usernameTaken,
} from "@/lib/data/users-admin";

/*
  Account management.

  EVERY EXPORT REQUIRES AN ADMIN, not merely a signed-in user. An editor
  reaching one of these actions directly — they are POST endpoints, and the
  sidebar hiding the link protects nothing — is refused here.

  Three rules run through the whole file, and each exists because breaking it
  is unrecoverable from inside the panel:

    1. The last active administrator cannot be demoted, disabled or deleted.
    2. Nobody can change their own role or disable themselves. Someone who
       wants to step down asks another admin, which keeps the "at least one
       admin" invariant true at every intermediate step.
    3. A password change or a deactivation destroys that account's sessions.
       Otherwise the person whose access was just revoked stays signed in
       until their cookie expires — up to eight hours later.
*/

export type UserFormState = {
  error?: string;
  ok?: string;
  /** Shown once, never stored: the generated password for a new account. */
  generatedPassword?: string;
};

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9_-]{3,32}$/,
    "Login 3–32 ta belgi: kichik lotin harflari, raqamlar, _ va - .",
  );

const saveSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  username: usernameSchema,
  fullName: z.string().trim().min(2, "Ism-familiyani kiriting.").max(120),
  role: z.enum(["admin", "editor"]),
  isActive: z.coerce.boolean().optional().default(false),
  password: z.string().optional().default(""),
});

/*
  A password an admin can read out over the phone.

  No O/0 and no l/1/I: this string is created by one person and typed by
  another, often from a spoken reading, and a homoglyph there is a support
  call. Length carries the strength instead of an unreadable character mix —
  the same reasoning as the rules in lib/auth/password.ts.
*/
function generatePassword(): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(
    randomBytes(20),
    (byte) => alphabet[byte % alphabet.length],
  ).join("");
}

export async function saveUserAction(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  let actor;
  try {
    actor = await requireAdminForAction();
  } catch (error) {
    if (error instanceof NotAuthorisedError) return { error: error.message };
    throw error;
  }

  const parsed = saveSchema.safeParse({
    id: formData.get("id") || undefined,
    username: formData.get("username"),
    fullName: formData.get("fullName"),
    role: formData.get("role"),
    isActive: formData.get("isActive") === "on",
    password: formData.get("password") ?? "",
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Maʼlumotlar notoʻgʻri.",
    };
  }

  const { id, username, fullName, role, isActive, password } = parsed.data;

  if (usernameTaken(username, id)) {
    return { error: `Bu login band: ${username}.` };
  }

  const db = getDb();

  /* ── Creating ──────────────────────────────────────────────────────── */
  if (!id) {
    const problem = password ? passwordProblem(password) : null;
    if (problem) return { error: problem };

    const initial = password || generatePassword();
    const info = db
      .prepare(
        `INSERT INTO users (username, full_name, password_hash, role, is_active, created_at)
         VALUES (?, ?, ?, ?, 1, ?)`,
      )
      .run(
        username,
        fullName,
        await hashPassword(initial),
        role,
        new Date().toISOString(),
      );

    const newId = Number(info.lastInsertRowid);
    audit({
      user: actor,
      action: "create",
      entity: "user",
      entityId: newId,
      summary: `Foydalanuvchi yaratildi: ${username} (${role})`,
      after: getUser(newId),
    });

    /*
      The password is returned to the CALLER, not stored and not written to
      the audit log. It exists in exactly one place after this — the screen
      the admin is looking at.
    */
    if (!password) {
      return {
        ok: `${username} yaratildi.`,
        generatedPassword: initial,
      };
    }
    redirect(`/admin/foydalanuvchilar/${newId}`);
  }

  /* ── Editing ───────────────────────────────────────────────────────── */
  const before = getUser(id);
  if (!before) return { error: "Foydalanuvchi topilmadi." };

  const isSelf = before.id === actor.id;

  if (isSelf && (role !== before.role || !isActive)) {
    return {
      error:
        "Oʻz rolingizni oʻzgartira olmaysiz va oʻzingizni oʻchira olmaysiz. Boshqa administratorga murojaat qiling.",
    };
  }

  const losingAdmin =
    before.role === "admin" &&
    before.isActive &&
    (role !== "admin" || !isActive);

  if (losingAdmin && otherActiveAdmins(before.id) === 0) {
    return {
      error:
        "Bu — yagona faol administrator. Avval boshqa administrator tayinlang.",
    };
  }

  let passwordChanged = false;
  if (password) {
    const problem = passwordProblem(password);
    if (problem) return { error: problem };
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(
      await hashPassword(password),
      id,
    );
    passwordChanged = true;
  }

  db.prepare(
    "UPDATE users SET username = ?, full_name = ?, role = ?, is_active = ? WHERE id = ?",
  ).run(username, fullName, role, isActive ? 1 : 0, id);

  /*
    Sessions die on a password change or a deactivation — see rule 3 above.
    A role change does NOT need this: `getCurrentUser()` reads the role from
    the users table on every request, so a demotion takes effect on the very
    next page load without touching the session.
  */
  if (passwordChanged || !isActive) {
    destroyAllSessionsFor(id);
  }

  const after = getUser(id);
  audit({
    user: actor,
    action: "update",
    entity: "user",
    entityId: id,
    summary: [
      `Foydalanuvchi tahrirlandi: ${username}`,
      passwordChanged ? "parol yangilandi" : null,
      before.role !== role ? `rol: ${before.role} → ${role}` : null,
      before.isActive !== isActive
        ? isActive
          ? "faollashtirildi"
          : "oʻchirildi"
        : null,
    ]
      .filter(Boolean)
      .join(" · "),
    before,
    after,
  });

  return { ok: "Saqlandi." };
}

/** Generate a new password for someone who has forgotten theirs. */
export async function resetPasswordAction(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  let actor;
  try {
    actor = await requireAdminForAction();
  } catch (error) {
    if (error instanceof NotAuthorisedError) return { error: error.message };
    throw error;
  }

  const id = z.coerce.number().int().positive().parse(formData.get("id"));
  const user = getUser(id);
  if (!user) return { error: "Foydalanuvchi topilmadi." };

  const fresh = generatePassword();
  getDb()
    .prepare("UPDATE users SET password_hash = ? WHERE id = ?")
    .run(await hashPassword(fresh), id);
  destroyAllSessionsFor(id);

  audit({
    user: actor,
    action: "update",
    entity: "user",
    entityId: id,
    summary: `Parol tiklandi: ${user.username}`,
  });

  return {
    ok: `${user.username} uchun yangi parol yaratildi.`,
    generatedPassword: fresh,
  };
}

export async function deleteUserAction(formData: FormData): Promise<void> {
  const actor = await requireAdminForAction();
  const id = z.coerce.number().int().positive().parse(formData.get("id"));

  const before = getUser(id);
  if (!before) return;

  if (before.id === actor.id) {
    throw new NotAuthorisedError("Oʻzingizni oʻchira olmaysiz.");
  }
  if (
    before.role === "admin" &&
    before.isActive &&
    otherActiveAdmins(before.id) === 0
  ) {
    throw new NotAuthorisedError(
      "Bu — yagona faol administrator. Oʻchirib boʻlmaydi.",
    );
  }

  getDb().prepare("DELETE FROM users WHERE id = ?").run(id);

  /*
    The audit log keeps working: audit_log.user_id is ON DELETE SET NULL but
    audit_log.username is a plain copied string, so every action this person
    ever took still names them. Deleting an account must not rewrite history.
  */
  audit({
    user: actor,
    action: "delete",
    entity: "user",
    entityId: id,
    summary: `Foydalanuvchi oʻchirildi: ${before.username}`,
    before,
  });

  redirect("/admin/foydalanuvchilar");
}
