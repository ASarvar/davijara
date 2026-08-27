import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ChevronDown, ChevronUp, ExternalLink, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/guard";
import { mainNav } from "@/content/site";
import { listMenuSections, type MenuSection } from "@/lib/data/navigation";
import { pagesInMenu, type MenuPage } from "@/lib/data/menu-admin";
import { deleteMenuAction, moveMenuAction, movePageAction } from "./actions";
import { CreateMenuForm, RenameMenuForm } from "./menu-forms";
import { DeleteMenuButton } from "./delete-menu-button";

export const metadata: Metadata = { title: "Menyu" };
export const dynamic = "force-dynamic";

/*
  The menu manager.

  Every row here is a plain menu_sections row and gets the same controls —
  rename, reorder, delete — whether it is one of the five institutional
  sections migration 8 seeded from mainNav or something an operator created
  five minutes ago. See the note at the top of lib/data/navigation.ts for why
  that distinction stopped mattering to the data model; it still gets a
  small visual marker here ("Saytning boʻlimi") purely so an editor can see
  at a glance which rows also carry hard-coded site routes as children.

  BOTH KINDS OF CHILD ARE SHOWN, and that is the fix for a real incident, not
  a nicety. The first version of this screen only listed panel-attached
  pages (`pagesInMenu`), so a built-in section's hard-coded routes — the ones
  in mainNav, never stored as `pages` rows — were invisible here even though
  the public header rendered them correctly. "Ochiq maʼlumotlar" was deleted
  through this screen while it read "0 sahifa": the five disclosure pages
  under it were real, but nothing on this page said so. `BuiltinRow` now
  renders those alongside the DB-backed `PageRow`s so the count an operator
  sees here always matches what a citizen sees in the header.

  PAGES ARE ATTACHED FROM THE PAGE EDITOR, not from here. A page's menu is one
  field on the page it belongs to, and having two screens that both assign it
  would mean two places to look when it ends up somewhere unexpected. This
  screen answers "what is in the menu, and in what order".
*/

function PageRow({
  page,
  first,
  last,
}: {
  page: MenuPage;
  first: boolean;
  last: boolean;
}) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
      {!page.published ? (
        <span className="bg-accent text-accent-foreground shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold">
          Qoralama
        </span>
      ) : null}

      <Link
        href={`/admin/sahifalar/${page.id}`}
        className="hover:text-accent-foreground min-w-0 flex-1 text-sm font-medium text-pretty transition-colors"
      >
        {page.title || `/${page.path}`}
      </Link>

      <span className="text-muted-foreground shrink-0 font-mono text-xs">
        /{page.path}
      </span>

      {/*
        One form per button. A single form with two submits would have to
        carry the direction in the button's own `value`, and a keyboard
        Enter inside it would silently pick whichever came first.
      */}
      <span className="flex shrink-0 gap-0.5">
        {(
          [
            ["up", ChevronUp, "yuqoriga", first],
            ["down", ChevronDown, "pastga", last],
          ] as const
        ).map(([direction, Icon, label, disabled]) => (
          <form key={direction} action={movePageAction}>
            <input type="hidden" name="id" value={page.id} />
            <input type="hidden" name="direction" value={direction} />
            <Button
              type="submit"
              variant="ghost"
              size="icon-xs"
              disabled={disabled}
              aria-label={`${page.title || page.path} — ${label}`}
            >
              <Icon />
            </Button>
          </form>
        ))}
      </span>
    </li>
  );
}

/*
  A site route hanging under a built-in section — "Vazifa va funksiyalar"
  under Markaz, for instance. Fixed in code: no reorder, no rename, no
  delete from here. Shown anyway, and that is the whole point of this
  component — the earlier version of this screen only listed
  panel-attached pages and said "boʻsh" for every built-in section
  regardless of what was actually in it, which read as an invitation to
  delete something that was not empty at all.
*/
function BuiltinRow({ label, href }: { label: string; href: string }) {
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <Lock
        className="text-muted-foreground size-3.5 shrink-0"
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1 text-sm text-pretty">{label}</span>
      <span className="text-muted-foreground shrink-0 font-mono text-xs">
        {href}
      </span>
    </li>
  );
}

function PageList({
  builtinChildren,
  pages,
}: {
  builtinChildren: Array<{ key: string; label: string; href: string }>;
  pages: MenuPage[];
}) {
  if (!builtinChildren.length && !pages.length) {
    return (
      <p className="text-muted-foreground px-4 py-3 text-sm text-pretty">
        Hozircha bu menyuga sahifa biriktirilmagan. Sahifani tahrirlashda
        &laquo;Menyuda joyi&raquo; maydonidan tanlanadi.
      </p>
    );
  }

  return (
    <ul className="divide-hairline divide-y">
      {builtinChildren.map((child) => (
        <BuiltinRow key={child.key} label={child.label} href={child.href} />
      ))}
      {pages.map((page, index) => (
        <PageRow
          key={page.id}
          page={page}
          first={index === 0}
          last={index === pages.length - 1}
        />
      ))}
    </ul>
  );
}

const mainNavByKey = new Map(mainNav.map((item) => [item.key, item]));

