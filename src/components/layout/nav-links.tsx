"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { mainNav } from "@/content/site";
import { cn } from "@/lib/utils";

/**
 * Desktop nav links.
 *
 * Client-only because it needs the current pathname to mark the active item —
 * the legacy markup hardcoded `class="active"` on "Bosh sahifa" on every page,
 * so the homepage appeared selected even while reading Imtiyozlar.
 */
export function NavLinks() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <ul className="hidden items-center gap-1 lg:flex">
      {mainNav.map((item) => {
        const isActive =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative rounded-md px-3 py-2 text-[13.5px] whitespace-nowrap transition-colors",
                isActive
                  ? "text-accent-foreground font-semibold"
                  : "text-foreground/80 hover:text-accent-foreground",
              )}
            >
              {t(item.key)}
              {isActive ? (
                <span
                  aria-hidden="true"
                  className="bg-[color:var(--color-gold)] absolute inset-x-3 -bottom-0.5 h-px"
                />
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
