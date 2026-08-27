import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireUser } from "@/lib/auth/guard";
import { routeForNavKey } from "@/lib/data/page-routes";
import { getPageRecordByNavKey } from "@/lib/data/pages-admin";
import { menuTargets } from "@/lib/data/navigation";
import { redirect } from "next/navigation";
import { PageForm } from "../page-form";

export const metadata: Metadata = { title: "Yangi sahifa" };
export const dynamic = "force-dynamic";

/*
  Two entrances, one form.

  Without `?bolim=` this is "create a page at a path of your choosing".

  With it, the list has sent an editor here to fill in one of the site's own
  section routes for the first time — that route has no database row yet, so
  there is nothing to open an edit page on. The form arrives pre-bound to
  that nav key and creates the row on first save.
*/
export default async function NewPagePage({
  searchParams,
}: {
  searchParams: Promise<{ bolim?: string }>;
}) {
  await requireUser();

  const { bolim } = await searchParams;
  const route = bolim ? routeForNavKey(bolim) : undefined;

  /*
    Already written since the list was rendered — another editor, or a second
    tab. Send them to the real edit page rather than letting them create a
    second row that the UNIQUE constraint on nav_key would reject at save
    time with a database error.
  */
  if (route) {
    const existing = getPageRecordByNavKey(route.navKey);
    if (existing) redirect(`/admin/sahifalar/${existing.id}`);
  }

  const tNav = await getTranslations("nav");

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
        <h1 className="font-heading mt-2 text-2xl font-semibold">
          {route ? tNav(route.navKey) : "Yangi sahifa"}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Saqlagandan soʻng qoralama sifatida turadi. Saytda koʻrinishi uchun
          alohida chop etish kerak.
        </p>
      </div>

      <PageForm
        values={{
          navKey: route?.navKey ?? "",
          path: route?.path ?? "",
          navLabel: route ? tNav(route.navKey) : undefined,
          menuParent: "",
          translations: {},
        }}
        menus={menuTargets()}
      />
    </div>
  );
}
