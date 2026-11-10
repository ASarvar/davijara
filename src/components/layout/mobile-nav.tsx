"use client";

import { useId, useState } from "react";
import { ChevronDown, Menu, Phone } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { contacts, type NavItem } from "@/content/site";
import { activeHref, isSectionActive } from "@/lib/nav-active";
import { useLiveAuctions } from "@/lib/live-auctions-client";
import { isNavItemShown } from "@/lib/nav-visibility";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { LangSwitcher } from "./lang-switcher";
import { Logo } from "./logo";
import { SocialLinks } from "./social-links";

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
  // Decides the conditional "Joriy savdolar" entry — lib/nav-visibility.ts.
  const { listed: liveListed } = useLiveAuctions();
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

      <SheetContent
        side="right"
        data-tone="deep"
        className="w-[300px] gap-0 p-0"
        closeLabel={tc("close")}
      >
        <SheetHeader className="border-border border-b px-5 py-3">
          <SheetTitle className="flex items-center gap-2.5 text-left">
            {/*
              Mark only — the sheet is 300px wide, the wordmark would crowd
              it. Through <Logo> like every other logo on the site, which is
              also what swaps the navy and white lockups per theme: the raw
              <img> this used to be was the white file alone, invisible on
              the light theme's white sheet. Decorative here (alt ""): the
              title beside it says "Menyu".
            */}
            <Logo variant="sheet" alt="" />
            {tc("menu")}
          </SheetTitle>
        </SheetHeader>

        {/*
          SCROLLABLE, now that the menu is six sections and thirty pages deep.
          The sheet is a fixed-height column: without `overflow-y-auto` here
          the list simply ran past the bottom edge and the last sections —
          Yangiliklar and Aloqa — were unreachable on a handset.
        */}
        <nav className="flex flex-1 flex-col overflow-y-auto px-2 pt-2 pb-2">
          {items.map((item) => (
            <MobileSection
              // Remounted per route, so the open section follows the page
              // the reader is on rather than the one they opened it on.
              key={`${item.href}:${pathname}`}
              item={item}
              pathname={pathname}
              liveListed={liveListed}
              label={(i) => navLabel(i, t)}
              onNavigate={() => setOpen(false)}
            />
          ))}
        </nav>

        {/*
          The header's own controls, operator 10.11.2026: the language, the
          phone and the social marks. The "Kirish" button and the 1082 hotline
          that sat here are gone — the desktop header has had no login entry
          for some time, and the hotline was already taken out of the footer.

          QUIETER THAN THE MENU, not louder (operator, 10.11.2026: the first
          version's cards and full language names outweighed the menu items).
          Same text size as a menu row, muted, and aligned to the menu's own
          left edge (nav p-2 + row px-3 = 20px, hence px-5).

            phone                 one line, like a menu row
            social marks · Oʻz Ru  32px tiles that WRAP within their side, so
                                  more networks start a second line; the
                                  language control stays pinned right and
                                  gains "En" when English opens
        */}
        <div className="border-border text-muted-foreground mt-auto flex flex-col gap-3 border-t px-5 py-4 text-sm">
          <a
            href={contacts.phoneHref}
            className="hover:text-accent-foreground flex items-center gap-2 font-medium transition-colors"
          >
            <Phone aria-hidden="true" className="size-4 shrink-0" />
            {contacts.phone}
          </a>
          <div className="flex items-center justify-between gap-3">
            <SocialLinks
              variant="tiles"
              className="flex min-w-0 flex-wrap gap-1.5"
            />
            <LangSwitcher variant="segmented" className="shrink-0" />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/*
  One section of the sheet, COLLAPSIBLE like the desktop dropdowns (operator,
  10.11.2026). It used to show every child of every section at once — a
  thirty-row list where the desktop shows seven words.

  Open by default only when the reader is somewhere inside it, so the sheet
  opens on where they are.

  A clickable parent is a real page (see `clickable` in content/site.ts), so
  its label stays a link and the chevron beside it is a separate toggle. A
  non-clickable parent has no page to open; its whole row is the toggle. The
  toggle takes its accessible name from the label (`aria-labelledby`) and
  states itself through `aria-expanded`, so no new string is needed.
*/
function MobileSection({
  item,
  pathname,
  liveListed,
  label,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  liveListed: number;
  label: (item: NavItem) => string;
  onNavigate: () => void;
}) {
  const sectionActive = isSectionActive(pathname, item);
  const [expanded, setExpanded] = useState(sectionActive);
  const id = useId();
  const labelId = `${id}-label`;
  const listId = `${id}-list`;

  const children = (item.children ?? []).filter((child) =>
    isNavItemShown(child, liveListed),
  );
  const currentChild = activeHref(
    pathname,
    children.map((c) => c.href),
  );
  // The operator's named exceptions — see `clickable` in content/site.ts.
  const clickable = item.clickable !== false;
  const hasChildren = children.length > 0;

  const rowClass = cn(
    "flex w-full items-center rounded-md text-sm font-semibold transition-colors",
    sectionActive ? "bg-accent text-accent-foreground" : "text-foreground",
  );
  const chevron = (
    <ChevronDown
      aria-hidden="true"
      className={cn(
        "size-4 shrink-0 opacity-60 transition-transform duration-200",
        expanded && "rotate-180",
      )}
    />
  );

  return (
    <div className="mb-1">
      {clickable ? (
        <div className={rowClass}>
          <Link
            id={labelId}
            href={item.href}
            // Close on navigate — Radix does not know a route changed.
            onClick={onNavigate}
            aria-current={sectionActive ? "page" : undefined}
            className={cn(
              "flex-1 rounded-md px-3 py-2.5",
              !sectionActive && "hover:bg-secondary",
            )}
          >
            {label(item)}
          </Link>
          {hasChildren ? (
            <button
              type="button"
              aria-labelledby={labelId}
              aria-expanded={expanded}
              aria-controls={listId}
              onClick={() => setExpanded((v) => !v)}
              className="hover:bg-secondary rounded-md px-3 py-2.5"
            >
              {chevron}
            </button>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          aria-expanded={hasChildren ? expanded : undefined}
          aria-controls={hasChildren ? listId : undefined}
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            rowClass,
            "justify-between px-3 py-2.5 text-left",
            !sectionActive && "hover:bg-secondary",
          )}
        >
          {label(item)}
          {hasChildren ? chevron : null}
        </button>
      )}

      {hasChildren ? (
        <div id={listId} hidden={!expanded}>
          {children.map((child) => {
            const childActive = currentChild === child.href;
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onNavigate}
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
                {label(child)}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
