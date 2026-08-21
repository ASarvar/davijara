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
    /* flex-wrap so that at 125/150% text the row wraps to a second line and
       grows the header, instead of running off the right edge. */
    <ul className="hidden flex-wrap items-center gap-1 xl:flex">
      {mainNav.map((item) => {
        const isActive =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                // 0.84375rem === 13.5px at the default root size, so this
                // renders identically to the old `text-[13.5px]` — but it is
                // rem-based, so it actually scales with the "Matn o'lchami"
                // accessibility setting. A fixed px value silently opted the
                // whole nav out of that control.
                "relative rounded-md px-2.5 py-2 text-[0.905rem] whitespace-nowrap transition-colors",
                isActive
                  ? "text-accent-foreground font-semibold"
                  : "text-foreground/80 hover:text-accent-foreground",
              )}
            >
              {t(item.key)}
              {isActive ? (
                <span
                  aria-hidden="true"
                  // bg-ring, not raw gold — resolves to yellow in high
                  // contrast so the active item stays marked.
                  className="bg-ring absolute inset-x-3 -bottom-0.5 h-px"
                />
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
