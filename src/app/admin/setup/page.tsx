import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AuthCard } from "@/components/admin/auth-card";
import { isInstalled } from "@/lib/db";
import { SetupForm } from "./setup-form";

export const metadata: Metadata = { title: "Birinchi sozlash" };

export const dynamic = "force-dynamic";

export default function SetupPage() {
  /*
    404, not a redirect. Once an administrator exists this route must be
    indistinguishable from one that was never built — a redirect to /admin/login
    would confirm that setup HAD been completed, which is a small but free
    piece of reconnaissance.

    The action re-checks this independently: a page guard does not protect a
    Server Action (see lib/auth/guard.ts).
  */
  if (isInstalled()) notFound();

  return (
    <AuthCard
      title="Birinchi sozlash"
      description="Bu sahifa faqat bir marta — birinchi administrator yaratilgunga qadar ishlaydi. Keyin u butunlay yopiladi."
      footer="Oʻrnatish kaliti serverdagi .env faylida saqlanadi. Kalitni bilmasangiz, saytni oʻrnatgan mutaxassisga murojaat qiling."
    >
      <SetupForm />
    </AuthCard>
  );
}
