import "server-only";

import { privileges } from "@/content/privileges";
import type { Privilege, PrivilegeCategory } from "@/types/content";

/*
  Data access for statutory privileges.

  These functions are async even though they currently read a local module.
  That is deliberate: when the real API arrives, only the bodies here change —
  every call site already awaits, so no component needs touching.
*/

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
  return privileges;
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
