import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { requireAdmin } from "@/lib/auth/guard";
import { PrivilegeForm } from "../privilege-form";

export const metadata: Metadata = { title: "Yangi imtiyoz" };
export const dynamic = "force-dynamic";

export default async function NewPrivilegePage() {
  await requireAdmin();

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
        <h1 className="font-heading mt-2 text-2xl font-semibold">
          Yangi imtiyoz
        </h1>
        {/*
          There is no draft state here, so this warning is the only thing
          between pressing Save and a citizen reading it. Said plainly rather
          than assumed.
        */}
        <p className="text-muted-foreground mt-1 text-sm text-pretty">
          Saqlangandan soʻng saytda darhol koʻrinadi — qoralama holati yoʻq.
          Matnni manba hujjatdan koʻchiring.
        </p>
      </div>

      <PrivilegeForm
        values={{
          category: "ijtimoiy",
          tag: "",
          title: "",
          description: "",
          subject: "",
          duration: "",
          legalBasis: "",
        }}
      />
    </div>
  );
}
