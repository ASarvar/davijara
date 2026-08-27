import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/guard";
import { getUser, otherActiveAdmins } from "@/lib/data/users-admin";
import { deleteUserAction } from "../actions";
import { ResetPassword } from "../reset-password";
import { UserForm } from "../user-form";

export const metadata: Metadata = { title: "Foydalanuvchi" };
export const dynamic = "force-dynamic";

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireAdmin();

  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) notFound();

  const user = getUser(numericId);
  if (!user) notFound();

  const isSelf = user.id === actor.id;
  /*
    The same test the action performs. Hiding a button an editor cannot use
    is courtesy; the action refusing the request is the actual rule — see the
    note at the top of ../actions.ts.
  */
  const isLastAdmin =
    user.role === "admin" && user.isActive && otherActiveAdmins(user.id) === 0;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/foydalanuvchilar"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
        >
          <ChevronLeft className="size-4" />
          Foydalanuvchilar
        </Link>
        <h1 className="font-heading mt-2 text-2xl font-semibold text-pretty">
          {user.fullName}
        </h1>
        <p className="text-muted-foreground mt-1 font-mono text-xs">
          {user.username} · yaratilgan {user.createdAt.slice(0, 10)}
        </p>
      </div>

      {isLastAdmin ? (
        <p className="border-hairline bg-secondary rounded-lg border px-4 py-3 text-sm text-pretty">
          Bu — yagona faol administrator. Uni oʻchirish, oʻchirib qoʻyish yoki
          muharrirlikka tushirish mumkin emas: aks holda panelga hech kim kira
          olmay qoladi.
        </p>
      ) : null}

      <UserForm
        values={{
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          isActive: user.isActive,
          isSelf,
        }}
      />

      {!isSelf ? (
        <div className="border-hairline max-w-lg border-t pt-6">
          <h2 className="mb-3 text-sm font-semibold">Parolni tiklash</h2>
          <ResetPassword userId={user.id} />
        </div>
      ) : null}

      {!isSelf && !isLastAdmin ? (
        <div className="border-hairline max-w-lg border-t pt-6">
          <p className="text-muted-foreground mb-3 text-sm text-pretty">
            Hisobni butunlay oʻchirish. Bu odam bajargan ishlar audit jurnalida
            oʻz nomi bilan saqlanib qoladi — tarix oʻzgarmaydi. Vaqtincha
            kirishni toʻxtatish uchun yuqoridagi &laquo;Faol hisob&raquo;
            belgisini olib tashlang.
          </p>
          <form action={deleteUserAction}>
            <input type="hidden" name="id" value={user.id} />
            <Button type="submit" variant="destructive" size="sm">
              <Trash2 />
              Hisobni oʻchirish
            </Button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
