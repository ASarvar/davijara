"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { KeyRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormError } from "@/components/admin/field";
import { resetPasswordAction, type UserFormState } from "./actions";
import { GeneratedPassword } from "./user-form";

/*
  "This person has forgotten their password."

  Separate from the password field in the edit form, and the difference is
  who chooses the password. There, an admin types one they have decided on.
  Here they have not decided anything — they want a strong password produced
  for them, shown once, and every existing session of that account closed.

  Its own <form>, outside the editor's: nesting forms is invalid HTML, and a
  button that sometimes saves the whole account and sometimes resets a
  password is the kind of control that eventually does the wrong one.
*/

function ResetButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending}>
      <KeyRound />
      {pending ? "Yaratilmoqda…" : "Yangi parol yaratish"}
    </Button>
  );
}

export function ResetPassword({ userId }: { userId: number }) {
  const [state, formAction] = useActionState<UserFormState, FormData>(
    resetPasswordAction,
    {},
  );

  return (
    <div className="max-w-lg space-y-3">
      <FormError>{state.error}</FormError>
      {state.generatedPassword ? (
        <GeneratedPassword value={state.generatedPassword} />
      ) : null}

      <form action={formAction}>
        <input type="hidden" name="id" value={userId} />
        <ResetButton />
      </form>

      <p className="text-muted-foreground text-xs text-pretty">
        Kuchli parol yaratiladi va bir marta koʻrsatiladi. Bu hisobning ochiq
        seanslari darhol yopiladi.
      </p>
    </div>
  );
}
