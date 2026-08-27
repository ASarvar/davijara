"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FormError,
  FormNotice,
  TextInput,
} from "@/components/admin/field";
import { useFormFields } from "@/components/admin/use-form-fields";
import {
  createMenuAction,
  renameMenuAction,
  type MenuFormState,
} from "./actions";

/*
  The two label forms.

  Client components only because they need `useActionState` for the inline
  error and the saved notice — everything else on this screen is a plain
  Server Action form with no state of its own.

  Labels are controlled (see components/admin/use-form-fields.ts): React
  resets an uncontrolled form once an action settles, so a rejected name
  would come back as an empty box and the operator would retype it.
*/

function SubmitButton({
  children,
  size = "lg",
  icon,
}: {
  children: string;
  size?: "sm" | "lg";
  icon: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size={size} disabled={pending}>
      {icon}
      {pending ? "Saqlanmoqda…" : children}
    </Button>
  );
}

/*
  RU and EN are optional here for the same reason they are optional
  everywhere else on this site: messages/ru.json and en.json are partial by
  design and fall back to Uzbek. A menu whose label is only in Uzbek reads in
  Uzbek in all three locales, which is correct; an empty menu label would not
  be.
*/
function LabelFields({
  bind,
  idPrefix,
}: {
  bind: ReturnType<typeof useFormFields>["bind"];
  idPrefix: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Field label="Nomi (oʻzbekcha)" htmlFor={`${idPrefix}labelUz`} required>
        <TextInput
          {...bind("labelUz")}
          id={`${idPrefix}labelUz`}
          maxLength={80}
          required
        />
      </Field>
      <Field
        label="Ruscha"
        htmlFor={`${idPrefix}labelRu`}
        hint="Boʻsh qolsa, oʻzbekchasi chiqadi."
      >
        <TextInput
          {...bind("labelRu")}
          id={`${idPrefix}labelRu`}
          maxLength={80}
          lang="ru"
        />
      </Field>
      <Field
        label="Inglizcha"
        htmlFor={`${idPrefix}labelEn`}
        hint="Boʻsh qolsa, oʻzbekchasi chiqadi."
      >
        <TextInput
          {...bind("labelEn")}
          id={`${idPrefix}labelEn`}
          maxLength={80}
          lang="en"
        />
      </Field>
    </div>
  );
}

export function CreateMenuForm() {
  const [state, formAction] = useActionState<MenuFormState, FormData>(
    createMenuAction,
    {},
  );
  const { bind } = useFormFields({
    labelUz: "",
    labelRu: "",
    labelEn: "",
  });

  return (
    <form action={formAction} className="space-y-4">
      <FormError>{state.error}</FormError>
      <FormNotice>{state.ok}</FormNotice>

      <LabelFields bind={bind} idPrefix="new-" />

      <SubmitButton icon={<Plus />}>Menyu qoʻshish</SubmitButton>
    </form>
  );
}

export function RenameMenuForm({
  menuKey,
  labelUz,
  labelRu,
  labelEn,
}: {
  menuKey: string;
  labelUz: string;
  labelRu: string | null;
  labelEn: string | null;
}) {
  const [state, formAction] = useActionState<MenuFormState, FormData>(
    renameMenuAction,
    {},
  );
  const [open, setOpen] = useState(false);
  const { bind } = useFormFields({
    labelUz,
    labelRu: labelRu ?? "",
    labelEn: labelEn ?? "",
  });

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        Nomini oʻzgartirish
      </Button>
    );
  }

  return (
    <form action={formAction} className="w-full space-y-4">
      <input type="hidden" name="key" value={menuKey} />

      <FormError>{state.error}</FormError>
      <FormNotice>{state.ok}</FormNotice>

      <LabelFields bind={bind} idPrefix={`${menuKey}-`} />

      <div className="flex flex-wrap gap-2">
        <SubmitButton size="sm" icon={<Save />}>
          Saqlash
        </SubmitButton>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
        >
          Bekor qilish
        </Button>
      </div>
    </form>
  );
}
