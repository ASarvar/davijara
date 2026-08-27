import type { Metadata } from "next";

import { fontVariables } from "../fonts";
import "../globals.css";

/*
  The admin panel's document shell.

  A SECOND ROOT LAYOUT. This project has no `app/layout.tsx` — `[locale]/
  layout.tsx` is the root for the public site and renders its own <html>. The
  admin tree is a sibling, outside `[locale]`, so it needs a root of its own,
  and that is what this file is. Being separate is the point: the panel loads
  none of the public chrome — no header, no footer, no locale negotiation, no
  GSAP/Lenis motion provider, no JSON-LD — because an editor filling in a form
  needs none of it, and the box this runs on has one CPU.

  NOT LOCALISED. The public site is uz/ru/en; the panel is Uzbek only. Its
  audience is the Markaz's own staff, and three translations of every field
  label is upkeep that buys nothing. The CONTENT edited through it is still
  fully trilingual — that is a property of the forms, not of the chrome.

  `data-theme="light"` matches the public site's server-rendered default, so
  the panel inherits the same palette out of globals.css. The accessibility
  scripts are deliberately absent: high-contrast mode and the text-size
  controls belong to the citizen-facing site.
*/

export const metadata: Metadata = {
  title: {
    default: "Boshqaruv paneli",
    template: "%s — Boshqaruv paneli",
  },
  /*
    NOINDEX, and it must stay that way. `app/robots.ts` also disallows /admin,
    but robots.txt is a request and this header is an instruction — a search
    engine that ignores the first still honours the second. Belt and braces on
    a login form that would otherwise be indexable.
  */
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uz" data-theme="light" className={fontVariables}>
      <body className="bg-background text-foreground min-h-dvh antialiased">
        {children}
      </body>
    </html>
  );
}
