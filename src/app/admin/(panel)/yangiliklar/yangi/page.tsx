import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { requireUser } from "@/lib/auth/guard";
import { NewsForm } from "../news-form";

export const metadata: Metadata = { title: "Yangi yangilik" };
export const dynamic = "force-dynamic";

/*
  A new item always starts as a DRAFT — there is no "publish immediately"
  path from here. Publishing is a separate, deliberate act on the edit page,
  after the editor has seen the item saved and can preview it. On a state
  portal, "save" and "make this public" should not be the same button.
*/
export default async function NewNewsPage() {
  await requireUser();

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
        <h1 className="font-heading mt-2 text-2xl font-semibold">
          Yangi yangilik
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Saqlagandan soʻng qoralama sifatida turadi. Saytda koʻrinishi uchun
          alohida chop etish kerak.
        </p>
      </div>

      <NewsForm
        values={{
          slug: "",
          category: "obyektlar",
          publishedAt: "",
          image: "",
          translations: {},
        }}
      />
    </div>
  );
}
