"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Field, FormError, TextInput } from "@/components/admin/field";
import { loginAction, type LoginState } from "./actions";

/*
  One of the few client components in the panel, and only for the pending
  state: `useActionState` needs a client boundary. The form itself is a normal
  <form action={…}> and submits without JavaScript — React progressively
  enhances it rather than replacing it.
*/

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Tekshirilmoqda…" : "Kirish"}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState<LoginState, FormData>(
    loginAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <FormError>{state.error}</FormError>

      <Field label="Login" htmlFor="username" required>
        <TextInput
          id="username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          maxLength={64}
          aria-invalid={state.error ? true : undefined}
        />
      </Field>

      <Field label="Parol" htmlFor="password" required>
        <TextInput
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={200}
          aria-invalid={state.error ? true : undefined}
        />
      </Field>

      <SubmitButton />
    </form>
  );
}
