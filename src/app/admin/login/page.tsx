import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthCard } from "@/components/admin/auth-card";
import { getCurrentUser } from "@/lib/auth/session";
import { isInstalled } from "@/lib/db";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Kirish" };

/*
  Rendered per request, never prerendered: it reads the session cookie and the
  database, both of which are request- and time-dependent. Without this Next
  would try to evaluate it at build time, where there is no cookie store and
  no database file yet.
*/
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  /*
    No admin exists yet — send the operator to first-run setup instead of
    showing a login form that nothing can satisfy. `isInstalled()` is what
    keeps the two screens from both being reachable at once.
  */
  if (!isInstalled()) redirect("/admin/setup");

  // Already signed in: a login form would be a dead end.
  if (await getCurrentUser()) redirect("/admin");

  return (
    <AuthCard
      title="Boshqaruv paneli"
      description="Davom etish uchun tizimga kiring."
      footer="Parolni unutgan boʻlsangiz, administratorga murojaat qiling."
    >
      <LoginForm />
    </AuthCard>
  );
}
