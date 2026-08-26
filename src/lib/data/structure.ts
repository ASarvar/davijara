import "server-only";

import {
  orgBranches,
  orgDirectUnits,
  orgHead,
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
  branches: OrgBranch[];
  /** Reporting straight to the director. */
  direct: OrgUnit[];
}

export async function getOrgStructure(): Promise<OrgStructure> {
  return {
    order: orgOrder,
    head: orgHead,
    branches: orgBranches,
    direct: orgDirectUnits,
  };
}
