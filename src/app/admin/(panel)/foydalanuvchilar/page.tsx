import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/guard";
import { activeSessionCounts, listUsers } from "@/lib/data/users-admin";

export const metadata: Metadata = { title: "Foydalanuvchilar" };
export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const actor = await requireAdmin();
  const users = listUsers();
  const sessions = activeSessionCounts();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">
            Foydalanuvchilar
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {users.filter((u) => u.isActive).length} ta faol,{" "}
            {users.filter((u) => !u.isActive).length} ta oʻchirilgan
          </p>
        </div>
        <Button asChild size="lg" className="ml-auto">
          <Link href="/admin/foydalanuvchilar/yangi">
            <Plus />
            Yangi foydalanuvchi
          </Link>
        </Button>
      </div>

      <ul className="border-hairline divide-hairline divide-y rounded-lg border">
        {users.map((user) => (
          <li key={user.id}>
            <Link
              href={`/admin/foydalanuvchilar/${user.id}`}
              className="hover:bg-muted flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 transition-colors"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">
                  {user.fullName}
                  {user.id === actor.id ? (
                    <span className="text-muted-foreground ml-2 text-xs font-normal">
                      (siz)
                    </span>
                  ) : null}
                </span>
                <span className="text-muted-foreground block font-mono text-xs">
                  {user.username}
                </span>
              </span>

              {/*
                Role and state are a fill plus a word, never colour alone —
                davijara-ui's rule, and in high contrast the only thing left
                is the word.
              */}
              <span
                className={
                  user.role === "admin"
                    ? "bg-accent text-accent-foreground shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold"
                    : "border-hairline text-muted-foreground shrink-0 rounded-full border px-2 py-0.5 text-xs"
                }
              >
                {user.role === "admin" ? "Administrator" : "Muharrir"}
              </span>

              {!user.isActive ? (
                <span className="border-destructive/30 text-destructive shrink-0 rounded-full border px-2 py-0.5 text-xs">
                  Oʻchirilgan
                </span>
              ) : (sessions.get(user.id) ?? 0) > 0 ? (
                <span className="border-hairline text-muted-foreground shrink-0 rounded-full border border-dashed px-2 py-0.5 text-xs">
                  Tizimda
                </span>
              ) : null}

              <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                {user.lastLoginAt
                  ? `oxirgi kirish: ${user.lastLoginAt.slice(0, 10)}`
                  : "hech qachon kirmagan"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
