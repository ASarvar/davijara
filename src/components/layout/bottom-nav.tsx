"use client";

import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { bottomNav } from "@/content/site";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

/**
 * Mobile bottom navigation bar, ported from davijara-v2.html.
 *
 * Hidden at `lg` and above, where the full nav is visible. Sits below the
 * Sheet's z-index so opening the mobile menu covers it rather than leaving two
 * competing navigations on screen.
 */
export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <nav
      data-tone="deep"
      aria-label="Mobil menyu"
      className="bg-background border-border fixed inset-x-0 bottom-0 z-30 border-t lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {bottomNav.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  /*
                    0.625rem === 10px at the default root. Deliberately below
                    the named scale: five columns on a 375px screen leave ~67px
                    each, and "Ijara obyektlari" already truncates there — a
                    step up to text-xs would clip more of every label.

                    But rem, not `text-[10px]`. A px value silently opts the
                    whole tab bar out of the "Matn o'lchami" control, which is
                    the one piece of chrome a low-vision user needs most.
                  */
                  "flex flex-col items-center gap-1 px-1 py-2.5 text-[0.625rem] transition-colors",
                  isActive
                    ? "text-accent-foreground font-semibold"
                    : "text-muted-foreground",
                )}
              >
                <Icon name={item.icon} className="size-5" />
                <span className="truncate">{t(item.key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
