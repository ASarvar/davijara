"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { ChevronDown, ChevronUp, Plus, Save, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FormError,
  FormNotice,
  TextArea,
  TextInput,
} from "@/components/admin/field";
import { StringList } from "@/components/admin/string-list";
import type { DutiesDocument } from "@/types/documents";
import { saveDocumentAction, type DocumentFormState } from "./actions";

/*
  Vazifa va funksiyalar.

  ┌──────────────────────────────────────────────────────────────────────────┐
  │ THE GROUP LETTER IS A FIELD, NOT A COMPUTED POSITION.                    │
  │                                                                          │
  │ The statute groups its functions a), b), v), g), d), e), j) — the Latin  │
  │ renderings of а, б, в, г, д, е, ж. There is no c group and no f group.   │
  │ Deriving the letter from the row's index would produce a, b, c, d, e, f, │
  │ g and quietly renumber a legal document; the operator asked specifically │
  │ that this not happen when these pages were first built.                  │
  │                                                                          │
  │ So the letter is typed, moves with its group when reordered, and this    │
  │ editor never generates one.                                              │
  └──────────────────────────────────────────────────────────────────────────┘
*/

type Group = DutiesDocument["functions"]["groups"][number];

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      <Save />
      {pending ? "Saqlanmoqda…" : "Saqlash"}
    </Button>
  );
}

