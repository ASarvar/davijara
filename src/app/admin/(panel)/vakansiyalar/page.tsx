import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/guard";
import { listVacanciesAdmin } from "@/lib/data/vacancies-admin";
import { formatDate } from "@/lib/format";
import { setVacancyStatusAction } from "./actions";
import { VacancyStatusBadge } from "./status-badge";

export const metadata: Metadata = { title: "Vakansiyalar" };
export const dynamic = "force-dynamic";

/*
  The vacancy list.

  Open first — they are what the public page is showing — then closed, newest
  first. Every row carries its own Ochish / Yopish button: closing a finished
  competition is the thing an editor comes here to do most often, and it
  should not need a trip through the edit page.
*/

export default async function VacancyListPage() {
  await requireUser();
  const items = listVacanciesAdmin();
  const openCount = items.filter((item) => item.status === "open").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Vakansiyalar</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {items.length} ta eʼlon · {openCount} tasi saytda
          </p>
        </div>
        <Button asChild size="lg" className="ml-auto">
          <Link href="/admin/vakansiyalar/yangi">
            <Plus />
            Yangi vakansiya
          </Link>
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="border-hairline text-muted-foreground rounded-lg border border-dashed px-4 py-10 text-center text-sm">
          Hozircha vakansiya yoʻq.
        </p>
      ) : (
        <ul className="border-hairline divide-hairline divide-y rounded-lg border">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3"
            >
              <VacancyStatusBadge status={item.status} />

              <Link
                href={`/admin/vakansiyalar/${item.id}`}
                className="hover:text-accent-foreground min-w-0 flex-1 text-sm font-medium text-pretty transition-colors"
              >
                {item.unit ? (
                  <span className="text-muted-foreground block text-xs font-normal">
                    {item.unit}
                  </span>
                ) : null}
                {item.title}
              </Link>

              <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                {item.deadline ? `${formatDate(item.deadline)} gacha` : "—"}
              </span>

              {/*
                A form of its own, beside the link rather than inside it — a
                button nested in an <a> is invalid markup and its click would
                also follow the link.
              */}
              <form action={setVacancyStatusAction}>
                <input type="hidden" name="id" value={item.id} />
                <input
                  type="hidden"
                  name="open"
                  value={item.status === "open" ? "0" : "1"}
                />
                <Button
                  type="submit"
                  size="sm"
                  variant={item.status === "open" ? "outline" : "default"}
                >
                  {item.status === "open" ? "Yopish" : "Ochish"}
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
