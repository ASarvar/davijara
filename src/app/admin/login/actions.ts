"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getDb } from "@/lib/db";
import { audit } from "@/lib/auth/audit";
import { hashPassword, needsRehash, verifyPassword } from "@/lib/auth/password";
import { checkLoginAllowed, recordLoginAttempt } from "@/lib/auth/rate-limit";
import { createSession, pruneExpired, requestIp } from "@/lib/auth/session";

/*
  The login action.

  THE ERROR MESSAGE IS THE SAME FOR EVERY FAILURE except rate limiting. "Login
  yoki parol notoʻgʻri" is returned whether the username does not exist, the
  password is wrong, or the account has been deactivated — because a message
  that distinguishes them is a free account-enumeration oracle: an attacker
  learns which usernames are real without ever guessing a password.

  The deactivated case is the one that feels wrong and is not: telling a
  disabled account "your account is disabled" confirms it exists, and a person
  who has actually been disabled learns that from their administrator, not
  from a login form.
*/

const schema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(200),
});

export type LoginState = { error?: string };

type Row = {
  id: number;
  username: string;
  password_hash: string;
  is_active: number;
};

const GENERIC_ERROR = "Login yoki parol notoʻgʻri.";

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = schema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Login va parolni kiriting." };
  }

  const username = parsed.data.username.toLowerCase();
  const ip = await requestIp();

  const verdict = checkLoginAllowed(username, ip);
  if (!verdict.allowed) {
    return {
      error: `Juda koʻp urinish. ${verdict.retryAfterMinutes} daqiqadan soʻng qayta urining.`,
    };
  }

  const row = getDb()
    .prepare(
      "SELECT id, username, password_hash, is_active FROM users WHERE username = ?",
    )
    .get(username) as Row | undefined;

  /*
    Verify a password even when the user does not exist.

    Returning early on an unknown username makes that path measurably faster
    than the password-checking path — scrypt at N=2^15 takes ~100ms, and the
    difference is trivially observable over a network. Hashing the supplied
    password against a throwaway salt costs the same 100ms and removes the
    timing signal.
  */
  const ok = row
    ? row.is_active === 1 &&
      (await verifyPassword(parsed.data.password, row.password_hash))
    : await burnTime(parsed.data.password);

  if (!ok || !row) {
    recordLoginAttempt(username, ip, false);
    audit({
      user: { id: null, username },
      action: "login_failed",
      entity: "session",
      summary: `Muvaffaqiyatsiz kirish urinishi (${ip})`,
    });
    return { error: GENERIC_ERROR };
  }

  recordLoginAttempt(username, ip, true);

  /*
    Upgrade the stored hash if this build's parameters are stronger than the
    ones it was written with. This is the only moment the plaintext is
    available, so it is the only place the upgrade can happen.
  */
  if (needsRehash(row.password_hash)) {
    const fresh = await hashPassword(parsed.data.password);
    getDb()
      .prepare("UPDATE users SET password_hash = ? WHERE id = ?")
      .run(fresh, row.id);
  }

  await createSession(row.id);
  audit({
    user: { id: row.id, username: row.username },
    action: "login",
    entity: "session",
    summary: `Tizimga kirdi (${ip})`,
  });

  // Opportunistic housekeeping — see the note in lib/auth/session.ts.
  pruneExpired();

  redirect("/admin");
}

/** Constant-cost stand-in so an unknown username takes as long as a known one. */
async function burnTime(password: string): Promise<false> {
  await hashPassword(password);
  return false;
}
