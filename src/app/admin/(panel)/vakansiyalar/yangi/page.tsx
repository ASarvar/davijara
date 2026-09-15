import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { requireUser } from "@/lib/auth/guard";
import { VacancyForm } from "../vacancy-form";

export const metadata: Metadata = { title: "Yangi vakansiya" };
export const dynamic = "force-dynamic";

/*
  A new vacancy is saved CLOSED — there is no "publish immediately" path from
  here, the same rule news drafts follow. Opening it is a separate act on the
  edit page, after the editor has seen it saved.
*/
export default async function NewVacancyPage() {
  await requireUser();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/vakansiyalar"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
        >
          <ChevronLeft className="size-4" />
          Vakansiyalar
        </Link>
        <h1 className="font-heading mt-2 text-2xl font-semibold">
          Yangi vakansiya
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Saqlagandan soʻng yopiq holatda turadi. Saytda koʻrinishi uchun
          alohida «Ochish» tugmasini bosing.
        </p>
      </div>

      <VacancyForm
        values={{
          title: "",
          unit: "",
          deadline: "",
          testDate: "",
          email: "markaz@davaktiv.uz",
          blocks: [],
        }}
      />
    </div>
  );
}
