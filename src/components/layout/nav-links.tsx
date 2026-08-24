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
        /*
          A parent is active for its own page AND for anything beneath it,
          so "Markaz haqida" stays marked while the reader is on
          /statistika. Without that the header would show no current
          section at all on a page that plainly belongs to one.
        */
        const hrefs = [item.href, ...(item.children ?? []).map((c) => c.href)];
        const isActive = hrefs.some((href) =>
          href === "/" ? pathname === "/" : pathname.startsWith(href),
        );

        return (
          /*
            `group` + `focus-within` rather than a click-to-open menu: the
            parent is itself a real page, so a click has to navigate. The
            submenu opens on hover for a pointer and on focus for the
            keyboard, which means tabbing into the parent reveals the child
            and tabbing on reaches it — no JavaScript and no trap.
          */
          <li key={item.href} className="group relative">
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

            {item.children ? (
              <ul
                /*
                  `invisible` rather than `hidden`, so the panel keeps its
                  place in the tab order and a keyboard reader can reach the
                  child before it is painted. `pt-2` on the wrapper keeps a
                  hoverable bridge between the parent and the panel — a pure
                  gap would close the menu as the pointer crossed it.
                */
                className="invisible absolute top-full left-0 z-50 min-w-[12rem] translate-y-1 pt-2 opacity-0 transition-[opacity,transform] duration-200 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100"
              >
                {/*
                  Minimal on purpose: a hairline, the card surface, one soft
                  shadow. A heavier panel for two links reads as a menu system
                  the reader has to navigate rather than as two more pages.
                */}
                <div className="border-hairline bg-card rounded-xl border p-1 [box-shadow:var(--shadow-1)]">
                  {item.children.map((child) => {
                    const childActive = pathname.startsWith(child.href);
                    return (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          aria-current={childActive ? "page" : undefined}
                          className={cn(
                            "block rounded-lg px-3 py-2 text-[0.905rem] whitespace-nowrap transition-colors",
                            childActive
                              ? "text-accent-foreground font-semibold"
                              : "text-foreground/75 hover:text-accent-foreground hover:bg-secondary/60",
                          )}
                        >
                          {t(child.key)}
                        </Link>
                      </li>
                    );
                  })}
                </div>
              </ul>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
