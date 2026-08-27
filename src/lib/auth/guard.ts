import "server-only";

import { redirect } from "next/navigation";

import { getCurrentUser, type SessionUser } from "./session";

/*
  The authorisation gate.

  ┌──────────────────────────────────────────────────────────────────────────┐
  │ EVERY PAGE **AND EVERY SERVER ACTION** CALLS THIS. Not just the layout.  │
  │                                                                          │
  │ A layout guard protects rendering, and nothing else. Server Actions are  │
  │ POST endpoints with generated IDs that are reachable directly, without   │
  │ ever rendering the page that contains the form — so an action that       │
  │ trusts "the layout already checked" is an unauthenticated write endpoint │
  │ wearing a login screen. This is the shape of the March 2025 Next.js      │
  │ middleware auth bypass (CVE-2025-29927): the lesson was not "patch the   │
  │ proxy", it was "do not put your only authorisation check somewhere the   │
  │ request can route around".                                               │
  │                                                                          │
  │ So the layout calling requireUser() is for the redirect, and each action │
  │ calling it again is the actual security boundary. The cost is one cached │
  │ query per request — getCurrentUser is wrapped in React `cache()`, so the │
  │ repetition is free.                                                      │
  └──────────────────────────────────────────────────────────────────────────┘
*/

/** Signed in, or redirected to the login form. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  return user;
}

/**
 * Signed in AND an admin.
 *
 * Editors write content; admins additionally manage accounts and the
 * statutory sections. An editor reaching an admin-only route is sent to the
 * dashboard rather than the login form — they ARE logged in, and bouncing
 * them to a login screen would read as a broken session.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/admin?xato=ruxsat");
  return user;
}

/*
  The action-side variants.

  A Server Action must NOT redirect on an authorisation failure: `redirect()`
  throws a control-flow signal that the client turns into a navigation, which
  from a fetch-based form submit looks like success. These throw instead, so
  the action's own error path reports it.
*/

export class NotAuthorisedError extends Error {
  constructor(message = "Ruxsat yoʻq.") {
    super(message);
    this.name = "NotAuthorisedError";
  }
}

export async function requireUserForAction(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new NotAuthorisedError("Sessiya tugagan. Qayta kiring.");
  return user;
}

export async function requireAdminForAction(): Promise<SessionUser> {
  const user = await requireUserForAction();
  if (user.role !== "admin") {
    throw new NotAuthorisedError("Bu amal uchun administrator huquqi kerak.");
  }
  return user;
}
