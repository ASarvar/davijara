"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FormError, FormNotice, TextInput } from "@/components/admin/field";
import { ImagePicker } from "@/components/admin/image-picker";
import { useFormFields } from "@/components/admin/use-form-fields";
import type { LeadershipMember } from "@/lib/data/leadership";
import { saveLeadershipAction, type LeadershipFormState } from "./actions";

/*
  One role, one form, one Save button.

  Three independent forms rather than one form covering all three roles —
  editing the Director should never risk touching the deputies if something
  about their own save fails, and three small forms are also three small
  audit entries instead of one that bundles unrelated changes together.

  ONLY THE NAME IS REQUIRED, at the operator's explicit request: photo, phone
  and reception hours are all optional, and the public card
  (lib/data/leadership.ts) simply omits whichever of them is blank.
*/
function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <Save />
      {pending ? "Saqlanmoqda…" : "Saqlash"}
    </Button>
  );
}

export function MemberForm({ member }: { member: LeadershipMember }) {
  const [state, formAction] = useActionState<LeadershipFormState, FormData>(
    saveLeadershipAction,
    {},
  );

  const { bind, set, fields } = useFormFields({
    fullName: member.fullName,
    photo: member.photo ?? "",
    phone: member.phone ?? "",
    receptionHours: member.receptionHours ?? "",
  });

  const idPrefix = `${member.roleId}-`;

  return (
    <form
      action={formAction}
      className="border-hairline space-y-4 rounded-lg border p-4"
    >
      <input type="hidden" name="roleId" value={member.roleId} />

      <div>
        <h2 className="font-heading text-base font-semibold">{member.title}</h2>
      </div>

      <FormError>{state.error}</FormError>
      <FormNotice>{state.ok}</FormNotice>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ism familiya" htmlFor={`${idPrefix}fullName`} required>
          <TextInput
            {...bind("fullName")}
            id={`${idPrefix}fullName`}
            maxLength={200}
            required
          />
        </Field>

        <Field
          label="Telefon"
          htmlFor={`${idPrefix}phone`}
          hint="Ixtiyoriy. Boʻsh qoldirilsa, saytda koʻrsatilmaydi."
        >
          <TextInput
            {...bind("phone")}
            id={`${idPrefix}phone`}
            maxLength={60}
            placeholder="+998 71 259-22-70"
          />
        </Field>
      </div>

      <Field
        label="Qabul kunlari"
        htmlFor={`${idPrefix}receptionHours`}
        hint="Ixtiyoriy. Masalan: Seshanba, 14:00 – 16:00."
      >
        <TextInput
          {...bind("receptionHours")}
          id={`${idPrefix}receptionHours`}
          maxLength={200}
        />
      </Field>

      <div>
        <p className="mb-2 block text-sm font-medium">
          Surat <span className="text-muted-foreground font-normal">(ixtiyoriy)</span>
        </p>
        <ImagePicker
          initialValue={fields.photo}
          onPick={(next) => set("photo", next)}
        />
        <input type="hidden" name="photo" value={fields.photo} />
      </div>

      <SaveButton />
    </form>
  );
}
