"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Eye, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BlockEditor } from "@/components/admin/block-editor";
import {
  Field,
  FormError,
  FormNotice,
  TextInput,
} from "@/components/admin/field";
import { useFormFields } from "@/components/admin/use-form-fields";
import type { Block } from "@/types/blocks";
import { saveVacancyAction, type VacancyFormState } from "./actions";

/*
  The vacancy editor.

  ONE LANGUAGE, NO TABS. The announcement is published in Uzbek, Latin
  script (see migration 13); on /ru and /en only the chrome around it — dates,
  status, the e-mail label — is translated, through messages/.

  The fields above the text are what the COLLAPSED card on the site shows;
  "Eʼlon matni" is the full announcement that opens beneath it.
*/

export type VacancyFormValues = {
  id?: number;
  title: string;
  unit: string;
  deadline: string;
  testDate: string;
  email: string;
  blocks: Block[];
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

export function VacancyForm({ values }: { values: VacancyFormValues }) {
  const [state, formAction] = useActionState<VacancyFormState, FormData>(
    saveVacancyAction,
    {},
  );

  /* Controlled, so a rejected save does not wipe what was typed. */
  const { bind } = useFormFields({
    title: values.title,
    unit: values.unit,
    deadline: values.deadline,
    testDate: values.testDate,
    email: values.email,
  });

  return (
    <form action={formAction} className="space-y-6">
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}

      <FormError>{state.error}</FormError>
      <FormNotice>{state.ok}</FormNotice>

      <Field
        label="Lavozim nomi"
        htmlFor="title"
        hint="Saytdagi kartaning sarlavhasi."
        required
      >
        <TextInput {...bind("title")} maxLength={500} />
      </Field>

      <Field
        label="Hudud yoki boʻlinma"
        htmlFor="unit"
        hint="Sarlavha ustidagi qisqa yozuv, masalan: Namangan viloyati. Boʻsh qoldirish mumkin."
      >
        <TextInput {...bind("unit")} maxLength={300} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Hujjatlar qabulining oxirgi kuni"
          htmlFor="deadline"
          hint="Bu kun oʻtgach kartada «muddat tugagan» deb yoziladi. Saytdan olib tashlash uchun vakansiyani yoping."
        >
          <TextInput {...bind("deadline")} type="date" />
        </Field>

        <Field label="Test sanasi" htmlFor="testDate">
          <TextInput {...bind("testDate")} type="date" />
        </Field>
      </div>

      <Field
        label="Hujjatlar yuboriladigan e-pochta"
        htmlFor="email"
        hint="Kartaning pastida havola boʻlib chiqadi."
      >
        <TextInput
          {...bind("email")}
          type="email"
          maxLength={200}
          spellCheck={false}
          autoCapitalize="none"
        />
      </Field>

      <div>
        <p className="mb-2 block text-sm font-medium">Eʼlon matni</p>
        <BlockEditor name="blocks" initial={values.blocks} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SaveButton />
        {values.id ? (
          <Button asChild variant="outline" size="lg">
            <a
              href={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/uz/markaz/bosh-ish-orinlari`}
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
