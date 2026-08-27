"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { KeyRound, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FormError,
  FormNotice,
  SelectInput,
  TextInput,
} from "@/components/admin/field";
import { useFormFields } from "@/components/admin/use-form-fields";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password.client";
import { saveUserAction, type UserFormState } from "./actions";

/*
  Create or edit an account.

  The password field is OPTIONAL when editing and blank by default: leaving it
  alone must not change the password, and pre-filling it with anything —
  including a placeholder — invites someone to save a password they did not
  choose. On create, leaving it blank generates a strong one instead, which is
  the path an admin should normally take.
*/

export type UserFormValues = {
  id?: number;
  username: string;
  fullName: string;
  role: "admin" | "editor";
  isActive: boolean;
  /** True when the signed-in admin is editing their own account. */
  isSelf: boolean;
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

/** Shown once, after a password is generated. */
export function GeneratedPassword({ value }: { value: string }) {
  return (
    <div className="border-outline bg-secondary rounded-lg border p-4">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <KeyRound className="size-4" />
        Yangi parol
      </p>
      {/*
        `select-all` and a monospace face: this string is going to be
        copied, or read out loud, exactly once. It is not stored anywhere and
        cannot be shown again.
      */}
      <p className="bg-card border-hairline mt-2 rounded border px-3 py-2 font-mono text-base break-all select-all">
        {value}
      </p>
      <p className="text-muted-foreground mt-2 text-xs text-pretty">
        Bu parol boshqa hech qayerda saqlanmaydi va qayta koʻrsatilmaydi.
        Hoziroq nusxa oling va egasiga yetkazing — u kirgach oʻzgartirsin.
      </p>
    </div>
  );
}

export function UserForm({ values }: { values: UserFormValues }) {
  const [state, formAction] = useActionState<UserFormState, FormData>(
    saveUserAction,
    {},
  );

  // Controlled — see components/admin/use-form-fields.ts.
  const { fields, bind } = useFormFields({
    username: values.username,
    fullName: values.fullName,
    role: values.role,
    password: "",
    isActive: values.isActive ? "on" : "",
  });

  const isNew = values.id === undefined;

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}

      <FormError>{state.error}</FormError>
      <FormNotice>{state.ok}</FormNotice>
      {state.generatedPassword ? (
        <GeneratedPassword value={state.generatedPassword} />
      ) : null}

      <Field
        label="Ism-familiya"
        htmlFor="fullName"
        hint="Audit jurnalida shu nom koʻrinadi."
        required
      >
        <TextInput {...bind("fullName")} maxLength={120} required />
      </Field>

      <Field
        label="Login"
        htmlFor="username"
        hint="Kichik lotin harflari, raqamlar, _ va - ."
        required
      >
        <TextInput
          {...bind("username")}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          pattern="[a-z0-9_\-]{3,32}"
          required
        />
      </Field>

      <Field
        label="Rol"
        htmlFor="role"
        hint={
          values.isSelf
            ? "Oʻz rolingizni oʻzgartira olmaysiz."
            : "Muharrir yangilik va sahifa yozadi. Administrator qoʻshimcha ravishda foydalanuvchilar va huquqiy matnlarni boshqaradi."
        }
        required
      >
        <SelectInput {...bind("role")} disabled={values.isSelf}>
          <option value="editor">Muharrir</option>
          <option value="admin">Administrator</option>
        </SelectInput>
        {/*
          A disabled <select> submits nothing, so the value would arrive
          empty and the action would reject it. The hidden field carries the
          unchanged role instead — the control is read-only to the person,
          not absent from the form.
        */}
        {values.isSelf ? (
          <input type="hidden" name="role" value={values.role} />
        ) : null}
      </Field>

      <Field
        label={isNew ? "Parol" : "Yangi parol"}
        htmlFor="password"
        hint={
          isNew
            ? `Boʻsh qoldirilsa, kuchli parol avtomatik yaratiladi va bir marta koʻrsatiladi. Kamida ${PASSWORD_MIN_LENGTH} ta belgi.`
            : `Boʻsh qoldirilsa, parol oʻzgarmaydi. Oʻzgartirilsa, bu hisobning barcha seanslari yopiladi.`
        }
      >
        <TextInput
          {...bind("password")}
          type="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
        />
      </Field>

      {!isNew ? (
        <div className="border-hairline rounded-lg border px-4 py-3">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="isActive"
              checked={fields.isActive === "on"}
              onChange={(event) =>
                bind("isActive").onChange({
                  target: { value: event.target.checked ? "on" : "" },
                } as React.ChangeEvent<HTMLInputElement>)
              }
              disabled={values.isSelf}
              className="mt-0.5 size-4 shrink-0"
            />
            <span>
              <span className="font-medium">Faol hisob</span>
              <span className="text-muted-foreground mt-0.5 block text-xs text-pretty">
                {values.isSelf
                  ? "Oʻzingizni oʻchira olmaysiz."
                  : "Belgi olib tashlansa, foydalanuvchi tizimga kira olmaydi va ochiq seanslari darhol yopiladi."}
              </span>
            </span>
          </label>
          {values.isSelf ? (
            <input type="hidden" name="isActive" value="on" />
          ) : null}
        </div>
      ) : null}

      <SaveButton />
    </form>
  );
}
