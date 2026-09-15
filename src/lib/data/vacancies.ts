import { vacancyInfo, type VacancyInfo } from "@/content/vacancies";
import { getDb } from "@/lib/db";
import { tashkentToday } from "@/lib/format";
import { parseBlocks, type Block } from "@/types/blocks";

export type { VacancyInfo, VacancyTableRow } from "@/content/vacancies";

export async function getVacancyInfo(): Promise<VacancyInfo> {
  return vacancyInfo;
}

/** One open announcement, as the public page renders it. */
export type Vacancy = {
  id: number;
  title: string;
  unit: string;
  /** Last day documents are accepted (Tashkent, YYYY-MM-DD), if one is set. */
  deadline: string | null;
  testDate: string | null;
  email: string;
  blocks: Block[];
  /** Derived: the deadline is behind us but nobody has closed it yet. */
  expired: boolean;
};

type Row = {
  id: number;
  title: string;
  unit: string;
  deadline: string | null;
  test_date: string | null;
  email: string;
  blocks: string;
};

/**
 * Every OPEN vacancy, soonest deadline first — or null if the store can't be
 * read.
 *
 * `status = 'open'` is written into the query, and this module has no
 * unfiltered read: the same safety property lib/data/news.ts keeps for
 * drafts. A closed announcement cannot reach the public page through a call
 * site that forgot to filter; the panel reads through vacancies-admin.ts.
 *
 * NULL, NOT [], ON FAILURE. An empty list renders "no open vacancies", which
 * is a statement about the Markaz, and a database that cannot be read is no
 * evidence for it. The page renders nothing in that case rather than
 * something untrue.
 */
export async function getOpenVacancies(): Promise<Vacancy[] | null> {
  let rows: Row[];
  try {
    rows = getDb()
      .prepare(
        `SELECT id, title, unit, deadline, test_date, email, blocks
           FROM vacancies
          WHERE status = 'open'
          ORDER BY deadline IS NULL, deadline, id DESC`,
      )
      .all() as Row[];
  } catch (error) {
    console.error("[vacancies] read failed", error);
    return null;
  }

  const today = tashkentToday();
  return (
    rows
      .map((row) => ({
        id: row.id,
        title: row.title,
        unit: row.unit,
        deadline: row.deadline,
        testDate: row.test_date,
        email: row.email,
        blocks: parseBlocks(row.blocks),
        expired: row.deadline !== null && row.deadline < today,
      }))
      /*
        Still-running competitions ahead of ones whose deadline has passed
        but which nobody has closed yet. `sort` is stable, so each group keeps
        the query's soonest-deadline-first order.
      */
      .sort((a, b) => Number(a.expired) - Number(b.expired))
  );
}
