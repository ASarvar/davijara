"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { audit } from "@/lib/auth/audit";
import { NotAuthorisedError, requireUserForAction } from "@/lib/auth/guard";
import {
  getLeadershipMember,
  saveLeadershipMember,
} from "@/lib/data/leadership-admin";
import { LEADERSHIP_ROLES } from "@/lib/data/leadership";
import { routing } from "@/i18n/routing";

export type LeadershipFormState = { error?: string; ok?: string };

/*
  roleId is validated against the fixed, code-owned list rather than trusted
  from the form — the same defence-in-depth every action on this site
  applies to a hidden field, and the reason `leadership.role_id` can never
  hold a fourth value no matter what a request posts.
*/
const roleIdSchema = z.enum(
  LEADERSHIP_ROLES.map((r) => r.roleId) as [string, ...string[]],
);

const saveSchema = z.object({
  roleId: roleIdSchema,
  fullName: z.string().trim().min(1, "Ism familiyani kiriting.").max(200),
  photo: z.string().trim().max(500).optional().default(""),
  phone: z.string().trim().max(60).optional().default(""),
  receptionHours: z.string().trim().max(200).optional().default(""),
});

export async function saveLeadershipAction(
  _prev: LeadershipFormState,
  formData: FormData,
): Promise<LeadershipFormState> {
  let user;
  try {
    user = await requireUserForAction();
  } catch (error) {
    if (error instanceof NotAuthorisedError) return { error: error.message };
    throw error;
  }

  const parsed = saveSchema.safeParse({
    roleId: formData.get("roleId"),
    fullName: formData.get("fullName") ?? "",
    photo: formData.get("photo") ?? "",
    phone: formData.get("phone") ?? "",
    receptionHours: formData.get("receptionHours") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Maʼlumotlar notoʻgʻri." };
  }

  const { roleId, fullName, photo, phone, receptionHours } = parsed.data;
  const role = LEADERSHIP_ROLES.find((r) => r.roleId === roleId)!;

  const before = getLeadershipMember(roleId);

  saveLeadershipMember(
    roleId,
    {
      fullName,
      photo: photo || null,
      phone: phone || null,
      receptionHours: receptionHours || null,
    },
    user.id,
  );

  const after = getLeadershipMember(roleId);

  audit({
    user,
    action: "update",
    entity: "leadership",
    entityId: roleId,
    summary: `Rahbariyat yangilandi: ${role.title} — ${fullName}`,
    before,
    after,
  });

  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/markaz/qabul-kunlari`);
  }

  return { ok: "Saqlandi." };
}
