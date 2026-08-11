"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { mainNav, contacts } from "@/content/site";
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
export function MobileNav() {
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

        <nav className="flex flex-col p-2">
          {mainNav.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                // Close on navigate — Radix does not know a route changed.
                onClick={() => setOpen(false)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-2.5 text-sm transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground font-semibold"
                    : "hover:bg-secondary",
                )}
              >
                {t(item.key)}
              </Link>
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