export function DutiesEditor({ initial }: { initial: DutiesDocument }) {
  const [state, formAction] = useActionState<DocumentFormState, FormData>(
    saveDocumentAction,
    {},
  );
  const [doc, setDoc] = useState<DutiesDocument>(initial);

  function setGroups(groups: Group[]) {
    setDoc({ ...doc, functions: { ...doc.functions, groups } });
  }

  function patchGroup(index: number, patch: Partial<Group>) {
    setGroups(
      doc.functions.groups.map((group, i) =>
        i === index ? { ...group, ...patch } : group,
      ),
    );
  }

  function moveGroup(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= doc.functions.groups.length) return;
    const next = [...doc.functions.groups];
    [next[index], next[target]] = [next[target]!, next[index]!];
    setGroups(next);
  }

  return (
    <form action={formAction} className="max-w-3xl space-y-6">
      <input type="hidden" name="key" value="duties" />
      <input type="hidden" name="data" value={JSON.stringify(doc)} />

      <FormError>{state.error}</FormError>
      <FormNotice>{state.ok}</FormNotice>

      {/* ── Nizom ───────────────────────────────────────────────────── */}
      <section className="border-outline space-y-4 rounded-lg border p-4">
        <h2 className="text-sm font-semibold">Asos — tasdiqlangan nizom</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Qaror nomi" htmlFor="duties-ref" required>
            <TextInput
              id="duties-ref"
              value={doc.order.reference}
              onChange={(e) =>
                setDoc({
                  ...doc,
                  order: { ...doc.order, reference: e.target.value },
                })
              }
              maxLength={300}
            />
          </Field>

          <Field label="Qaror sanasi" htmlFor="duties-date" required>
            <TextInput
              id="duties-date"
              type="date"
              value={doc.order.date}
              onChange={(e) =>
                setDoc({
                  ...doc,
                  order: { ...doc.order, date: e.target.value },
                })
              }
            />
          </Field>
        </div>

        <Field
          label="Nizom nomi"
          htmlFor="duties-statute"
          hint="Nizomning oʻz nomi, qoʻshtirnoq bilan — sahifaning tepasida chiqadi."
          required
        >
          <TextArea
            id="duties-statute"
            rows={2}
            value={doc.order.statuteTitle}
            onChange={(e) =>
              setDoc({
                ...doc,
                order: { ...doc.order, statuteTitle: e.target.value },
              })
            }
            maxLength={1000}
          />
        </Field>
      </section>

      {/* ── Vazifalar ───────────────────────────────────────────────── */}
      <section className="space-y-4">
        <Field label="Boʻlim sarlavhasi" htmlFor="duties-heading" required>
          <TextInput
            id="duties-heading"
            value={doc.duties.heading}
            onChange={(e) =>
              setDoc({
                ...doc,
                duties: { ...doc.duties, heading: e.target.value },
              })
            }
            maxLength={300}
          />
        </Field>

        <Field label="Kirish matni" htmlFor="duties-intro">
          <TextArea
            id="duties-intro"
            rows={3}
            value={doc.duties.intro}
            onChange={(e) =>
              setDoc({
                ...doc,
                duties: { ...doc.duties, intro: e.target.value },
              })
            }
            maxLength={2000}
          />
        </Field>

        <div>
          <p className="mb-2 text-sm font-medium">
            Vazifalar ({doc.duties.items.length} ta)
          </p>
          <StringList
            items={doc.duties.items}
            onChange={(items) =>
              setDoc({ ...doc, duties: { ...doc.duties, items } })
            }
            label="vazifa"
            addLabel="Vazifa qoʻshish"
            rows={3}
          />
        </div>
      </section>

      {/* ── Funksiyalar ─────────────────────────────────────────────── */}
      <section className="space-y-4">
        <Field label="Boʻlim sarlavhasi" htmlFor="functions-heading" required>
          <TextInput
            id="functions-heading"
            value={doc.functions.heading}
            onChange={(e) =>
              setDoc({
                ...doc,
                functions: { ...doc.functions, heading: e.target.value },
              })
            }
            maxLength={300}
          />
        </Field>

        <Field label="Kirish matni" htmlFor="functions-intro">
          <TextArea
            id="functions-intro"
            rows={2}
            value={doc.functions.intro}
            onChange={(e) =>
              setDoc({
                ...doc,
                functions: { ...doc.functions, intro: e.target.value },
              })
            }
            maxLength={2000}
          />
        </Field>

        <p className="border-outline bg-secondary rounded-lg border px-4 py-3 text-sm text-pretty">
          Guruh harflari — <strong>nizomning oʻziniki</strong>: a, b, v, g, d,
          e, j. Bu lotin alifbosi tartibi emas (c va f guruhlari yoʻq), shuning
          uchun ularni a-b-c-d ga oʻzgartirmang. Harf qoʻlda yoziladi va guruh
          bilan birga koʻchadi.
        </p>

        <div className="space-y-4">
          {doc.functions.groups.map((group, index) => (
            <div
              key={index}
              className="border-border bg-card space-y-3 rounded-lg border p-4"
            >
              <div className="flex items-start gap-2">
                <div className="w-16 shrink-0">
                  <TextInput
                    value={group.letter}
                    onChange={(e) =>
                      patchGroup(index, { letter: e.target.value })
                    }
                    aria-label={`${index + 1}-guruh harfi`}
                    maxLength={4}
                    className="text-center font-semibold"
                  />
                </div>

                <TextArea
                  value={group.heading}
                  rows={2}
                  onChange={(e) =>
                    patchGroup(index, { heading: e.target.value })
                  }
                  aria-label={`${index + 1}-guruh sarlavhasi`}
                  maxLength={500}
                  className="min-h-0"
                />

                <div className="flex shrink-0 flex-col gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => moveGroup(index, -1)}
                    disabled={index === 0}
                    aria-label={`${index + 1}-guruh — yuqoriga`}
                  >
                    <ChevronUp />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => moveGroup(index, 1)}
                    disabled={index === doc.functions.groups.length - 1}
                    aria-label={`${index + 1}-guruh — pastga`}
                  >
                    <ChevronDown />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    disabled={doc.functions.groups.length === 1}
                    onClick={() =>
                      setGroups(
                        doc.functions.groups.filter((_, i) => i !== index),
                      )
                    }
                    aria-label={`${index + 1}-guruhni oʻchirish`}
                  >
                    <X />
                  </Button>
                </div>
              </div>

              <div className="border-hairline border-t pt-3">
                <StringList
                  items={group.items}
                  onChange={(items) => patchGroup(index, { items })}
                  label={`${group.letter || index + 1}-guruh bandi`}
                  addLabel="Band qoʻshish"
                  rows={3}
                />
              </div>
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setGroups([
              ...doc.functions.groups,
              { letter: "", heading: "", items: [""] },
            ])
          }
        >
          <Plus />
          Guruh qoʻshish
        </Button>
      </section>

      <SaveButton />
    </form>
  );
}
