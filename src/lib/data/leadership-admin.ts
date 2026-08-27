import "server-only";

import { getDb } from "@/lib/db";
import { LEADERSHIP_ROLES, type LeadershipMember } from "./leadership";

/*
  Rahbariyat — the panel's write side.

  Three fixed slots, never a CRUD list — see migration 10's note on why the
  roles themselves are not something this module can add to or remove from.
*/

type Row = {
  role_id: string;
  full_name: string;
  photo: string | null;
  phone: string | null;
  reception_hours: string | null;
};

/** All three roles for the admin form, filled in or not. */
export function listLeadershipAdmin(): LeadershipMember[] {
  const rows = getDb()
    .prepare(
      "SELECT role_id, full_name, photo, phone, reception_hours FROM leadership",
    )
    .all() as Row[];

  const byRole = new Map(rows.map((row) => [row.role_id, row]));

  return LEADERSHIP_ROLES.map((role) => {
    const row = byRole.get(role.roleId);
    return {
      ...role,
      fullName: row?.full_name ?? "",
      photo: row?.photo ?? null,
      phone: row?.phone ?? null,
      receptionHours: row?.reception_hours ?? null,
    };
  });
}

export function getLeadershipMember(roleId: string): LeadershipMember | undefined {
  const role = LEADERSHIP_ROLES.find((r) => r.roleId === roleId);
  if (!role) return undefined;

  const row = getDb()
    .prepare(
      "SELECT role_id, full_name, photo, phone, reception_hours FROM leadership WHERE role_id = ?",
    )
    .get(roleId) as Row | undefined;

  return {
    ...role,
    fullName: row?.full_name ?? "",
    photo: row?.photo ?? null,
    phone: row?.phone ?? null,
    receptionHours: row?.reception_hours ?? null,
  };
}

export function saveLeadershipMember(
  roleId: string,
  data: {
    fullName: string;
    photo: string | null;
    phone: string | null;
    receptionHours: string | null;
  },
  userId: number,
): void {
  getDb()
    .prepare(
      `INSERT INTO leadership (role_id, full_name, photo, phone, reception_hours, updated_at, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(role_id) DO UPDATE SET
         full_name = excluded.full_name,
         photo = excluded.photo,
         phone = excluded.phone,
         reception_hours = excluded.reception_hours,
         updated_at = excluded.updated_at,
         updated_by = excluded.updated_by`,
    )
    .run(
      roleId,
      data.fullName,
      data.photo,
      data.phone,
      data.receptionHours,
      new Date().toISOString(),
      userId,
    );
}