function MenuBlock({
  section,
  first,
  last,
  navLabels,
}: {
  section: MenuSection;
  first: boolean;
  last: boolean;
  navLabels: Record<string, string>;
}) {
  const pages = pagesInMenu(section.key);
  const builtinItem = mainNavByKey.get(section.key);
  const builtin = Boolean(builtinItem);
  const builtinChildren = (builtinItem?.children ?? []).map((child) => ({
    key: child.key,
    href: child.href,
    label: navLabels[child.key] ?? child.key,
  }));

  return (
    <div className="border-hairline overflow-hidden rounded-lg border">
      <div className="bg-secondary flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
        <span className="text-sm font-semibold">{section.labelUz}</span>

        {builtin ? (
          <span
            className="border-hairline text-muted-foreground rounded-full border px-2 py-0.5 text-xs"
            title="Bu menyuda saytning oʻz sahifalari ham bor — oʻchirilsa, ular manzilida qoladi, lekin menyudan yoʻqoladi."
          >
            Saytning boʻlimi ({builtinChildren.length} ta)
          </span>
        ) : null}

        {section.pageCount === 0 && !builtin ? (
          <span className="border-hairline text-muted-foreground rounded-full border border-dashed px-2 py-0.5 text-xs">
            Saytda koʻrinmaydi
          </span>
        ) : null}

        <span className="ml-auto flex flex-wrap items-center gap-1">
          {(
            [
              ["up", ChevronUp, "yuqoriga", first],
              ["down", ChevronDown, "pastga", last],
            ] as const
          ).map(([direction, Icon, label, disabled]) => (
            <form key={direction} action={moveMenuAction}>
              <input type="hidden" name="key" value={section.key} />
              <input type="hidden" name="direction" value={direction} />
              <Button
                type="submit"
                variant="ghost"
                size="icon-xs"
                disabled={disabled}
                aria-label={`${section.labelUz} — ${label}`}
              >
                <Icon />
              </Button>
            </form>
          ))}

          <RenameMenuForm
            menuKey={section.key}
            labelUz={section.labelUz}
            labelRu={section.labelRu}
            labelEn={section.labelEn}
          />

          <form action={deleteMenuAction}>
            <input type="hidden" name="key" value={section.key} />
            <DeleteMenuButton
              label={section.labelUz}
              childLabels={builtinChildren.map((child) => child.label)}
            />
          </form>
        </span>
      </div>

      <PageList builtinChildren={builtinChildren} pages={pages} />
    </div>
  );
}

export default async function MenuPage() {
  await requireUser();

  const sections = listMenuSections();
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";

  /*
    The panel's own chrome is Uzbek-only, so this reads messages/nav
    directly rather than resolving per-request locale — the same choice
    every other admin screen that shows a mainNav label already makes (see
    sahifalar/yangi/page.tsx).
  */
  const tNav = await getTranslations("nav");
  const navLabels = Object.fromEntries(
    mainNav.flatMap((item) =>
      (item.children ?? []).map((child) => [child.key, tNav(child.key)]),
    ),
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Menyu</h1>
        <p className="text-muted-foreground mt-1 text-sm text-pretty">
          Saytning yuqori menyusi. Sahifa qaysi boʻlimda chiqishi shu
          sahifaning oʻzida belgilanadi; bu yerda tartibini oʻzgartirasiz,
          nomini tahrirlaysiz, oʻchirasiz yoki yangi boʻlim qoʻshasiz.
        </p>
      </div>

      <section className="space-y-3">
        <p className="text-muted-foreground text-sm text-pretty">
          <strong className="text-foreground">Saytning boʻlimi</strong>{" "}
          belgisi qoʻyilganlarida saytning oʻz sahifalari ham bor (masalan,
          Markaz ostida &laquo;Vazifa va funksiyalar&raquo;). Bunday menyuni
          oʻchirsangiz, oʻsha sahifalar oʻz manzilida qoladi, lekin{" "}
          <strong className="text-foreground">
            yuqori menyudan butunlay yoʻqoladi
          </strong>{" "}
          — nomi qaytarib kiritilsa ham, avtomatik qaytmaydi.{" "}
          <strong className="text-foreground">
            Sahifasi yoʻq menyu saytda umuman koʻrinmaydi.
          </strong>
        </p>

        {sections.length ? (
          <div className="space-y-3">
            {sections.map((section, index) => (
              <MenuBlock
                key={section.key}
                section={section}
                first={index === 0}
                last={index === sections.length - 1}
                navLabels={navLabels}
              />
            ))}
          </div>
        ) : (
          <p className="border-hairline text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-sm text-pretty">
            Hozircha hech qanday menyu yoʻq.
          </p>
        )}
      </section>

      <section className="border-hairline space-y-4 rounded-lg border p-4">
        <h2 className="font-heading text-lg font-semibold">Yangi menyu</h2>
        <CreateMenuForm />
      </section>

      <Button asChild variant="outline" size="sm">
        <a href={`${base}/uz`} target="_blank" rel="noreferrer">
          <ExternalLink />
          Saytda koʻrish
        </a>
      </Button>
    </div>
  );
}
