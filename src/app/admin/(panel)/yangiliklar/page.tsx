import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/guard";
import { listNews } from "@/lib/data/news-admin";

export const metadata: Metadata = { title: "Yangiliklar" };
export const dynamic = "force-dynamic";

/*
  The news list.

  Drafts first, then newest published — the ordering is in the SQL (see
  listNews), because "what still needs me?" is the question an editor opens
  this page with.
*/

const CATEGORY_LABELS: Record<string, string> = {
  obyektlar: "Obyektlar",
  xizmatlar: "Xizmatlar",
  imtiyozlar: "Imtiyozlar",
  tadbirlar: "Tadbirlar",
  portal: "Portal",
};

export default async function NewsListPage() {
  await requireUser();
  const items = listNews();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Yangiliklar</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {items.length} ta yozuv
          </p>
        </div>
        <Button asChild size="lg" className="ml-auto">
          <Link href="/admin/yangiliklar/yangi">
            <Plus />
            Yangi yangilik
          </Link>
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="border-hairline text-muted-foreground rounded-lg border border-dashed px-4 py-10 text-center text-sm">
          Hozircha yangilik yoʻq.
        </p>
      ) : (
        <ul className="border-hairline divide-hairline divide-y rounded-lg border">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/admin/yangiliklar/${item.id}`}
                className="hover:bg-muted flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 transition-colors"
              >
                {/*
                  Status is a FILL plus a word, never colour alone — the rule
                  from davijara-ui, and the reason a draft says "Qoralama"
                  rather than just being grey.
                */}
                <span
                  className={
                    item.status === "published"
                      ? "border-hairline text-muted-foreground shrink-0 rounded-full border px-2 py-0.5 text-xs"
                      : "bg-accent text-accent-foreground shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold"
                  }
                >
                  {item.status === "published" ? "Chop etilgan" : "Qoralama"}
                </span>

                <span className="min-w-0 flex-1 text-sm font-medium text-pretty">
                  {item.title}
                </span>

                <span className="text-muted-foreground shrink-0 text-xs">
                  {CATEGORY_LABELS[item.category] ?? item.category}
                </span>

                {/*
                  Which languages exist. Uzbek is always present, so the
                  useful signal is the ABSENCE of ru/en — shown as a dimmed
                  pill rather than omitted, so the gap is visible instead of
                  having to be inferred from what is missing.
                */}
                <span className="flex shrink-0 gap-1">
                  {(["uz", "ru", "en"] as const).map((locale) => (
                    <span
                      key={locale}
                      title={
                        item.locales.includes(locale)
                          ? `${locale.toUpperCase()} tarjimasi bor`
                          : `${locale.toUpperCase()} tarjimasi yoʻq`
                      }
                      className={
                        item.locales.includes(locale)
                          ? "bg-secondary text-foreground rounded px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase"
                          : "text-muted-foreground/50 border-hairline rounded border border-dashed px-1.5 py-0.5 text-[0.65rem] uppercase"
                      }
                    >
                      {locale}
                    </span>
                  ))}
                </span>

                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  {item.publishedAt ?? "—"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
