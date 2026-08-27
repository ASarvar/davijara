"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FormError,
  FormNotice,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/admin/field";
import { useFormFields } from "@/components/admin/use-form-fields";
import { savePrivilegeAction, type PrivilegeFormState } from "./actions";

/*
  One statutory privilege.

  Every field is REQUIRED, unlike the news editor where a body may be empty.
  A privilege with no `subject` does not say who may claim it, and one with no
  `duration` does not say for how long — a citizen reading either would have
  to guess, about an entitlement. There is no partial state worth saving.
*/

const CATEGORIES = [
  { value: "ijtimoiy", label: "Ijtimoiy himoya" },
  { value: "talim", label: "Taʼlim muassasalari" },
  { value: "it", label: "IT va innovatsiya" },
  { value: "boshqa", label: "Sport, hunarmandchilik va hudud" },
];

export type PrivilegeFormValues = {
  id?: number;
  category: string;
  tag: string;
  title: string;
  description: string;
  subject: string;
  duration: string;
  legalBasis: string;
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

export function PrivilegeForm({ values }: { values: PrivilegeFormValues }) {
  const [state, formAction] = useActionState<PrivilegeFormState, FormData>(
    savePrivilegeAction,
    {},
  );

  const { bind } = useFormFields({
    category: values.category,
    tag: values.tag,
    title: values.title,
    description: values.description,
    subject: values.subject,
    duration: values.duration,
    legalBasis: values.legalBasis,
  });

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}

      <FormError>{state.error}</FormError>
      <FormNotice>{state.ok}</FormNotice>

      <Field label="Sarlavha" htmlFor="title" required>
        <TextInput {...bind("title")} maxLength={300} required />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Boʻlim"
          htmlFor="category"
          hint="Saytdagi filtr shu boʻyicha ishlaydi."
          required
        >
          <SelectInput {...bind("category")}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field
          label="Yorliq"
          htmlFor="tag"
          hint="Kartada koʻrinadigan qisqa yozuv, masalan «IT va innovatsiya»."
          required
        >
          <TextInput {...bind("tag")} maxLength={80} required />
        </Field>
      </div>

      <Field
        label="Tavsif"
        htmlFor="description"
        hint="Imtiyozning mazmuni — nima beriladi."
        required
      >
        <TextArea {...bind("description")} maxLength={2000} required />
      </Field>

      <Field
        label="Foydalanuvchi subyekt"
        htmlFor="subject"
        hint="Kim foydalana oladi."
        required
      >
        <TextArea {...bind("subject")} maxLength={500} required />
      </Field>

      <Field
        label="Davriylik"
        htmlFor="duration"
        hint="Qancha muddatga amal qiladi."
        required
      >
        <TextInput {...bind("duration")} maxLength={300} required />
      </Field>

      {/*
        The citation, given its own emphasis. It is the field a citizen (or an
        inspector) checks the claim against, and the one the audit log calls
        out by name when it changes.
      */}
      <div className="border-outline rounded-lg border p-4">
        <Field
          label="Asos — huquqiy hujjat"
          htmlFor="legalBasis"
          hint="Manba hujjatdagi kabi aynan yozilsin, masalan «PQ-239-son qarorning 4-bandi». Bu maydon oʻzgarsa, audit jurnalida alohida belgilanadi."
          required
        >
          <TextInput {...bind("legalBasis")} maxLength={500} required />
        </Field>
      </div>

      <SaveButton />
    </form>
  );
}
