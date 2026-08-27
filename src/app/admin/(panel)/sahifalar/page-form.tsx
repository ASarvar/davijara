"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Eye, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BlockEditor } from "@/components/admin/block-editor";
import {
  Field,
  FormError,
  FormNotice,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/admin/field";
import type { Block } from "@/types/blocks";
import type { MenuTarget } from "@/lib/data/navigation";
import { useFormFields } from "@/components/admin/use-form-fields";
import { savePageAction, type PageFormState } from "./actions";

/*
  The page editor.

  Structurally the same as the news form — three language tabs that are
  hidden rather than unmounted, so switching away from a tab does not discard
  what was typed in it (see news-form.tsx for the full note).

  What differs is the top of the form, and it differs because a page has two
  kinds of identity:

    a SECTION page  — its URL and its heading are both fixed by the site. The
                      path is shown, not editable, and there is no title
                      field at all: the heading comes from the same `nav`
                      string the menu item uses.
    a CUSTOM page   — the editor chooses the path and writes the title.

  Making the section case editable would let someone move /hujjatlar to a URL
  the route file does not serve, and the content would simply disappear from
  the page that links to it.
*/

const LOCALES = [
  { code: "uz", label: "Oʻzbekcha", required: true },
  { code: "ru", label: "Ruscha", required: false },
  { code: "en", label: "Inglizcha", required: false },
] as const;

export type PageFormValues = {
  id?: number;
  /** Set for one of the site's own 26 routes; empty for a custom page. */
  navKey: string;
  path: string;
  /** The `nav` label, resolved on the server — shown instead of a title field. */
  navLabel?: string;
  /** Which menu the page hangs under; "" means it is not in the menu. */
  menuParent: string;
  translations: Partial<
    Record<
      "uz" | "ru" | "en",
      { title: string; description: string; blocks: Block[] }
    >
  >;
};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      <Save />
      {pending ? "Saqlanmoqda…" : "Saqlash"}
    </Button>
  );
}

/*
  The sentinel that turns the dropdown into a "create a menu" form.

  A separate button would be a second form on the page and a second round
  trip: the operator would have to leave a half-written page, create the
  menu, come back and find their way to the same tab. Creating it inline
  means the menu and the first page that needs it are one save.
*/
const NEW_MENU = "__new__";

