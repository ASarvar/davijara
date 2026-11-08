import "server-only";

import { getDb } from "@/lib/db";
import { localizeContent } from "@/lib/i18n/content";
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

  TRANSLATED ON READ, not in the table: there is no translations table for
  privileges. /ru shows the translators' Russian from the workbook through
  lib/i18n/content.ts, keyed by the Uzbek text, so a privilege an editor
  rewrites shows in Uzbek until it is translated again. The operator chose
  on 08.11.2026 to publish that Russian as it came back, legalBasis
  included and with no disclaimer; see the note in lib/i18n/content.ts.
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

/** The categories, labelled in the reader's language. */
export async function getPrivilegeCategories(locale?: string) {
  return localizeContent(PRIVILEGE_CATEGORIES, locale);
}

export function isPrivilegeCategory(v: string): v is PrivilegeCategory {
  return PRIVILEGE_CATEGORIES.some((c) => c.value === v);
}

export async function getPrivileges(locale?: string): Promise<Privilege[]> {
  const rows = getDb()
    .prepare(
      `SELECT category, tag, title, description, subject, duration, legal_basis
         FROM privileges
        ORDER BY position, id`,
    )
    .all() as Row[];
  return localizeContent(rows.map(toPrivilege), locale);
}

export async function getPrivilegesByCategory(
  category: PrivilegeCategory | "barchasi",
  locale?: string,
): Promise<Privilege[]> {
  // Filtered first, so only the privileges shown are translated.
  const all = await getPrivileges();
  return localizeContent(
    category === "barchasi" ? all : all.filter((p) => p.category === category),
    locale,
  );
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
