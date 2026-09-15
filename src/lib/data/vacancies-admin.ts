import "server-only";

import { getDb } from "@/lib/db";
import { parseBlocks, type Block } from "@/types/blocks";

/*
  The panel's view of the vacancy store.

  Separate from lib/data/vacancies.ts for the reason news-admin.ts is separate
  from news.ts: every public query hard-codes `status = 'open'`, and this
  module — which does not — is imported by nothing public.
*/

export type VacancyStatus = "open" | "closed";

export type VacancyRecord = {
  id: number;
  status: VacancyStatus;
  title: string;
  unit: string;
  deadline: string | null;
  testDate: string | null;
  email: string;
  blocks: Block[];
  updatedAt: string;
  updatedBy: string | null;
};

type Row = {
  id: number;
  status: VacancyStatus;
  title: string;
  unit: string;
  deadline: string | null;
  test_date: string | null;
  email: string;
  blocks: string;
  updated_at: string;
  updated_by: string | null;
};

/* A row that has never been edited has only its creation stamp. */
const SELECT = `
  SELECT v.id, v.status, v.title, v.unit, v.deadline, v.test_date, v.email,
         v.blocks,
         COALESCE(v.updated_at, v.created_at) AS updated_at,
         u.full_name AS updated_by
    FROM vacancies v
    LEFT JOIN users u ON u.id = COALESCE(v.updated_by, v.created_by)`;

function toRecord(row: Row): VacancyRecord {
  return {
    id: row.id,
    status: row.status,
    title: row.title,
    unit: row.unit,
    deadline: row.deadline,
    testDate: row.test_date,
    email: row.email,
    blocks: parseBlocks(row.blocks),
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

/** Open first — they are what the site is showing — then newest. */
export function listVacanciesAdmin(): VacancyRecord[] {
  const rows = getDb()
    .prepare(
      `${SELECT}
       ORDER BY CASE v.status WHEN 'open' THEN 0 ELSE 1 END, v.id DESC`,
    )
    .all() as Row[];
  return rows.map(toRecord);
}

export function getVacancyRecord(id: number): VacancyRecord | undefined {
  const row = getDb().prepare(`${SELECT} WHERE v.id = ?`).get(id) as
    Row | undefined;
  return row ? toRecord(row) : undefined;
}
