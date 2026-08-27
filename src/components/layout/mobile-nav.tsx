"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { contacts, type NavItem } from "@/content/site";
import { activeHref, isSectionActive } from "@/lib/nav-active";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { withBasePath } from "@/lib/base-path";

/**
 * Mobile navigation.
 *
 * The legacy stylesheet hid `.nav-links` at 900px and put nothing in its
 * place, so every navigation link simply vanished on phones — the site was
 * unnavigable below that width. This is the replacement.
 *
 * Built on shadcn's Sheet (Radix Dialog), so focus trapping, Escape-to-close,
 * scroll locking and `aria-modal` come for free rather than being hand-rolled.
 */
/*
  A menu item's visible text.

  Static entries carry a `key` into `messages/nav`; entries added through the
  admin panel carry a literal `label` already resolved for this locale and
  have no message key at all. Asking next-intl for a key that does not exist
  throws, so the presence of `label` is what decides which path is taken.
*/
function navLabel(item: NavItem, t: (key: string) => string): string {
  return item.label ?? t(item.key);
}

export function MobileNav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const t = useTranslations("nav");
  const tc = useTranslations("common");

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="xl:hidden"
          aria-label={tc("menu")}
        >
          <Menu aria-hidden="true" className="size-5" />
        </Button>
      </SheetTrigger>

      <SheetContent side="right" data-tone="deep" className="w-[300px] p-0">
        <SheetHeader className="border-border border-b">
          <SheetTitle className="flex items-center gap-2.5 text-left">
            {/* Mark only — the sheet is 300px wide, the wordmark would crowd it. */}
            {/* eslint-disable-next-line @next/next/no-img-element -- static SVG;
                next/image passes SVGs through without optimising them. */}
            <img
              // Raw <img>, so basePath does not apply automatically.
              src={withBasePath("/logo-short-light.svg")}
              alt=""
              width={57}
              height={69}
              aria-hidden="true"
              className="h-6 w-[22px]"
            />
            {tc("menu")}
          </SheetTitle>
        </SheetHeader>

        {/*
          SCROLLABLE, now that the menu is six sections and thirty pages deep.
          The sheet is a fixed-height column: without `overflow-y-auto` here
          the list simply ran past the bottom edge and the last sections —
          Yangiliklar and Aloqa — were unreachable on a handset.
        */}
        <nav className="flex flex-1 flex-col overflow-y-auto p-2">
          {items.map((item) => {
            const sectionActive = isSectionActive(pathname, item);
            const children = item.children ?? [];
            const currentChild = activeHref(
              pathname,
              children.map((c) => c.href),
            );

            return (
              /*
                No disclosure toggle on mobile. A sheet already has room to
                show every item, and hiding a section behind a tap costs a
                gesture on the way to every page inside it. The children are
                simply indented under their parent, which is also what a
                screen reader will read from the nesting.
              */
              <div key={item.href} className="mb-1">
                <Link
                  href={item.href}
                  // Close on navigate — Radix does not know a route changed.
                  onClick={() => setOpen(false)}
                  aria-current={sectionActive ? "page" : undefined}
                  className={cn(
                    "block rounded-md px-3 py-2.5 text-sm font-semibold transition-colors",
                    sectionActive
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-secondary",
                  )}
                >
                  {navLabel(item, t)}
                </Link>
                {children.map((child) => {
                  const childActive = currentChild === child.href;
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={() => setOpen(false)}
                      aria-current={childActive ? "page" : undefined}
                      className={cn(
                        // No `truncate`: these labels are full sentences and
                        // a clipped "PQ-447-son qarori 5-ilovasidagi…" tells
                        // the reader less than the two lines it costs.
                        "border-hairline ml-3 block border-l py-2 pr-3 pl-4 text-sm leading-snug text-pretty transition-colors",
                        childActive
                          ? "text-accent-foreground font-semibold"
                          : "text-muted-foreground hover:text-accent-foreground",
                      )}
                    >
                      {navLabel(child, t)}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="border-border mt-auto border-t p-4">
          <Button asChild className="w-full">
            <Link href="/kirish" onClick={() => setOpen(false)}>
              {t("login")}
            </Link>
          </Button>
          <a
            href={contacts.hotlineHref}
            className="text-muted-foreground hover:text-accent-foreground mt-3 block text-center text-sm transition-colors"
          >
            {contacts.hotline}
          </a>
        </div>
      </SheetContent>
    </Sheet>
  );
}
