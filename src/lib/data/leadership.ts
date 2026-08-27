import { orgHead, orgBranches } from "@/content/structure";
import workersData from "@/content/workers.json";

/*
  Rahbariyat — the public read side.

  The three ROLES are fixed by src/content/structure.ts and never queried
  from the database — see migration 10's own note for why. The PERSON
  holding each one is code too, in src/content/workers.json, alongside every
  department head from markaziy-apparat — the operator asked for the two to
  share one file ("leadershipdagi datani workers dataga o'tkazish kerak",
  2026-08-27). "director" / "first-deputy" / "deputy" are that file's three
  reserved keys; they never collide with a unit id (see lib/data/workers.ts)
  because org units and org roles are named from separate id spaces in
  structure.ts.

  /admin/rahbariyat (the form, its Server Action, the `leadership` table)
  still exists and still writes to the database, but nothing here reads
  that table anymore — editing a member there no longer changes what the
  public page shows. That mismatch is real and not yet resolved; the
  admin-panel side is frozen until the operator says otherwise (see the
  session's own standing instruction), so update src/content/workers.json
  by hand for now.

  This module's public API (LEADERSHIP_ROLES, LeadershipMember, getLeadership,
  LEADERSHIP_EMAIL) is kept stable on purpose: the admin-panel files above
  still import from here, and the freeze means they are not being touched to
  point at lib/data/workers.ts instead.
*/

export type LeadershipRole = {
  roleId: string;
  title: string;
};

/** The three roles, in the org chart's own order: director, then the deputies. */
export const LEADERSHIP_ROLES: LeadershipRole[] = [
  { roleId: "director", title: orgHead },
  ...orgBranches.map((branch) => ({ roleId: branch.id, title: branch.title })),
];

export type LeadershipMember = LeadershipRole & {
  fullName: string;
  photo: string | null;
  phone: string | null;
  receptionHours: string | null;
};

type WorkerEntry = {
  fullName: string;
  position?: string | null;
  phone?: string | null;
  receptionHours?: string | null;
  photo?: string | null;
};

const DATA = workersData as Record<string, WorkerEntry>;

/**
 * Everyone with a name on record, in role order.
 *
 * A role with no entry (or an empty name) in workers.json is left out
 * entirely rather than shown as a half-empty card — the same rule an empty
 * menu or an unwritten page follows elsewhere on this site: normal and
 * temporary, not something to surface to a citizen as broken.
 */
export async function getLeadership(): Promise<LeadershipMember[]> {
  return LEADERSHIP_ROLES.filter((role) =>
    DATA[role.roleId]?.fullName?.trim(),
  ).map((role) => {
    const entry = DATA[role.roleId]!;
    return {
      ...role,
      fullName: entry.fullName,
      photo: entry.photo ?? null,
      phone: entry.phone ?? null,
      receptionHours: entry.receptionHours ?? null,
    };
  });
}

/*
  The reception mailbox — the operator's own supply, distinct from
  `site.contacts.email` ("info@davijara.uz"), which is the site's general
  contact address. This one is specific to reaching the leadership /
  reporting corruption, and it is the same address the anti-corruption
  disclosure page cites (src/content/anticorruption.ts) — kept as one literal
  here rather than re-typed, so the two pages can never quietly disagree.
*/
export const LEADERSHIP_EMAIL = "markaz@davaktiv.uz";
