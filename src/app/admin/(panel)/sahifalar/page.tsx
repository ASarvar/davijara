import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/guard";
import { listPages, type PageSummary } from "@/lib/data/pages-admin";

export const metadata: Metadata = { title: "Sahifalar" };
export const dynamic = "force-dynamic";

/*
  The pages list.

  GROUPED THE WAY THE SITE'S MENU IS, not alphabetically — an editor looking
  for "Qabul kunlari" thinks of it as being under Markaz, which is where it
  is in the navigation they see every day.

  The 26 rows that have never been written are shown, marked "Boʻsh". That is
  the whole value of this screen: every one of them is a page the site already
  links to from its own menu and currently answers with "being prepared", so
  the list doubles as the work queue.
*/

const STATUS_STYLES: Record<PageSummary["status"], string> = {
  published: "border-hairline text-muted-foreground border",
  draft: "bg-accent text-accent-foreground font-semibold",
  empty: "border-hairline text-muted-foreground/70 border border-dashed",
};

const STATUS_LABELS: Record<PageSummary["status"], string> = {
  published: "Chop etilgan",
  draft: "Qoralama",
  empty: "Boʻsh",
};

export default async function PagesListPage() {
  await requireUser();

  /*
    The titles of registered routes come from the SAME `nav` strings the menu
    uses — resolved here on the server, so the list cannot drift from the
    menu it mirrors.
  */
  const tNav = await getTranslations("nav");
  const pages = listPages();

  const groups = new Map<string, PageSummary[]>();
  for (const page of pages) {
    const list = groups.get(page.group) ?? [];
    list.push(page);
    groups.set(page.group, list);
  }

  const written = pages.filter((p) => p.status !== "empty").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Sahifalar</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {written} ta toʻldirilgan, {pages.length - written} ta boʻsh
          </p>
        </div>
        <Button asChild size="lg" className="ml-auto">
          <Link href="/admin/sahifalar/yangi">
            <Plus />
            Yangi sahifa
          </Link>
        </Button>
      </div>

      {[...groups.entries()].map(([group, items]) => (
        <section key={group}>
          <h2 className="text-muted-foreground mb-2 text-xs font-semibold tracking-[0.14em] uppercase">
            {group}
          </h2>
          <ul className="border-hairline divide-hairline divide-y rounded-lg border">
            {items.map((page) => (
              <li key={page.navKey ?? page.path}>
                <Link
                  href={
                    /*
                      A page that has never been written has no id, so it is
                      opened by its nav key instead — the editor form creates
                      the row on first save. Sending them to a "new page" form
                      that then had to be told which route it was for would be
                      one screen too many.
                    */
                    page.id
                      ? `/admin/sahifalar/${page.id}`
                      : `/admin/sahifalar/yangi?bolim=${page.navKey}`
                  }
                  className="hover:bg-muted flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3 transition-colors"
                >
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[page.status]}`}
                  >
                    {STATUS_LABELS[page.status]}
                  </span>

                  <span className="min-w-0 flex-1 text-sm font-medium text-pretty">
                    {page.navKey
                      ? tNav(page.navKey)
                      : (page.title ?? page.path)}
                  </span>

                  <span className="text-muted-foreground shrink-0 font-mono text-xs">
                    /{page.path}
                  </span>

                  <span className="flex shrink-0 gap-1">
                    {(["uz", "ru", "en"] as const).map((locale) => (
                      <span
                        key={locale}
                        title={
                          page.locales.includes(locale)
                            ? `${locale.toUpperCase()} matni bor`
                            : `${locale.toUpperCase()} matni yoʻq`
                        }
                        className={
                          page.locales.includes(locale)
                            ? "bg-secondary text-foreground rounded px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase"
                            : "text-muted-foreground/50 border-hairline rounded border border-dashed px-1.5 py-0.5 text-[0.65rem] uppercase"
                        }
                      >
                        {locale}
                      </span>
                    ))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
