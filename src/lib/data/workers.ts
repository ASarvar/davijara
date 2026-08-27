import { orgDirectUnits, orgBranches } from "@/content/structure";
import workersData from "@/content/workers.json";
import { LEADERSHIP_EMAIL } from "./leadership";

/*
  Markaziy apparat — the public read side, same shape as leadership.ts.

  The UNIT names and their reporting order are structure.ts's own — that
  file is the verbatim transcription of the director's order and stays code
  (CLAUDE.md's one deliberate exception). Who currently heads each unit
  (name, position, phone, photo) is src/content/workers.json — code as well,
  not the database: the operator asked for this the same way leadership's
  fields were moved out (2026-08-27, "shu leadershipni workersga
  o'zgartirib yangilaymiz").

  Source for the current names/positions/phones/photos was the operator's
  own reference build of the predecessor site (localhost:3008/departments) —
  NOT the dead obyekt.uz production instance (see the "legacy site is dead"
  note elsewhere); this was a locally running copy the operator pointed at.
  Its per-department e-mail addresses were all on the dead @obyekt.uz domain
  and were deliberately NOT copied — the operator chose the same shared,
  working reception mailbox the leadership page uses instead.

  Territorial administrations (`hududiy`) is excluded — the chart itself
  draws it as external to the central apparatus (dashed box), and it has its
  own page (/markaz/hududiy-boshqarmalar).
*/

export type WorkerRole = {
  unitId: string;
  unitName: string;
};

/** Every headed unit, in the chart's own reading order (see structure.ts). */
export const WORKER_ROLES: WorkerRole[] = [
  ...orgDirectUnits
    .filter((unit) => !unit.external)
    .map((unit) => ({ unitId: unit.id, unitName: unit.name })),
  ...orgBranches.flatMap((branch) =>
    branch.units.map((unit) => ({ unitId: unit.id, unitName: unit.name })),
  ),
];

export type Worker = WorkerRole & {
  fullName: string;
  position: string;
  phone: string | null;
  photo: string | null;
};

/*
  workers.json also holds the three leadership entries ("director",
  "first-deputy", "deputy" — see leadership.ts) since the two share one
  file. Those have no `position` (their unit name from structure.ts already
  reads as one) and carry fields — `receptionHours`, `appeals` — this module
  never looks at. `position`/`phone`/`photo` are therefore typed optional
  here purely so the JSON's whole shape casts cleanly; WORKER_ROLES itself
  never resolves to a leadership key, so a department entry's `position` is
  always actually present at runtime.
*/
type WorkerEntry = {
  fullName: string;
  position?: string;
  phone?: string | null;
  photo?: string | null;
};

const DATA = workersData as Record<string, WorkerEntry>;

/**
 * Every unit with a name on record, in the chart's reading order.
 *
 * A unit missing from workers.json (currently just "Ichki audit", which the
 * source reference had no card for) is left out entirely rather than shown
 * half-empty — the same rule leadership.ts follows.
 */
export async function getWorkers(): Promise<Worker[]> {
  return WORKER_ROLES.filter((role) =>
    DATA[role.unitId]?.fullName?.trim(),
  ).map((role) => {
    const entry = DATA[role.unitId]!;
    return {
      ...role,
      fullName: entry.fullName,
      position: entry.position ?? "",
      phone: entry.phone ?? null,
      photo: entry.photo ?? null,
    };
  });
}

/** Same shared reception mailbox as the leadership page — the operator's choice. */
export const WORKERS_EMAIL = LEADERSHIP_EMAIL;
