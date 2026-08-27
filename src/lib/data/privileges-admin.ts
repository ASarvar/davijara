import "server-only";

import { getDb } from "@/lib/db";
import type { PrivilegeCategory } from "@/types/content";

/*
  The panel's view of the statutory privileges.

  Unlike news and pages, there is no draft state and no publish step: a
  privilege exists in law or it does not, and there is no editorial moment
  between writing it down and it being true. Saving publishes.

  What replaces the publish gate is the audit log — every change here writes a
  complete before/after snapshot, which is what makes a mistyped citation
  recoverable rather than merely regrettable. See migration 5.
*/

export type PrivilegeRecord = {
  /** Stable primary key. NOT the number shown on the public badge. */
  id: number;
  position: number;
  category: PrivilegeCategory;
  tag: string;
  title: string;
  description: string;
  subject: string;
  duration: string;
  legalBasis: string;
  updatedAt: string | null;
  updatedBy: string | null;
};

type Row = {
  id: number;
  position: number;
  category: PrivilegeCategory;
  tag: string;
  title: string;
  description: string;
  subject: string;
  duration: string;
  legal_basis: string;
  updated_at: string | null;
  updated_by: string | null;
};

function toRecord(row: Row): PrivilegeRecord {
  return {
    id: row.id,
    position: row.position,
    category: row.category,
    tag: row.tag,
    title: row.title,
    description: row.description,
    subject: row.subject,
    duration: row.duration,
    legalBasis: row.legal_basis,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

const SELECT = `
  SELECT p.id, p.position, p.category, p.tag, p.title, p.description,
         p.subject, p.duration, p.legal_basis, p.updated_at,
         u.full_name AS updated_by
    FROM privileges p
    LEFT JOIN users u ON u.id = p.updated_by
`;

export function listPrivileges(): PrivilegeRecord[] {
  const rows = getDb()
    .prepare(`${SELECT} ORDER BY p.position, p.id`)
    .all() as Row[];
  return rows.map(toRecord);
}

export function getPrivilege(id: number): PrivilegeRecord | undefined {
  const row = getDb().prepare(`${SELECT} WHERE p.id = ?`).get(id) as
    Row | undefined;
  return row ? toRecord(row) : undefined;
}

/** Next free position, for a newly added privilege. */
export function nextPrivilegePosition(): number {
  const row = getDb()
    .prepare("SELECT COALESCE(MAX(position), 0) AS n FROM privileges")
    .get() as { n: number };
  return row.n + 1;
}

/**
 * Move one privilege up or down in the list.
 *
 * Implemented as a SWAP of two positions rather than a renumbering of the
 * whole table: it touches two rows instead of 24, and it cannot leave a gap
 * or a duplicate if it fails halfway. Returns the neighbour it swapped with,
 * or undefined when the row is already at the end it was asked to move
 * towards — which the caller treats as "nothing to do", not an error.
 */
export function swapPrivilegePosition(
  id: number,
  direction: "up" | "down",
): { moved: PrivilegeRecord; neighbour: PrivilegeRecord } | undefined {
  const db = getDb();
  const current = getPrivilege(id);
  if (!current) return undefined;

  const neighbourRow = db
    .prepare(
      direction === "up"
        ? `${SELECT} WHERE p.position < ? ORDER BY p.position DESC LIMIT 1`
        : `${SELECT} WHERE p.position > ? ORDER BY p.position ASC LIMIT 1`,
    )
    .get(current.position) as Row | undefined;

  if (!neighbourRow) return undefined;
  const neighbour = toRecord(neighbourRow);

  db.transaction(() => {
    const update = db.prepare(
      "UPDATE privileges SET position = ? WHERE id = ?",
    );
    update.run(neighbour.position, current.id);
    update.run(current.position, neighbour.id);
  })();

  return { moved: current, neighbour };
}
