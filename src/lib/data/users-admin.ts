import "server-only";

import { getDb } from "@/lib/db";

/*
  Accounts, for the panel's user management.

  ┌──────────────────────────────────────────────────────────────────────────┐
  │ NO QUERY IN THIS FILE SELECTS password_hash.                             │
  │                                                                          │
  │ Not because a scrypt hash is dangerous to look at, but because these     │
  │ records are what the audit log stores as its `before` and `after`        │
  │ snapshots — and that log is rendered in a browser, for admins, and       │
  │ copied into support conversations. A hash has no business travelling     │
  │ through any of that.                                                     │
  │                                                                          │
  │ The one place that reads the column is the login action, which needs it  │
  │ to verify a password and nothing else.                                   │
  └──────────────────────────────────────────────────────────────────────────┘
*/

export type Role = "admin" | "editor";

export type UserRecord = {
  id: number;
  username: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
};

type Row = {
  id: number;
  username: string;
  full_name: string;
  role: Role;
  is_active: number;
  created_at: string;
  last_login_at: string | null;
};

function toRecord(row: Row): UserRecord {
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    role: row.role,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}

const COLUMNS =
  "id, username, full_name, role, is_active, created_at, last_login_at";

export function listUsers(): UserRecord[] {
  const rows = getDb()
    .prepare(
      `SELECT ${COLUMNS} FROM users
        ORDER BY
          /* Disabled accounts sink to the bottom; they are not the working set. */
          is_active DESC,
          CASE role WHEN 'admin' THEN 0 ELSE 1 END,
          username`,
    )
    .all() as Row[];
  return rows.map(toRecord);
}

export function getUser(id: number): UserRecord | undefined {
  const row = getDb()
    .prepare(`SELECT ${COLUMNS} FROM users WHERE id = ?`)
    .get(id) as Row | undefined;
  return row ? toRecord(row) : undefined;
}

export function usernameTaken(username: string, exceptId?: number): boolean {
  const row = getDb()
    .prepare("SELECT id FROM users WHERE username = ?")
    .get(username.toLowerCase()) as { id: number } | undefined;
  return row != null && row.id !== exceptId;
}

/**
 * How many active administrators there are apart from this one.
 *
 * The guard behind every destructive change to an admin account. Demoting,
 * disabling or deleting the last one leaves a panel nobody can get into, and
 * the only way back is shell access to the server — which is precisely the
 * situation the panel exists to avoid needing.
 */
export function otherActiveAdmins(exceptId: number): number {
  const row = getDb()
    .prepare(
      "SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND is_active = 1 AND id != ?",
    )
    .get(exceptId) as { n: number };
  return row.n;
}

/** Active sessions per user, so the list can show who is signed in now. */
export function activeSessionCounts(): Map<number, number> {
  const rows = getDb()
    .prepare(
      `SELECT user_id, COUNT(*) AS n FROM sessions
        WHERE expires_at > ? GROUP BY user_id`,
    )
    .all(new Date().toISOString()) as Array<{ user_id: number; n: number }>;
  return new Map(rows.map((r) => [r.user_id, r.n]));
}
