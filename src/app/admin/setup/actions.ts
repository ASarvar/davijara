"use server";

import { timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDb, isInstalled } from "@/lib/db";
import { audit } from "@/lib/auth/audit";
import { hashPassword, passwordProblem } from "@/lib/auth/password";
import { createSession, requestIp } from "@/lib/auth/session";

/*
  First-run setup — creating the very first administrator.

  ┌──────────────────────────────────────────────────────────────────────────┐
  │ TWO LOCKS, AND BOTH ARE NECESSARY.                                       │
  │                                                                          │
  │ 1. It only works while the users table has no active admin. After that   │
  │    the route 404s, so it cannot be used to add a second account later.   │
  │ 2. It requires ADMIN_SETUP_TOKEN from the server's .env file.            │
  │                                                                          │
  │ Lock 1 alone is the well-known first-run pattern, and on a public URL it │
  │ is a race: between `systemctl restart` and the operator opening the page,│
  │ anyone who reaches /admin/setup first becomes the administrator of a     │
  │ government portal. The window is small and the consequence is total, so  │
  │ the second lock exists to close it — only someone who can read the .env  │
  │ on the box can complete setup, and that is the same person who deployed. │
  │                                                                          │
  │ Why not a CLI script instead? Because the person who runs the Markaz's   │
  │ site is not a systems administrator, and a shell command is a support    │
  │ call. scripts/reset-admin-password.mjs exists for the locked-out case,   │
  │ which is rare and genuinely does need server access.                     │
  └──────────────────────────────────────────────────────────────────────────┘
*/

const schema = z.object({
  token: z.string().min(1),
  username: z
    .string()
    .trim()
    .toLowerCase()
    /*
      ASCII only, and no dots or spaces. This is a login, not a display name —
      `full_name` carries the person's actual name, with whatever characters
      it needs. Restricting the identifier keeps it unambiguous in the audit
      log, where two visually identical usernames would be a real problem.
    */
    .regex(
      /^[a-z0-9_-]{3,32}$/,
      "Login 3–32 ta belgi: kichik lotin harflari, raqamlar, _ va - .",
    ),
  fullName: z.string().trim().min(2, "Ism-familiyani kiriting.").max(120),
  password: z.string(),
  passwordConfirm: z.string(),
});

export type SetupState = { error?: string };

/** Constant-time compare that tolerates different lengths. */
function tokenMatches(supplied: string, expected: string): boolean {
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function setupAction(
  _prev: SetupState,
  formData: FormData,
): Promise<SetupState> {
  // Re-checked inside the action, not just in the page — see lib/auth/guard.ts
  // for why a page-level check is never the security boundary.
  if (isInstalled()) {
    return { error: "Administrator allaqachon mavjud." };
  }

  const expected = process.env.ADMIN_SETUP_TOKEN;
  if (!expected) {
    return {
      error:
        "Serverda ADMIN_SETUP_TOKEN sozlanmagan. .env faylini toʻldiring va servisni qayta ishga tushiring.",
    };
  }

  const parsed = schema.safeParse({
    token: formData.get("token"),
    username: formData.get("username"),
    fullName: formData.get("fullName"),
    password: formData.get("password"),
    passwordConfirm: formData.get("passwordConfirm"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Maʼlumotlar notoʻgʻri.",
    };
  }

  const { token, username, fullName, password, passwordConfirm } = parsed.data;

  if (!tokenMatches(token, expected)) {
    return { error: "Oʻrnatish kaliti notoʻgʻri." };
  }

  const problem = passwordProblem(password);
  if (problem) return { error: problem };

  if (password !== passwordConfirm) {
    return { error: "Parollar mos kelmadi." };
  }

  const hash = await hashPassword(password);
  const info = getDb()
    .prepare(
      `INSERT INTO users (username, full_name, password_hash, role, is_active, created_at)
       VALUES (?, ?, ?, 'admin', 1, ?)`,
    )
    .run(username, fullName, hash, new Date().toISOString());

  const userId = Number(info.lastInsertRowid);

  audit({
    user: { id: userId, username },
    action: "create",
    entity: "user",
    entityId: userId,
    summary: `Birinchi administrator yaratildi (${await requestIp()})`,
    after: { username, fullName, role: "admin" },
  });

  await createSession(userId);
  redirect("/admin");
}
