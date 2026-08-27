import "server-only";

import { getDb } from "@/lib/db";
import {
  DOCUMENT_SCHEMAS,
  type AboutDocument,
  type DocumentKey,
  type DutiesDocument,
} from "@/types/documents";

/*
  Read and write for the two statutory documents.

  ┌──────────────────────────────────────────────────────────────────────────┐
  │ VALIDATED ON THE WAY OUT, NOT JUST ON THE WAY IN.                        │
  │                                                                          │
  │ The editor validates before it saves, so in normal operation the column  │
  │ always holds a valid document. But "normal operation" is not the only    │
  │ way bytes get into a database: a restored backup from an older schema, a │
  │ hand-run UPDATE during an incident, a half-applied migration. Any of      │
  │ those reaches a PUBLIC page, and the failure mode of trusting the column │
  │ is `Cannot read properties of undefined` on /markaz — a 500 on a         │
  │ government portal, not a missing paragraph.                              │
  │                                                                          │
  │ So a row that does not parse is treated as absent, and the caller falls  │
  │ back to the seed. See `readDocument`.                                     │
  └──────────────────────────────────────────────────────────────────────────┘
*/

type Row = { data: string; updated_at: string | null };

function readDocument<K extends DocumentKey>(
  key: K,
): { value: unknown; updatedAt: string | null } | undefined {
  const row = getDb()
    .prepare("SELECT data, updated_at FROM documents WHERE key = ?")
    .get(key) as Row | undefined;

  if (!row) return undefined;

  try {
    const parsed = DOCUMENT_SCHEMAS[key].safeParse(JSON.parse(row.data));
    if (!parsed.success) return undefined;
    return { value: parsed.data, updatedAt: row.updated_at };
  } catch {
    return undefined;
  }
}

export function getAboutDocument(): AboutDocument | undefined {
  return readDocument("about")?.value as AboutDocument | undefined;
}

export function getDutiesDocument(): DutiesDocument | undefined {
  return readDocument("duties")?.value as DutiesDocument | undefined;
}

/** When the document was last changed, for the panel. */
export function documentUpdatedAt(key: DocumentKey): string | null {
  return readDocument(key)?.updatedAt ?? null;
}

/**
 * Replace a document wholesale.
 *
 * `data` must already have been validated by the caller against the matching
 * schema — the action does that, so a rejected save never reaches here. The
 * row is upserted rather than updated, because a database restored from
 * before migration 6 would have no row to update and the write would silently
 * affect nothing.
 */
export function writeDocument(
  key: DocumentKey,
  data: unknown,
  userId: number,
): void {
  getDb()
    .prepare(
      `INSERT INTO documents (key, data, updated_at, updated_by)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         data = excluded.data,
         updated_at = excluded.updated_at,
         updated_by = excluded.updated_by`,
    )
    .run(key, JSON.stringify(data), new Date().toISOString(), userId);
}
