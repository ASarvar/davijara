import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/guard";
import { listLeadershipAdmin } from "@/lib/data/leadership-admin";
import { MemberForm } from "./member-form";

export const metadata: Metadata = { title: "Rahbariyat" };
export const dynamic = "force-dynamic";

/*
  Rahbariyat.

  Exactly three forms, one per role — never a create/delete list. The roles
  come from src/content/structure.ts and stay in code; only who currently
  holds each one is edited here. See migration 10 and
  lib/data/leadership-admin.ts for the full reasoning.
*/
export default async function LeadershipPage() {
  await requireUser();

  const members = listLeadershipAdmin();
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Rahbariyat</h1>
        <p className="text-muted-foreground mt-1 text-sm text-pretty">
          Direktor va oʻrinbosarlar — tashkiliy tuzilmadagi uch lavozim.
          Faqat ism familiyani kiritish yetarli; surat, telefon va qabul
          kunlari ixtiyoriy va boʻsh qoldirilsa saytda koʻrsatilmaydi.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {members.map((member) => (
          <MemberForm key={member.roleId} member={member} />
        ))}
      </div>

      <Button asChild variant="outline" size="sm">
        <a href={`${base}/uz/markaz/qabul-kunlari`} target="_blank" rel="noreferrer">
          <ExternalLink />
          Saytda koʻrish
        </a>
      </Button>
    </div>
  );
}
