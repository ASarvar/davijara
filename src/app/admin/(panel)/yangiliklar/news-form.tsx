"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Eye, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BlockEditor } from "@/components/admin/block-editor";
import { ImagePicker } from "@/components/admin/image-picker";
import {
  Field,
  FormError,
  FormNotice,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/admin/field";
import type { Block } from "@/types/blocks";
import { useFormFields } from "@/components/admin/use-form-fields";
import { saveNewsAction, type NewsFormState } from "./actions";

/*
  The news editor.

  ONE FORM, THREE LANGUAGE TABS, AND ALL THREE ALWAYS SUBMIT. The tabs hide
  fields with CSS (`hidden`), they do not unmount them — an unmounted input
  sends nothing, so switching to Russian, typing, and switching back would
  silently discard the Russian text on save. Every field is in the DOM for
  every submit; the tab only decides what a person is looking at.

  Uzbek is required; ru and en may be left entirely blank, which is what
  "not translated yet" means (the public site falls back to Uzbek). A
  half-filled language is rejected by the action — see the note there.
*/

const LOCALES = [
  { code: "uz", label: "Oʻzbekcha", required: true },
  { code: "ru", label: "Ruscha", required: false },
  { code: "en", label: "Inglizcha", required: false },
] as const;

const CATEGORIES = [
  { value: "obyektlar", label: "Obyektlar" },
  { value: "xizmatlar", label: "Xizmatlar" },
  { value: "imtiyozlar", label: "Imtiyozlar" },
  { value: "tadbirlar", label: "Tadbirlar" },
  { value: "portal", label: "Portal" },
];

export type NewsFormValues = {
  id?: number;
  slug: string;
  category: string;
  publishedAt: string;
  image: string;
  translations: Partial<
    Record<
      "uz" | "ru" | "en",
      { title: string; excerpt: string; blocks: Block[] }
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

export function NewsForm({ values }: { values: NewsFormValues }) {
  const [state, formAction] = useActionState<NewsFormState, FormData>(
    saveNewsAction,
    {},
  );
  const [tab, setTab] = useState<"uz" | "ru" | "en">("uz");

  /*
    Controlled, so a rejected save does not wipe what was typed — see
    components/admin/use-form-fields.ts for the React 19 behaviour this
    works around.
  */
  const { bind, set } = useFormFields({
    slug: values.slug,
    category: values.category,
    publishedAt: values.publishedAt,
    image: values.image,
    ...Object.fromEntries(
      LOCALES.flatMap((locale) => [
        [`${locale.code}.title`, values.translations[locale.code]?.title ?? ""],
        [
          `${locale.code}.excerpt`,
          values.translations[locale.code]?.excerpt ?? "",
        ],
      ]),
    ),
  });

  return (
    <form action={formAction} className="space-y-6">
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}

      <FormError>{state.error}</FormError>
      <FormNotice>{state.ok}</FormNotice>

      {/* ── Language tabs ──────────────────────────────────────────────── */}
      <div
        role="tablist"
        aria-label="Til"
        className="border-hairline flex gap-1 border-b"
      >
        {LOCALES.map((locale) => {
          const active = tab === locale.code;
          const translated = Boolean(values.translations[locale.code]);
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
              ) : translated ? null : (
                <span className="text-muted-foreground/60 ml-1 text-xs">
                  (boʻsh)
                </span>
              )}
            </button>
          );
        })}
      </div>

      {LOCALES.map((locale) => {
        return (
          /*
            `hidden` rather than conditional rendering — see the note at the
            top of this file. It is the difference between a language tab that
            preserves what was typed in it and one that quietly loses it.
          */
          <div
            key={locale.code}
            hidden={tab !== locale.code}
            className="space-y-4"
          >
            <Field
              label="Sarlavha"
              htmlFor={`${locale.code}.title`}
              required={locale.required}
            >
              <TextInput {...bind(`${locale.code}.title`)} maxLength={300} />
            </Field>

            <Field
              label="Qisqacha mazmun"
              htmlFor={`${locale.code}.excerpt`}
              hint="Bir-ikki gap. Kartada va maqolaning boshida chiqadi."
              required={locale.required}
            >
              <TextArea {...bind(`${locale.code}.excerpt`)} maxLength={1000} />
            </Field>

            <div>
              <p className="mb-2 block text-sm font-medium">Matn</p>
              <BlockEditor
                name={`${locale.code}.blocks`}
                initial={values.translations[locale.code]?.blocks ?? []}
              />
            </div>
          </div>
        );
      })}

      {/* ── Settings, shared across languages ──────────────────────────── */}
      <div className="border-hairline space-y-4 border-t pt-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Boʻlim" htmlFor="category" required>
            <SelectInput {...bind("category")}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </SelectInput>
          </Field>

          <Field
            label="Chop etish sanasi"
            htmlFor="publishedAt"
            hint="Kelajakdagi sana qoʻyilsa, oʻsha kungacha saytda koʻrinmaydi."
          >
            <TextInput {...bind("publishedAt")} type="date" />
          </Field>
        </div>

        <Field
          label="Manzil (slug)"
          htmlFor="slug"
          hint="Boʻsh qoldirilsa, sarlavhadan avtomatik yasaladi."
        >
          <TextInput
            {...bind("slug")}
            maxLength={90}
            spellCheck={false}
            autoCapitalize="none"
          />
        </Field>

        <div>
          <p className="mb-1.5 block text-sm font-medium">Kartadagi rasm</p>
          <p className="text-muted-foreground mb-2 text-xs text-pretty">
            Yangilik kartasida va maqola boshida chiqadi. Boʻsh qoldirilsa,
            chizma tasvir koʻrsatiladi.
          </p>
          {/*
            The picker owns its own state and renders a CONTROLLED hidden
            input, so it already survives a rejected save; `set` keeps this
            form's copy in step for the "Saytda koʻrish" link below.
          */}
          <ImagePicker
            name="image"
            initialValue={values.image}
            onPick={(next) => set("image", next)}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SaveButton />
        {values.slug ? (
          <Button asChild variant="outline" size="lg">
            <a
              href={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/uz/yangiliklar/${values.slug}`}
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
