import "server-only";

import { getDb } from "@/lib/db";
import type { SessionUser } from "./session";

/*
  The audit log.

  WHY IT STORES WHOLE OBJECTS. The operator chose to make the statutory
  content — the 24 rent privileges with their `legalBasis` citations, the org
  chart from the director's order, the Markaz's establishment text and its
  statutory duties — editable from the admin panel. Those were previously only
  changeable through a reviewed git diff. This table is what replaces that
  review: keeping the complete `before` means a wrong edit to a legal citation
  can be READ BACK and restored exactly, not merely known to have happened.

  It is APPEND-ONLY by convention — nothing in this module updates or deletes
  a row, and nothing else may either. An audit log that the audited party can
  edit is decoration.
*/

export type AuditAction =
  | "login"
  | "login_failed"
  | "logout"
  | "create"
  | "update"
  | "delete"
  | "publish"
  | "unpublish"
  | "restore";

export type AuditEntity =
  | "session"
  | "user"
  | "news"
  | "page"
  | "menu"
  | "privilege"
  | "structure"
  | "about"
  | "duties"
  | "leadership"
  | "media";

type WriteAudit = {
  user: Pick<SessionUser, "id" | "username"> | { id: null; username: string };
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string | number | null;
  /** One line, in Uzbek, as it will read in the log view. */
  summary: string;
  before?: unknown;
  after?: unknown;
};

/**
 * Serialise a snapshot for storage.
 *
 * Returns null for `undefined` so "there was no previous value" (a create)
 * and "the previous value was null" stay distinguishable in the column.
 */
function snapshot(value: unknown): string | null {
  if (value === undefined) return null;
  try {
    return JSON.stringify(value);
  } catch {
    /*
      A value that cannot be serialised must not take the write down with it —
      the edit itself already succeeded by the time this runs. Record that the
      snapshot was lost rather than losing the whole audit entry.
    */
    return JSON.stringify({ __unserialisable: true });
  }
}

export function audit(entry: WriteAudit): void {
  getDb()
    .prepare(
      `INSERT INTO audit_log
       (at, user_id, username, action, entity, entity_id, summary, before_json, after_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      new Date().toISOString(),
      entry.user.id,
      entry.user.username,
      entry.action,
      entry.entity,
      entry.entityId != null ? String(entry.entityId) : null,
      entry.summary,
      snapshot(entry.before),
      snapshot(entry.after),
    );
}

export type AuditRow = {
  id: number;
  at: string;
  username: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string | null;
  summary: string;
  /**
   * Whether this entry carries a before/after snapshot.
   *
   * Computed in SQL as `before_json IS NOT NULL`, so the list can show which
   * rows are worth opening without loading every snapshot it will not
   * display — a page of 50 statutory edits is a lot of JSON to fetch in
   * order to render 50 one-line summaries.
   */
  hasSnapshot?: boolean;
};

/*
  The paged view.

  KEYSET, NOT OFFSET. `WHERE id < ?` rather than `OFFSET n`: the log is
  append-only and read newest-first, so a row inserted while someone is
  reading page 2 would shift everything down and make them see a row twice
  under OFFSET. Paging on the id they last saw is stable no matter what
  arrives in the meantime.

  Filters are optional and combine with AND. They are bound parameters, never
  interpolated — `entity` and `action` come from a <select> but arrive as
  request data like anything else.
*/
export function pagedAudit(options: {
  entity?: AuditEntity | "all";
  action?: AuditAction | "all";
  username?: string;
  /** Return rows older than this id — the previous page's last row. */
  before?: number;
  limit?: number;
}): { rows: AuditRow[]; hasMore: boolean } {
  const limit = options.limit ?? 50;
  const clauses: string[] = [];
  const params: Array<string | number> = [];

  if (options.entity && options.entity !== "all") {
    clauses.push("entity = ?");
    params.push(options.entity);
  }
  if (options.action && options.action !== "all") {
    clauses.push("action = ?");
    params.push(options.action);
  }
  if (options.username) {
    clauses.push("username = ?");
    params.push(options.username);
  }
  if (options.before) {
    clauses.push("id < ?");
    params.push(options.before);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  /*
    One row more than asked for, then dropped. That is how "is there a next
    page?" is answered without a second COUNT(*) over the whole table.
  */
  const rows = getDb()
    .prepare(
      `SELECT id, at, username, action, entity, entity_id, summary,
              before_json IS NOT NULL AS has_before,
              after_json  IS NOT NULL AS has_after
         FROM audit_log
         ${where}
        ORDER BY id DESC
        LIMIT ?`,
    )
    .all(...params, limit + 1) as Array<{
    id: number;
    at: string;
    username: string;
    action: AuditAction;
    entity: AuditEntity;
    entity_id: string | null;
    summary: string;
    has_before: number;
    has_after: number;
  }>;

  const hasMore = rows.length > limit;

  return {
    rows: rows.slice(0, limit).map((row) => ({
      id: row.id,
      at: row.at,
      username: row.username,
      action: row.action,
      entity: row.entity,
      entityId: row.entity_id,
      summary: row.summary,
      hasSnapshot: row.has_before === 1 || row.has_after === 1,
    })),
    hasMore,
  };
}

/** Everyone who has ever appeared in the log — for the filter dropdown. */
export function auditUsernames(): string[] {
  const rows = getDb()
    .prepare("SELECT DISTINCT username FROM audit_log ORDER BY username")
    .all() as Array<{ username: string }>;
  return rows.map((r) => r.username);
}

/**
 * One entry with its full before/after snapshots.
 *
 * This is the function that makes editable statutory text defensible: it is
 * how a wrong edit to a `legalBasis` citation is read back and restored,
 * rather than merely known to have happened.
 */
export function auditEntry(
  id: number,
): (AuditRow & { before: unknown; after: unknown }) | undefined {
  const row = getDb()
    .prepare(
      `SELECT id, at, username, action, entity, entity_id, summary,
              before_json, after_json
         FROM audit_log WHERE id = ?`,
    )
    .get(id) as
    | {
        id: number;
        at: string;
        username: string;
        action: AuditAction;
        entity: AuditEntity;
        entity_id: string | null;
        summary: string;
        before_json: string | null;
        after_json: string | null;
      }
    | undefined;

  if (!row) return undefined;

  /*
    Parsed defensively. A snapshot that cannot be read must not take down the
    page that is showing it — the rest of the entry (who, when, what) is
    still the useful part, and is exactly what someone reading a corrupted
    row needs to see.
  */
  const parse = (json: string | null): unknown => {
    if (!json) return null;
    try {
      return JSON.parse(json);
    } catch {
      return { __unreadable: true };
    }
  };

  return {
    id: row.id,
    at: row.at,
    username: row.username,
    action: row.action,
    entity: row.entity,
    entityId: row.entity_id,
    summary: row.summary,
    hasSnapshot: row.before_json !== null || row.after_json !== null,
    before: parse(row.before_json),
    after: parse(row.after_json),
  };
}

export function recentAudit(limit = 50): AuditRow[] {
  const rows = getDb()
    .prepare(
      `SELECT id, at, username, action, entity, entity_id, summary
         FROM audit_log
        ORDER BY at DESC, id DESC
        LIMIT ?`,
    )
    .all(limit) as Array<{
    id: number;
    at: string;
    username: string;
    action: AuditAction;
    entity: AuditEntity;
    entity_id: string | null;
    summary: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    at: row.at,
    username: row.username,
    action: row.action,
    entity: row.entity,
    entityId: row.entity_id,
    summary: row.summary,
  }));
}
