import "server-only";

import { getDb } from "@/lib/db";

/*
  Login rate limiting.

  IN THE DATABASE, NOT IN MEMORY. An in-process Map would be emptied by every
  deploy — and deploys happen with `systemctl restart` — so an attacker's
  counter would reset on a schedule they can watch. The table survives
  restarts, and on a workload of a few editors its cost is nil.

  TWO INDEPENDENT LIMITS, because they answer different attacks:

    * per USERNAME — someone guessing one editor's password from anywhere;
    * per IP — someone spraying one common password across many usernames,
      which a username-only counter never notices.

  Both count only FAILURES in the window, and a successful login clears the
  username's failures. So an editor who mistypes twice and then gets in is not
  left one typo away from a lockout for the rest of the hour.

  THE LOCKOUT IS A DELAY, NOT A BAN. Fifteen minutes, self-clearing. A
  permanent lock would need an admin to undo it, which turns a wrong password
  at 8am into a phone call — and turns the login form into a way to lock a
  colleague out of their own account on purpose.
*/

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_USERNAME = 5;
const MAX_PER_IP = 20;

function windowStart(): string {
  return new Date(Date.now() - WINDOW_MS).toISOString();
}

export type RateLimitVerdict =
  { allowed: true } | { allowed: false; retryAfterMinutes: number };

export function checkLoginAllowed(
  username: string,
  ip: string,
): RateLimitVerdict {
  const since = windowStart();

  const byUsername = getDb()
    .prepare(
      `SELECT COUNT(*) AS n FROM login_attempts
        WHERE username = ? AND ok = 0 AND at > ?`,
    )
    .get(username.toLowerCase(), since) as { n: number };

  const byIp = getDb()
    .prepare(
      `SELECT COUNT(*) AS n FROM login_attempts
        WHERE ip = ? AND ok = 0 AND at > ?`,
    )
    .get(ip, since) as { n: number };

  if (byUsername.n < MAX_PER_USERNAME && byIp.n < MAX_PER_IP) {
    return { allowed: true };
  }

  /*
    How long until the OLDEST failure in the window ages out — which is the
    moment the count drops below the limit. Reporting the full window instead
    would tell someone locked out at minute 14 to wait another 15.
  */
  const oldest = getDb()
    .prepare(
      `SELECT MIN(at) AS at FROM login_attempts
        WHERE ok = 0 AND at > ? AND (username = ? OR ip = ?)`,
    )
    .get(since, username.toLowerCase(), ip) as { at: string | null };

  const freeAt = oldest.at
    ? new Date(oldest.at).getTime() + WINDOW_MS
    : Date.now() + WINDOW_MS;

  return {
    allowed: false,
    retryAfterMinutes: Math.max(1, Math.ceil((freeAt - Date.now()) / 60000)),
  };
}

export function recordLoginAttempt(
  username: string,
  ip: string,
  ok: boolean,
): void {
  const name = username.toLowerCase();

  getDb()
    .prepare(
      "INSERT INTO login_attempts (username, ip, at, ok) VALUES (?, ?, ?, ?)",
    )
    .run(name, ip, new Date().toISOString(), ok ? 1 : 0);

  if (ok) {
    getDb()
      .prepare("DELETE FROM login_attempts WHERE username = ? AND ok = 0")
      .run(name);
  }
}
