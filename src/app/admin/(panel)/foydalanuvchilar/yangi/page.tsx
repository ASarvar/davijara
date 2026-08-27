import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { requireAdmin } from "@/lib/auth/guard";
import { UserForm } from "../user-form";

export const metadata: Metadata = { title: "Yangi foydalanuvchi" };
export const dynamic = "force-dynamic";

export default async function NewUserPage() {
  await requireAdmin();

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
        <h1 className="font-heading mt-2 text-2xl font-semibold">
          Yangi foydalanuvchi
        </h1>
        <p className="text-muted-foreground mt-1 text-sm text-pretty">
          Yangi hisob faol holda yaratiladi. Parol koʻrsatilmasa, kuchli parol
          avtomatik yaratilib bir marta koʻrsatiladi.
        </p>
      </div>

      {/*
        Editor by default. The role that can do less is the safer thing to
        create by accident, and an admin who needs an admin will say so.
      */}
      <UserForm
        values={{
          username: "",
          fullName: "",
          role: "editor",
          isActive: true,
          isSelf: false,
        }}
      />
    </div>
  );
}
