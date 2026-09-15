import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Globe, Trash2, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/guard";
import { getVacancyRecord } from "@/lib/data/vacancies-admin";
import { deleteVacancyAction, setVacancyStatusAction } from "../actions";
import { VacancyStatusBadge } from "../status-badge";
import { VacancyForm } from "../vacancy-form";

export const metadata: Metadata = { title: "Vakansiyani tahrirlash" };
export const dynamic = "force-dynamic";

export default async function EditVacancyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();

  const { id } = await params;
  /* A hand-typed /admin/vakansiyalar/abc is a 404, not an empty form. */
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) notFound();

  const record = getVacancyRecord(numericId);
  if (!record) notFound();

  const open = record.status === "open";

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
        <h1 className="font-heading mt-2 text-2xl font-semibold text-pretty">
          {record.title}
        </h1>
      </div>

      {/*
        Open / close / delete are separate <form>s in their own bar, not
        buttons inside the editor form — nested, each would also submit the
        editor, and a "Yopish" that sometimes saves instead is how the wrong
        thing eventually happens.
      */}
      <div className="border-hairline bg-card flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3">
        <VacancyStatusBadge status={record.status} />
        <span className="text-muted-foreground text-sm">
          {open ? "Saytda koʻrinmoqda" : "Saytda koʻrinmaydi"}
        </span>

        <form action={setVacancyStatusAction} className="contents">
          <input type="hidden" name="id" value={record.id} />
          <input type="hidden" name="open" value={open ? "0" : "1"} />
          <Button
            type="submit"
            variant={open ? "outline" : "default"}
            size="sm"
          >
            {open ? <Undo2 /> : <Globe />}
            {open ? "Yopish" : "Ochish"}
          </Button>
        </form>

        <form action={deleteVacancyAction} className="ml-auto">
          <input type="hidden" name="id" value={record.id} />
          <Button type="submit" variant="destructive" size="sm">
            <Trash2 />
            Oʻchirish
          </Button>
        </form>
      </div>

      <VacancyForm
        values={{
          id: record.id,
          title: record.title,
          unit: record.unit,
          deadline: record.deadline ?? "",
          testDate: record.testDate ?? "",
          email: record.email,
          blocks: record.blocks,
        }}
      />
    </div>
  );
}