export function PageForm({
  values,
  menus,
}: {
  values: PageFormValues;
  menus: MenuTarget[];
}) {
  const [state, formAction] = useActionState<PageFormState, FormData>(
    savePageAction,
    {},
  );
  const [tab, setTab] = useState<"uz" | "ru" | "en">("uz");
  const [menuParent, setMenuParent] = useState(values.menuParent);
  const isRegistered = values.navKey !== "";

  /*
    Controlled, so a rejected save keeps what was typed — see
    components/admin/use-form-fields.ts. This form is where the problem was
    first seen: a page saved to a reserved path came back with the error and
    an empty form.
  */
  const { bind } = useFormFields({
    path: values.path,
    ...Object.fromEntries(
      LOCALES.flatMap((locale) => [
        [`${locale.code}.title`, values.translations[locale.code]?.title ?? ""],
        [
          `${locale.code}.description`,
          values.translations[locale.code]?.description ?? "",
        ],
      ]),
    ),
    newMenuLabel: "",
  });

  return (
    <form action={formAction} className="space-y-6">
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      <input type="hidden" name="navKey" value={values.navKey} />

      <FormError>{state.error}</FormError>
      <FormNotice>{state.ok}</FormNotice>

      {/* ── Identity ───────────────────────────────────────────────────── */}
      {isRegistered ? (
        <div className="border-hairline bg-secondary rounded-lg border px-4 py-3">
          <p className="text-sm">
            <span className="font-semibold">{values.navLabel}</span>
          </p>
          <p className="text-muted-foreground mt-1 font-mono text-xs">
            /{values.path}
          </p>
          <p className="text-muted-foreground mt-2 text-xs text-pretty">
            Bu — saytning oʻz boʻlimi. Manzili va sarlavhasi menyudan olinadi,
            shuning uchun bu yerda oʻzgartirilmaydi. Siz faqat matnini yozasiz.
          </p>
        </div>
      ) : (
        <Field
          label="Sahifa manzili"
          htmlFor="path"
          hint="Masalan: hamkorlar yoki markaz/tarix. Saytda /uz/… koʻrinishida ochiladi."
          required
        >
          <TextInput
            {...bind("path")}
            maxLength={200}
            spellCheck={false}
            autoCapitalize="none"
            required
          />
        </Field>
      )}

      {/* ── Menyu ──────────────────────────────────────────────────────── */}
      {isRegistered ? null : (
        <div className="space-y-4">
          <Field
            label="Menyuda joyi"
            htmlFor="menuParent"
            hint="Sahifa shu boʻlimning ochiluvchi menyusida chiqadi. Chop etilmagan sahifa menyuda koʻrinmaydi."
          >
            <SelectInput
              id="menuParent"
              name="menuParent"
              value={menuParent}
              onChange={(e) => setMenuParent(e.target.value)}
            >
              <option value="">Menyuda koʻrsatilmasin</option>
              <optgroup label="Saytning boʻlimlari">
                {menus
                  .filter((menu) => !menu.custom)
                  .map((menu) => (
                    <option key={menu.key} value={menu.key}>
                      {menu.label}
                    </option>
                  ))}
              </optgroup>
              {menus.some((menu) => menu.custom) ? (
                <optgroup label="Qoʻshilgan menyular">
                  {menus
                    .filter((menu) => menu.custom)
                    .map((menu) => (
                      <option key={menu.key} value={menu.key}>
                        {menu.label}
                      </option>
                    ))}
                </optgroup>
              ) : null}
              <option value={NEW_MENU}>+ Yangi menyu yaratish…</option>
            </SelectInput>
          </Field>

          {menuParent === NEW_MENU ? (
            <Field
              label="Yangi menyu nomi"
              htmlFor="newMenuLabel"
              hint="Menyuning yuqori qatorida shu nom chiqadi. Keyinchalik “Menyu” boʻlimidan tarjima qilib qoʻyish mumkin."
              required
            >
              <TextInput {...bind("newMenuLabel")} maxLength={80} required />
            </Field>
          ) : null}
        </div>
      )}

      {/* ── Language tabs ──────────────────────────────────────────────── */}
      <div
        role="tablist"
        aria-label="Til"
        className="border-hairline flex gap-1 border-b"
      >
        {LOCALES.map((locale) => {
          const active = tab === locale.code;
          const written = Boolean(values.translations[locale.code]);
          return (
            <button
              key={locale.code}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(locale.code)}
              className={
                active
                  ? "border-accent-foreground text-foreground -mb-px border-b-2 px-4 py-2 text-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground -mb-px border-b-2 border-transparent px-4 py-2 text-sm transition-colors"
              }
            >
              {locale.label}
              {locale.required ? (
                <span className="text-destructive ml-1" aria-hidden="true">
                  *
                </span>
              ) : written ? null : (
                <span className="text-muted-foreground/60 ml-1 text-xs">
                  (boʻsh)
                </span>
              )}
            </button>
          );
        })}
      </div>

      {LOCALES.map((locale) => {
        const text = values.translations[locale.code];
        return (
          <div
            key={locale.code}
            hidden={tab !== locale.code}
            className="space-y-4"
          >
            {isRegistered ? (
              /*
                Still submitted, still empty. The action reads every language
                field for every page; leaving the input out entirely for
                section pages would make the two forms disagree about the
                shape of what they post.
              */
              <input
                type="hidden"
                name={`${locale.code}.title`}
                value={text?.title ?? ""}
              />
            ) : (
              <Field
                label="Sarlavha"
                htmlFor={`${locale.code}.title`}
                required={locale.required}
              >
                <TextInput {...bind(`${locale.code}.title`)} maxLength={300} />
              </Field>
            )}

            <Field
              label="Qidiruv tavsifi"
              htmlFor={`${locale.code}.description`}
              hint="Bir gap. Sahifada koʻrinmaydi — qidiruv natijalarida va havola koʻrinishida chiqadi."
            >
              <TextArea
                {...bind(`${locale.code}.description`)}
                maxLength={500}
              />
            </Field>

            <div>
              <p className="mb-2 block text-sm font-medium">Matn</p>
              <BlockEditor
                name={`${locale.code}.blocks`}
                initial={text?.blocks ?? []}
              />
            </div>
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-3">
        <SaveButton />
        {values.path ? (
          <Button asChild variant="outline" size="lg">
            <a
              href={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/uz/${values.path}`}
              target="_blank"
              rel="noreferrer"
            >
              <Eye />
              Saytda koʻrish
            </a>
          </Button>
        ) : null}
      </div>
    </form>
  );
}
