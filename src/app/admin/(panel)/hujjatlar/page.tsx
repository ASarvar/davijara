import type { Metadata } from "next";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Plus,
  ScrollText,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/guard";
import { listPrivileges } from "@/lib/data/privileges-admin";
import { PRIVILEGE_CATEGORIES } from "@/lib/data/privileges";
import { DOCUMENT_KEYS, DOCUMENT_LABELS } from "@/types/documents";
import { movePrivilegeAction } from "./actions";

export const metadata: Metadata = { title: "Huquqiy matnlar" };
export const dynamic = "force-dynamic";

const CATEGORY_LABELS = Object.fromEntries(
  PRIVILEGE_CATEGORIES.map((c) => [c.value, c.label]),
) as Record<string, string>;

export default async function PrivilegesPage() {
  await requireAdmin();
  const privileges = listPrivileges();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">
            Huquqiy matnlar
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Saytda darhol koʻrinadi — qoralama holati yoʻq
          </p>
        </div>
        <Button asChild size="lg" className="ml-auto">
          <Link href="/admin/hujjatlar/yangi">
            <Plus />
            Yangi imtiyoz
          </Link>
        </Button>
      </div>

      {/*
        The standing warning. These records are transcriptions of binding
        documents, and this screen is the only place they can now be changed
        without a reviewed git diff — so the page says so, every time, rather
        than assuming whoever opens it remembers.
      */}
      <div className="border-outline bg-secondary flex gap-3 rounded-lg border p-4">
        <ScrollText aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <div className="text-sm text-pretty">
          <p className="font-semibold">
            Bu matnlar huquqiy hujjatlardan olingan.
          </p>
          <p className="text-muted-foreground mt-1">
            Har bir oʻzgarish audit jurnaliga toʻliq yoziladi va eski holatini
            tiklash mumkin. Matnni oʻz soʻzingiz bilan qayta yozmang — tuzatish
            manba hujjatdan kelishi kerak. &laquo;Asos&raquo; maydoni ayniqsa
            muhim: unga tegilsa, jurnalda alohida belgilanadi.
          </p>
        </div>
      </div>

      {/*
        The two shaped documents, above the privilege list. They are a
        different kind of thing — one page each, with their own structure —
        so they get their own row rather than being mixed into a list of 24
        records that all look alike.
      */}
      <section>
        <h2 className="mb-3 text-sm font-semibold">Markaz sahifalari</h2>
        <ul className="border-hairline divide-hairline divide-y rounded-lg border">
          {DOCUMENT_KEYS.map((key) => (
            <li key={key}>
              <Link
                href={`/admin/hujjatlar/matnlar/${key}`}
                className="hover:bg-muted flex items-center gap-3 px-4 py-3 text-sm transition-colors"
              >
                <FileText aria-hidden="true" className="size-4 shrink-0" />
                <span className="font-medium">{DOCUMENT_LABELS[key]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">
          Imtiyozlar ({privileges.length} ta)
        </h2>
        <ul className="border-hairline divide-hairline divide-y rounded-lg border">
          {privileges.map((item, index) => (
            <li key={item.id} className="flex items-start gap-3 px-4 py-3">
              {/*
              The badge is the POSITION IN THIS LIST, exactly as the public
              page computes it — so what an admin sees here as 07 is what a
              citizen sees as 07. Showing the database id instead would drift
              apart the moment anything was deleted.
            */}
              <span className="text-muted-foreground mt-0.5 shrink-0 font-mono text-xs tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>

              <Link
                href={`/admin/hujjatlar/${item.id}`}
                className="hover:text-accent-foreground min-w-0 flex-1 transition-colors"
              >
                <span className="block text-sm font-medium text-pretty">
                  {item.title}
                </span>
                <span className="text-muted-foreground mt-0.5 block text-xs text-pretty">
                  {CATEGORY_LABELS[item.category] ?? item.category} ·{" "}
                  {item.legalBasis}
                </span>
              </Link>

              {/*
              Reordering as two buttons, not drag and drop — the same
              reasoning as the block editor: a drag target is invisible to a
              keyboard and hostile on a touchscreen.
            */}
              <div className="flex shrink-0 gap-1">
                <form action={movePrivilegeAction}>
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="direction" value="up" />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="icon-xs"
                    disabled={index === 0}
                    aria-label={`${item.title} — yuqoriga koʻchirish`}
                  >
                    <ChevronUp />
                  </Button>
                </form>
                <form action={movePrivilegeAction}>
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="direction" value="down" />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="icon-xs"
                    disabled={index === privileges.length - 1}
                    aria-label={`${item.title} — pastga koʻchirish`}
                  >
                    <ChevronDown />
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
