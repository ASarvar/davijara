import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Globe, Trash2, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/guard";
import { getNewsRecord } from "@/lib/data/news-admin";
import { deleteNewsAction, publishNewsAction } from "../actions";
import { NewsForm } from "../news-form";

export const metadata: Metadata = { title: "Yangilikni tahrirlash" };
export const dynamic = "force-dynamic";

export default async function EditNewsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();

  const { id } = await params;
  /*
    `yangi` is a sibling static segment, so Next never routes it here — but a
    hand-typed /admin/yangiliklar/abc would arrive as NaN and select nothing.
    Checked rather than left to the query, so the answer is 404 instead of an
    empty edit form that saves into nowhere.
  */
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) notFound();

  const record = getNewsRecord(numericId);
  if (!record) notFound();

  const published = record.status === "published";
  const title = record.translations.uz?.title ?? record.slug;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/yangiliklar"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
        >
          <ChevronLeft className="size-4" />
          Yangiliklar
        </Link>
        <h1 className="font-heading mt-2 text-2xl font-semibold text-pretty">
          {title}
        </h1>
      </div>

      {/*
        Publish / unpublish / delete sit ABOVE the form, in their own bar, and
        are separate <form>s. Nesting them inside the editor form would make
        every one of them a submit button for the editor — and "Oʻchirish"
        that sometimes saves instead is the kind of control that eventually
        deletes the wrong thing.
      */}
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

        <form action={publishNewsAction} className="contents">
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

        <form action={deleteNewsAction} className="ml-auto">
          <input type="hidden" name="id" value={record.id} />
          <Button type="submit" variant="destructive" size="sm">
            <Trash2 />
            Oʻchirish
          </Button>
        </form>
      </div>

      <NewsForm
        values={{
          id: record.id,
          slug: record.slug,
          category: record.category,
          publishedAt: record.publishedAt ?? "",
          image: record.image ?? "",
          translations: record.translations,
        }}
      />
    </div>
  );
}
