import "server-only";

import {
  orgBranches,
  orgDirectUnits,
  orgHead,
  orgHeadIcon,
  orgNotes,
  orgOrder,
} from "@/content/structure";
import type { OrgBranch, OrgUnit } from "@/types/content";

/*
  Data access for the central apparatus structure.

  Async even though it reads a local module today — the same contract every
  other module in this folder keeps (see the note in privileges.ts).
*/

export interface OrgStructure {
  order: typeof orgOrder;
  head: string;
  headIcon: string;
  branches: OrgBranch[];
  /** Reporting straight to the director. */
  direct: OrgUnit[];
  notes: string[];
  /**
   * Shtat birliklari summed over the units that print one.
   *
   * DERIVED, never typed into markup — the rule the privilege chip counts
   * follow. It counts UNITS only: the director and the two deputies carry no
   * figure on the chart, so this is not the size of the apparatus and the UI
   * must not label it as such. Territorial administrations are excluded with
   * every other unit that has no number.
   */
  unitStaffTotal: number;
  /** Boxes that ARE the central apparatus — the external one excluded. */
  unitCount: number;
  /** Director plus the deputies: the boxes that carry no staff figure. */
  leadershipCount: number;
}

export async function getOrgStructure(): Promise<OrgStructure> {
  const all = [...orgBranches.flatMap((b) => b.units), ...orgDirectUnits];
  const internal = [
    ...orgBranches.flatMap((b) => b.units),
    ...orgDirectUnits.filter((u) => !u.external),
  ];

  return {
    order: orgOrder,
    head: orgHead,
    headIcon: orgHeadIcon,
    branches: orgBranches,
    direct: orgDirectUnits,
    notes: orgNotes,
    unitStaffTotal: all.reduce((sum, u) => sum + (u.staff ?? 0), 0),
    unitCount: internal.length,
    leadershipCount: 1 + orgBranches.length,
  };
}
