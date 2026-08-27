"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Field, FormError, TextInput } from "@/components/admin/field";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password.client";
import { setupAction, type SetupState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Yaratilmoqda…" : "Administrator yaratish"}
    </Button>
  );
}

export function SetupForm() {
  const [state, formAction] = useActionState<SetupState, FormData>(
    setupAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <FormError>{state.error}</FormError>

      <Field
        label="Oʻrnatish kaliti"
        htmlFor="token"
        hint="Serverdagi .env faylida — ADMIN_SETUP_TOKEN."
        required
      >
        <TextInput
          id="token"
          name="token"
          autoComplete="off"
          spellCheck={false}
          required
        />
      </Field>

      <Field
        label="Ism-familiya"
        htmlFor="fullName"
        hint="Audit jurnalida shu nom koʻrinadi."
        required
      >
        <TextInput id="fullName" name="fullName" required maxLength={120} />
      </Field>

      <Field
        label="Login"
        htmlFor="username"
        hint="Kichik lotin harflari, raqamlar, _ va - ."
        required
      >
        <TextInput
          id="username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          pattern="[a-z0-9_\-]{3,32}"
          required
        />
      </Field>

      <Field
        label="Parol"
        htmlFor="password"
        hint={`Kamida ${PASSWORD_MIN_LENGTH} ta belgi. Uzun ibora qisqa murakkab paroldan xavfsizroq.`}
        required
      >
        <TextInput
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          required
        />
      </Field>

      <Field label="Parolni takrorlang" htmlFor="passwordConfirm" required>
        <TextInput
          id="passwordConfirm"
          name="passwordConfirm"
          type="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          required
        />
      </Field>

      <SubmitButton />
    </form>
  );
}
