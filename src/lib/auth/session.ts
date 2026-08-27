import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { cache } from "react";

import { getDb } from "@/lib/db";

/*
  Sessions.

  The cookie carries 32 random bytes; the DATABASE stores only their SHA-256.
  A plain hash rather than a KDF is correct here and not an inconsistency with
  password.ts: the token already has 256 bits of entropy from a CSPRNG, so
  there is no dictionary to attack and nothing for a slow hash to buy. What
  the hash does buy is that a leaked backup contains no usable session.
*/

const COOKIE_NAME = "davijara_admin_session";
const TOKEN_BYTES = 32;

/** Eight hours — a working day, not a persistent "remember me". */
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

/*
  THE COOKIE PATH IS A SECURITY BOUNDARY HERE, NOT A DETAIL.

  davijara.uz is SHARED. The domain root, /kadastr, /new and /api/search all
  belong to other projects on the same server (DEPLOY.md); this site only owns
  /site. A cookie set at path "/" would be sent to every one of those
  projects on every request — handing an admin session token to code this
  repository does not own. Scoping it to the basePath keeps it inside /site.

  Next does NOT prefix cookie paths with basePath automatically; `<Link>` and
  the router are prefixed, cookies are not. So this reads the same env var
  next.config.ts does.
*/
function cookiePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH || "/";
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function nowIso(): string {
  return new Date().toISOString();
}

export type SessionUser = {
  id: number;
  username: string;
  fullName: string;
  role: "admin" | "editor";
};

type UserRow = {
  id: number;
  username: string;
  full_name: string;
  role: "admin" | "editor";
};

/**
 * Issue a session and set the cookie.
 *
 * Called only after a password has actually been verified — this function
 * checks nothing itself.
 */
export async function createSession(userId: number): Promise<void> {
  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  const headerList = await headers();

  getDb()
    .prepare(
      `INSERT INTO sessions (id, user_id, created_at, expires_at, ip, user_agent)
     VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      hashToken(token),
      userId,
      nowIso(),
      expiresAt.toISOString(),
      clientIp(headerList),
      headerList.get("user-agent")?.slice(0, 300) ?? null,
    );

  getDb()
    .prepare("UPDATE users SET last_login_at = ? WHERE id = ?")
    .run(nowIso(), userId);

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    /*
      TLS terminates at the edge server and the hop inward is plain HTTP, so
      NODE_ENV is what decides this, not the protocol this process sees. In
      development over http://localhost a Secure cookie would simply never be
      stored and login would appear to silently fail.
    */
    secure: process.env.NODE_ENV === "production",
    /*
      Lax, not Strict: Strict would drop the cookie when an editor opens an
      admin link from an email or a chat message, which reads to them as being
      randomly logged out. Lax still blocks it on cross-site POSTs, which is
      the case that matters — and Server Actions verify Origin independently.
    */
    sameSite: "lax",
    path: cookiePath(),
    expires: expiresAt,
  });
}

/** Extract the client IP from the two proxy hops in front of this process. */
function clientIp(headerList: Headers): string {
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim().slice(0, 64);
  return headerList.get("x-real-ip")?.slice(0, 64) ?? "unknown";
}

/** The IP as the rate limiter and audit log should record it. */
export async function requestIp(): Promise<string> {
  return clientIp(await headers());
}

/**
 * The signed-in user, or null.
 *
 * `cache()` de-duplicates this within a single request — a layout, a page and
 * three Server Components asking "who is this?" run one query between them,
 * not five.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const row = getDb()
    .prepare(
      `SELECT u.id, u.username, u.full_name, u.role
         FROM sessions s
         JOIN users u ON u.id = s.user_id
        WHERE s.id = ?
          AND s.expires_at > ?
          AND u.is_active = 1`,
    )
    .get(hashToken(token), nowIso()) as UserRow | undefined;

  if (!row) return null;

  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    role: row.role,
  };
});

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;

  if (token) {
    getDb().prepare("DELETE FROM sessions WHERE id = ?").run(hashToken(token));
  }
  store.delete({ name: COOKIE_NAME, path: cookiePath() });
}

/** Log out every session belonging to a user — used when an account is disabled. */
export function destroyAllSessionsFor(userId: number): void {
  getDb().prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
}

/*
  Housekeeping.

  No cron, no background timer: this runs opportunistically from the login
  route, which is the one place guaranteed to be reached regularly and where
  a few milliseconds of DELETE cost nothing. A background interval in a
  Next.js process would run once per worker and keep the event loop alive.
*/
export function pruneExpired(): void {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  getDb().prepare("DELETE FROM sessions WHERE expires_at < ?").run(nowIso());
  getDb().prepare("DELETE FROM login_attempts WHERE at < ?").run(cutoff);
}
