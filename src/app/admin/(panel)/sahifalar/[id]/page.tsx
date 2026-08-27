import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Globe, Trash2, Undo2 } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/guard";
import { getPageRecord } from "@/lib/data/pages-admin";
import { menuTargets } from "@/lib/data/navigation";
import { deletePageAction, publishPageAction } from "../actions";
import { PageForm } from "../page-form";

export const metadata: Metadata = { title: "Sahifani tahrirlash" };
export const dynamic = "force-dynamic";

export default async function EditPagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();

  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) notFound();

  const record = getPageRecord(numericId);
  if (!record) notFound();

  const tNav = await getTranslations("nav");
  const published = record.status === "published";
  const heading = record.navKey
    ? tNav(record.navKey)
    : (record.translations.uz?.title ?? record.path);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/sahifalar"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
        >
          <ChevronLeft className="size-4" />
          Sahifalar
        </Link>
        <h1 className="font-heading mt-2 text-2xl font-semibold text-pretty">
          {heading}
        </h1>
      </div>

      {/* Separate forms, above the editor — see the note on the news edit page. */}
      <div className="border-hairline bg-card flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3">
        <span
          className={
            published
              ? "border-hairline text-muted-foreground rounded-full border px-2.5 py-0.5 text-xs"
              : "bg-accent text-accent-foreground rounded-full px-2.5 py-0.5 text-xs font-semibold"
          }
        >
          {published ? "Chop etilgan" : "Qoralama"}
        </span>

        <form action={publishPageAction} className="contents">
          <input type="hidden" name="id" value={record.id} />
          <input type="hidden" name="publish" value={published ? "0" : "1"} />
          <Button
            type="submit"
            variant={published ? "outline" : "default"}
            size="sm"
          >
            {published ? <Undo2 /> : <Globe />}
            {published ? "Chop etishni bekor qilish" : "Chop etish"}
          </Button>
        </form>

        <form action={deletePageAction} className="ml-auto">
          <input type="hidden" name="id" value={record.id} />
          <Button type="submit" variant="destructive" size="sm">
            <Trash2 />
            Oʻchirish
          </Button>
        </form>
      </div>

      {record.navKey ? (
        <p className="text-muted-foreground text-xs text-pretty">
          Oʻchirilsa, bu boʻlim saytda yoʻqolmaydi — u yana
          &laquo;tayyorlanmoqda&raquo; holatiga qaytadi.
        </p>
      ) : null}

      <PageForm
        values={{
          id: record.id,
          navKey: record.navKey ?? "",
          path: record.path,
          navLabel: record.navKey ? tNav(record.navKey) : undefined,
          menuParent: record.menuParent ?? "",
          translations: record.translations,
        }}
        menus={menuTargets()}
      />
    </div>
  );
}
