import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown, ChevronUp, ExternalLink, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/guard";
import { listMenuSections, menuTargets } from "@/lib/data/navigation";
import { pagesInMenu, type MenuPage } from "@/lib/data/menu-admin";
import { deleteMenuAction, moveMenuAction, movePageAction } from "./actions";
import { CreateMenuForm, RenameMenuForm } from "./menu-forms";

export const metadata: Metadata = { title: "Menyu" };
export const dynamic = "force-dynamic";

/*
  The menu manager.

  It shows every place a page can be put, in the order the header renders
  them: the sections that live in src/content/site.ts first, then the ones
  the operator added. Both kinds list the pages hanging under them, and
  both can be reordered — what differs is that a code-owned section cannot be
  renamed or deleted from here. The reasoning is in lib/data/navigation.ts.

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

function PageList({ pages }: { pages: MenuPage[] }) {
  if (!pages.length) {
    return (
      <p className="text-muted-foreground px-4 py-3 text-sm text-pretty">
        Hozircha bu menyuga sahifa biriktirilmagan. Sahifani tahrirlashda
        &laquo;Menyuda joyi&raquo; maydonidan tanlanadi.
      </p>
    );
  }

  return (
    <ul className="divide-hairline divide-y">
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

export default async function MenuPage() {
  await requireUser();

  const targets = menuTargets();
  const custom = listMenuSections();
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";

  const staticTargets = targets.filter((target) => !target.custom);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Menyu</h1>
        <p className="text-muted-foreground mt-1 text-sm text-pretty">
          Saytning yuqori menyusi. Sahifa qaysi boʻlimda chiqishi shu
          sahifaning oʻzida belgilanadi; bu yerda tartibini oʻzgartirasiz va
          yangi boʻlim qoʻshasiz.
        </p>
      </div>

      {/* ── Saytning oʻz boʻlimlari ─────────────────────────────────────── */}
      <section className="space-y-3">
        <div>
          <h2 className="font-heading text-lg font-semibold">
            Saytning boʻlimlari
          </h2>
          <p className="text-muted-foreground mt-1 text-sm text-pretty">
            Bu boʻlimlar saytning tuzilishi — nomi va tartibi kodda turadi,
            panel orqali oʻzgartirilmaydi. Ularga yangi sahifa qoʻshish mumkin.
          </p>
        </div>

        <div className="space-y-3">
          {staticTargets.map((target) => (
            <div
              key={target.key}
              className="border-hairline overflow-hidden rounded-lg border"
            >
              <div className="bg-secondary flex flex-wrap items-center gap-3 px-4 py-2.5">
                <span className="text-sm font-semibold">{target.label}</span>
              </div>
              <PageList pages={pagesInMenu(target.key)} />
            </div>
          ))}
        </div>
      </section>

      {/* ── Qoʻshilgan menyular ─────────────────────────────────────────── */}
      <section className="space-y-3">
        <div>
          <h2 className="font-heading text-lg font-semibold">
            Qoʻshilgan menyular
          </h2>
          <p className="text-muted-foreground mt-1 text-sm text-pretty">
            Bular saytning oʻz boʻlimlaridan keyin chiqadi.{" "}
            <strong>Sahifasi yoʻq menyu saytda umuman koʻrinmaydi</strong> —
            bosilganda hech qayerga olib bormaydigan boʻlim boʻlmasligi uchun.
          </p>
        </div>

        {custom.length ? (
          <div className="space-y-3">
            {custom.map((section, index) => {
              const pages = pagesInMenu(section.key);
              return (
                <div
                  key={section.key}
                  className="border-hairline overflow-hidden rounded-lg border"
                >
                  <div className="bg-secondary flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
                    <span className="text-sm font-semibold">
                      {section.labelUz}
                    </span>

                    {section.pageCount === 0 ? (
                      <span className="border-hairline text-muted-foreground rounded-full border border-dashed px-2 py-0.5 text-xs">
                        Saytda koʻrinmaydi
                      </span>
                    ) : null}

                    <span className="ml-auto flex flex-wrap items-center gap-1">
                      {(
                        [
                          ["up", ChevronUp, "yuqoriga", index === 0],
                          [
                            "down",
                            ChevronDown,
                            "pastga",
                            index === custom.length - 1,
                          ],
                        ] as const
                      ).map(([direction, Icon, label, disabled]) => (
                        <form key={direction} action={moveMenuAction}>
                          <input
                            type="hidden"
                            name="key"
                            value={section.key}
                          />
                          <input
                            type="hidden"
                            name="direction"
                            value={direction}
                          />
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
                        <Button
                          type="submit"
                          variant="destructive"
                          size="sm"
                          aria-label={`${section.labelUz} menyusini oʻchirish`}
                        >
                          <Trash2 />
                          Oʻchirish
                        </Button>
                      </form>
                    </span>
                  </div>

                  <PageList pages={pages} />
                </div>
              );
            })}
          </div>
        ) : (
          <p className="border-hairline text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-sm text-pretty">
            Hozircha qoʻshilgan menyu yoʻq.
          </p>
        )}

        <p className="text-muted-foreground text-xs text-pretty">
          Menyu oʻchirilsa, uning ichidagi sahifalar oʻchmaydi — ular faqat
          menyudan chiqariladi va oʻz manzilida ochilaveradi.
        </p>
      </section>

      {/* ── Yangi menyu ─────────────────────────────────────────────────── */}
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
