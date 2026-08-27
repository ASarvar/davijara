import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/guard";
import { getPrivilege } from "@/lib/data/privileges-admin";
import { deletePrivilegeAction } from "../actions";
import { PrivilegeForm } from "../privilege-form";

export const metadata: Metadata = { title: "Imtiyozni tahrirlash" };
export const dynamic = "force-dynamic";

export default async function EditPrivilegePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();

  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) notFound();

  const privilege = getPrivilege(numericId);
  if (!privilege) notFound();

  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/hujjatlar"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
        >
          <ChevronLeft className="size-4" />
          Ijara imtiyozlari
        </Link>
        <h1 className="font-heading mt-2 text-2xl font-semibold text-pretty">
          {privilege.title}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {privilege.legalBasis}
          {privilege.updatedAt ? (
            <>
              {" · "}oxirgi oʻzgarish {privilege.updatedAt.slice(0, 10)}
              {privilege.updatedBy ? `, ${privilege.updatedBy}` : ""}
            </>
          ) : null}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline" size="sm">
          <a
            href={`${base}/uz/imtiyozlar/${privilege.category}`}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink />
            Saytda koʻrish
          </a>
        </Button>
        <Button asChild variant="outline" size="sm">
          {/*
            Straight to this record's history. The audit view filters on
            entity + id, so an admin about to change a citation can read what
            it has been before they change it again.
          */}
          <Link href={`/admin/jurnal?bolim=privilege`}>
            Oʻzgarishlar tarixi
          </Link>
        </Button>
      </div>

      <PrivilegeForm
        values={{
          id: privilege.id,
          category: privilege.category,
          tag: privilege.tag,
          title: privilege.title,
          description: privilege.description,
          subject: privilege.subject,
          duration: privilege.duration,
          legalBasis: privilege.legalBasis,
        }}
      />

      <div className="border-hairline max-w-2xl border-t pt-6">
        <p className="text-muted-foreground mb-3 text-sm text-pretty">
          Imtiyozni oʻchirish. Uni faqat qonun hujjati kuchini yoʻqotgan boʻlsa
          oʻchiring — matn audit jurnalida toʻliq saqlanadi va kerak boʻlsa
          qaytadan kiritish mumkin. Roʻyxatdagi raqamlar avtomatik qayta
          hisoblanadi, boʻshliq qolmaydi.
        </p>
        <form action={deletePrivilegeAction}>
          <input type="hidden" name="id" value={privilege.id} />
          <Button type="submit" variant="destructive" size="sm">
            <Trash2 />
            Imtiyozni oʻchirish
          </Button>
        </form>
      </div>
    </div>
  );
}
