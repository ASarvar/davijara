import "server-only";

import { getDb } from "@/lib/db";
import type { Privilege, PrivilegeCategory } from "@/types/content";

/*
  Data access for statutory privileges — now backed by the admin panel.

  These functions were always async against the day they would not read a
  local module, and this is that day: migration 5 copied all 24 records out of
  src/content/privileges.ts into the database, once. Not one call site
  changed. That module stays on disk as the seed's source and nothing reads it
  at runtime.

  ┌──────────────────────────────────────────────────────────────────────────┐
  │ THE BADGE NUMBER IS COMPUTED HERE, NOT STORED.                           │
  │                                                                          │
  │ `Privilege.id` is what the public list prints as 01, 02, 03 — and it     │
  │ used to be the record's own identifier. Now that a record can be         │
  │ deleted, keeping that link would leave the list reading …06, 08…, which  │
  │ looks to a citizen like a privilege that has been quietly removed rather │
  │ than a list that renumbered.                                             │
  │                                                                          │
  │ So the row's real primary key never leaves this module: `id` on the      │
  │ returned object is the 1-based position in the ordered list. The three   │
  │ places the UI uses it — React key, accordion value, badge — all want     │
  │ exactly that, so no component needed touching for this either.           │
  └──────────────────────────────────────────────────────────────────────────┘

  NOT TRANSLATED, in any locale. See the note on the table in migrate.ts:
  a machine-translated `legalBasis` is a citation to a document that does not
  exist under that name.
*/

type Row = {
  category: PrivilegeCategory;
  tag: string;
  title: string;
  description: string;
  subject: string;
  duration: string;
  legal_basis: string;
};

function toPrivilege(row: Row, index: number): Privilege {
  return {
    id: index + 1,
    category: row.category,
    tag: row.tag,
    title: row.title,
    description: row.description,
    subject: row.subject,
    duration: row.duration,
    legalBasis: row.legal_basis,
  };
}

/** Filter chip labels. Order matters — it is the display order. */
export const PRIVILEGE_CATEGORIES: Array<{
  value: PrivilegeCategory;
  label: string;
}> = [
  { value: "ijtimoiy", label: "Ijtimoiy himoya" },
  { value: "talim", label: "Ta'lim muassasalari" },
  { value: "it", label: "IT va innovatsiya" },
  { value: "boshqa", label: "Sport, hunarmandchilik va hudud" },
];

export function isPrivilegeCategory(v: string): v is PrivilegeCategory {
  return PRIVILEGE_CATEGORIES.some((c) => c.value === v);
}

export async function getPrivileges(): Promise<Privilege[]> {
  const rows = getDb()
    .prepare(
      `SELECT category, tag, title, description, subject, duration, legal_basis
         FROM privileges
        ORDER BY position, id`,
    )
    .all() as Row[];
  return rows.map(toPrivilege);
}

export async function getPrivilegesByCategory(
  category: PrivilegeCategory | "barchasi",
): Promise<Privilege[]> {
  const all = await getPrivileges();
  return category === "barchasi"
    ? all
    : all.filter((p) => p.category === category);
}

/**
 * Counts shown on the filter chips.
 *
 * Derived rather than hardcoded — the legacy page had "(24)", "(8)", "(4)",
 * "(3)", "(9)" typed into the markup by hand, which would silently go stale
 * the moment a record was added. (They did happen to be correct.)
 */
export async function getPrivilegeCounts(): Promise<
  Record<PrivilegeCategory | "barchasi", number>
> {
  const all = await getPrivileges();
  const counts = {
    barchasi: all.length,
    ijtimoiy: 0,
    talim: 0,
    it: 0,
    boshqa: 0,
  } as Record<PrivilegeCategory | "barchasi", number>;

  for (const p of all) counts[p.category] += 1;
  return counts;
}
