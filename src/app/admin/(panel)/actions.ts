"use server";

import { redirect } from "next/navigation";

import { audit } from "@/lib/auth/audit";
import { getCurrentUser, destroySession } from "@/lib/auth/session";

/** Ends the session and returns to the login form. */
export async function logoutAction(): Promise<void> {
  /*
    Read the user BEFORE the session is destroyed — afterwards there is
    nobody to attribute the entry to, and an audit log that records logins
    but not logouts cannot answer "was that account still signed in at 18:00".
  */
  const user = await getCurrentUser();

  await destroySession();

  if (user) {
    audit({
      user,
      action: "logout",
      entity: "session",
      summary: "Tizimdan chiqdi",
    });
  }

  redirect("/admin/login");
}
