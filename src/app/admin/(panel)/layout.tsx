import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";

import { AdminNav } from "@/components/admin/admin-nav";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/guard";
import { logoutAction } from "./actions";
import { Logo } from "@/components/layout/logo";

/*
  The authenticated shell.

  A ROUTE GROUP, not a path segment: `(panel)` adds nothing to the URL, so
  `(panel)/page.tsx` is still `/admin`. What it buys is a layout boundary —
  everything inside it is behind `requireUser()`, while `/admin/login` and
  `/admin/setup` sit outside it and stay reachable to a signed-out visitor.
  Putting the guard on `admin/layout.tsx` instead would lock the login page
  behind the login page.

  This guard produces the REDIRECT. It is not the security boundary: every
  Server Action calls `requireUserForAction()` for itself, because an action
  is a POST endpoint that can be reached without this layout ever running.
  See lib/auth/guard.ts.
*/

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="mx-auto flex min-h-dvh max-w-7xl flex-col lg:flex-row">
      <aside className="border-hairline bg-card shrink-0 border-b px-4 py-5 lg:w-64 lg:border-r lg:border-b-0 lg:px-5 lg:py-6">
        <div className="mb-6 hidden lg:block">
          <Link href="/admin" aria-label="Boshqaruv paneli">
            <Logo variant="footer" />
          </Link>
        </div>

        <AdminNav role={user.role} />

        <div className="border-hairline mt-6 space-y-3 border-t pt-5">
          <div>
            <p className="text-sm font-medium">{user.fullName}</p>
            <p className="text-muted-foreground text-xs">
              {user.role === "admin" ? "Administrator" : "Muharrir"} ·{" "}
              {user.username}
            </p>
          </div>

          {/*
            The public site, in a new tab. An editor who has just published
            something wants to look at it, and without this the only way back
            is to type the URL — the panel is not under the site's own header.
          */}
          <a
            href={process.env.NEXT_PUBLIC_BASE_PATH || "/"}
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs transition-colors"
          >
            <ExternalLink className="size-3.5" />
            Saytni koʻrish
          </a>

          {/*
            A form, not a link. Logging out is a state change on the server,
            and a GET link to it would be triggerable by any image tag on any
            page the editor visits.
          */}
          <form action={logoutAction}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="w-full"
            >
              <LogOut />
              Chiqish
            </Button>
          </form>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {children}
      </main>
    </div>
  );
}
