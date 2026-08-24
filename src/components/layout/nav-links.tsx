"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { mainNav } from "@/content/site";
import { activeHref, isSectionActive } from "@/lib/nav-active";
import { cn } from "@/lib/utils";

/**
 * Desktop nav links — the six institutional sections and their submenus.
 *
 * Client-only because it needs the current pathname to mark the active item —
 * the legacy markup hardcoded `class="active"` on "Bosh sahifa" on every page,
 * so the homepage appeared selected even while reading Imtiyozlar.
 *
 * Active state comes from `lib/nav-active`, not from a `startsWith` here.
 * Sections now have up to eight children and several of them legitimately
 * cover the same URL prefix — see that file for why most-specific-wins is the
 * only rule that marks exactly one of them.
 */
export function NavLinks() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  /*
    The section whose panel is held shut despite the pointer being on it.

    WHY THIS EXISTS. The panel opens on `:hover`, and a click inside it
    navigates without moving the mouse — so on the new page the pointer is
    still inside the same `<li>`, `:hover` is still true, and the menu the
    reader just used springs back open over the page they asked for. Nothing
    resets it, because nothing about the DOM changed: the header is not
    re-mounted across a client-side navigation.

    A CSS-only menu cannot express "closed until the pointer moves away", so
    this is the one piece of state the component keeps. It is cleared on
    `pointerleave`, which is exactly the gesture that makes hover meaningful
    again.
  */
  const [heldShut, setHeldShut] = useState<string | null>(null);

  /*
    `detail === 0` means the link was activated from the KEYBOARD (Enter),
    where there is no pointer sitting on the menu and nothing to suppress —
    and where blurring would throw the reader's focus to <body> for no
    reason. Only a real pointer click needs either half of this.
  */
  const closeAfterClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    sectionHref: string,
  ) => {
    if (event.detail === 0) return;
    setHeldShut(sectionHref);
    // The clicked link keeps focus after navigating, which would hold the
    // panel open through `group-focus-within` even once the pointer left.
    event.currentTarget.blur();
  };

  return (
    /* flex-wrap so that at 125/150% text the row wraps to a second line and
       grows the bar, instead of running off the right edge. */
    <ul className="hidden flex-wrap items-center justify-center xl:flex">
      {mainNav.map((item) => {
        const sectionActive = isSectionActive(pathname, item);
        const children = item.children ?? [];
        // Which child, if any, owns the page — resolved across the whole
        // submenu at once so two overlapping entries cannot both light up.
        const currentChild = activeHref(
          pathname,
          children.map((c) => c.href),
        );

        return (
          /*
            `group` + `focus-within` rather than a click-to-open menu: the
            parent is itself a real page, so a click has to navigate. The
            submenu opens on hover for a pointer and on focus for the
            keyboard, which means tabbing into the parent reveals the child
            and tabbing on reaches it — no JavaScript and no trap.
          */
          <li
            key={item.href}
            className="group relative"
            // Leaving the item is what makes hover meaningful again — see
            // `heldShut` above.
            onPointerLeave={() => setHeldShut(null)}
          >
            <Link
              href={item.href}
              aria-current={sectionActive ? "page" : undefined}
              onClick={(event) => closeAfterClick(event, item.href)}
              className={cn(
                /*
                  1.0625rem === 17px at the default root size. Rem-based, not
                  `text-[17px]`: a fixed px value silently opts the whole nav
                  out of the "Matn o'lchami" accessibility control.

                  Larger than the 13.5px this row used to run at, because the
                  nav is no longer competing with the logo and a login button
                  for one row — it has a bar of its own and can be read at a
                  glance rather than squinted at.
                */
                "relative flex items-center gap-1.5 px-4 py-3.5 text-[1.0625rem] whitespace-nowrap transition-colors",
                sectionActive
                  ? "text-accent-foreground font-semibold"
                  : "text-foreground/85 hover:text-accent-foreground",
              )}
            >
              {t(item.key)}
              {children.length > 0 ? (
                <ChevronDown
                  aria-hidden="true"
                  className="size-3.5 shrink-0 opacity-60 transition-transform duration-200 group-hover:rotate-180 group-focus-within:rotate-180"
                />
              ) : null}
              {sectionActive ? (
                <span
                  aria-hidden="true"
                  // bg-ring, not raw gold — resolves to yellow in high
                  // contrast so the active item stays marked.
                  className="bg-ring absolute inset-x-3 bottom-0 h-0.5"
                />
              ) : null}
            </Link>

            {children.length > 0 ? (
              <ul
                /*
                  `invisible` rather than `hidden`, so the panel keeps its
                  place in the tab order and a keyboard reader can reach the
                  child before it is painted. `pt-2` on the wrapper keeps a
                  hoverable bridge between the parent and the panel — a pure
                  gap would close the menu as the pointer crossed it.

                  LEFT-ALIGNED TO THE PARENT, and the two paddings make that
                  exact rather than approximate: the trigger is `px-4` and the
                  panel is `p-1` around a `px-3` row, so both texts start 16px
                  in from the same left edge. Centring it (the first version)
                  hung the panel off to one side of its own section — under
                  "Markaz", the leftmost item, it reached out past the nav
                  entirely.

                  A FIXED WIDTH, not `w-max`. These labels are sentences —
                  "Markaz faoliyatiga oid normativ-huquqiy hujjatlar" is 48
                  characters — and `w-max` sized the panel to the longest one,
                  producing a 34rem slab of single-line rows. 19rem makes the
                  long ones wrap to a second line and holds every section's
                  panel to the same width.
                */
                className={cn(
                  "invisible absolute top-full left-0 z-50 w-[13rem] translate-y-1 pt-1 opacity-0 transition-[opacity,transform] duration-200",
                  // Held shut for one navigation — see `heldShut`. Dropping
                  // the hover/focus classes entirely is what keeps the panel
                  // down; overriding them would need to out-specify each one.
                  heldShut === item.href
                    ? null
                    : "group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100",
                )}
              >
                {/*
                  `bg-popover`, NOT `bg-card`. On the dark theme `--card` is
                  `rgba(255,255,255,0.04)` — a 4% wash designed to sit ON a
                  surface, not to be one — so the panel was effectively
                  transparent and the page text ran straight through the menu.
                  `--popover` is the opaque token for exactly this: #0d1e45 on
                  dark, #ffffff on light, #000000 in high contrast.

                  `--shadow-2`, not `--shadow-1`: level 1 is `none` on the
                  dark theme (where a card is already the lighter surface), and
                  a floating panel needs to read as lifted off the page rather
                  than inlaid into it. Level 2 is the hover step elsewhere,
                  which is the right weight for something overlapping content.
                */}
                <div className="border-hairline bg-popover text-popover-foreground rounded-sm border p-1 [box-shadow:var(--shadow-2)]">
                  {children.map((child) => {
                    const childActive = currentChild === child.href;
                    return (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          aria-current={childActive ? "page" : undefined}
                          onClick={(event) => closeAfterClick(event, item.href)}
                          className={cn(
                            /*
                              `text-pretty`, and no `whitespace-nowrap`: these
                              labels are full sentences — "PQ-447-son qarori
                              5-ilovasidagi ma'lumotlar" is 43 characters — so
                              the panel wraps them onto a second line within
                              its fixed width instead of forcing it wider.
                            */
                            "block rounded-sm px-3 py-2 text-[0.9375rem] leading-snug text-pretty transition-colors",
                            childActive
                              ? "text-accent-foreground font-semibold"
                              : // `popover-foreground`, not `foreground`:
                                // this text sits on the panel's own surface,
                                // which on the dark theme is a lighter navy
                                // than the page behind it.
                                "text-popover-foreground/80 hover:text-accent-foreground hover:bg-secondary/60",
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
