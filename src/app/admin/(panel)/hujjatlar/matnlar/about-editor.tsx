"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, Save, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FormError,
  FormNotice,
  TextArea,
  TextInput,
} from "@/components/admin/field";
import type { AboutDocument } from "@/types/documents";
import { saveDocumentAction, type DocumentFormState } from "./actions";

/*
  Markaz haqida.

  ONE HIDDEN JSON FIELD carries the whole document, exactly like the block
  editor — named inputs would need an index encoded into every field name and
  would fall apart the moment a language row was removed. The action
  re-validates the JSON against the schema regardless; this component is a
  convenience for a person, never a guarantee about what arrives.
*/

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      <Save />
      {pending ? "Saqlanmoqda…" : "Saqlash"}
    </Button>
  );
}

export function AboutEditor({ initial }: { initial: AboutDocument }) {
  const [state, formAction] = useActionState<DocumentFormState, FormData>(
    saveDocumentAction,
    {},
  );
  const [doc, setDoc] = useState<AboutDocument>(initial);

  function patchNames(
    index: number,
    patch: Partial<AboutDocument["officialNaming"]["names"][number]>,
  ) {
    setDoc((prev) => ({
      ...prev,
      officialNaming: {
        ...prev.officialNaming,
        names: prev.officialNaming.names.map((name, i) =>
          i === index ? { ...name, ...patch } : name,
        ),
      },
    }));
  }

  return (
    <form action={formAction} className="max-w-3xl space-y-6">
      <input type="hidden" name="key" value="about" />
      <input type="hidden" name="data" value={JSON.stringify(doc)} />

      <FormError>{state.error}</FormError>
      <FormNotice>{state.ok}</FormNotice>

      {/* ── Asos hujjat ─────────────────────────────────────────────── */}
      <section className="border-outline space-y-4 rounded-lg border p-4">
        <h2 className="text-sm font-semibold">Asos — tashkil etilgan hujjat</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Hujjat nomi" htmlFor="about-ref" required>
            <TextInput
              id="about-ref"
              value={doc.establishmentOrder.reference}
              onChange={(e) =>
                setDoc({
                  ...doc,
                  establishmentOrder: {
                    ...doc.establishmentOrder,
                    reference: e.target.value,
                  },
                })
              }
              maxLength={300}
            />
          </Field>

          <Field
            label="Hujjat sanasi"
            htmlFor="about-date"
            hint="Sahifada yashirin <time> sifatida chiqadi."
            required
          >
            <TextInput
              id="about-date"
              type="date"
              value={doc.establishmentOrder.date}
              onChange={(e) =>
                setDoc({
                  ...doc,
                  establishmentOrder: {
                    ...doc.establishmentOrder,
                    date: e.target.value,
                  },
                })
              }
            />
          </Field>
        </div>
      </section>

      {/* ── Tashkil etilishi ────────────────────────────────────────── */}
      <section className="space-y-4">
        <Field label="Boʻlim sarlavhasi" htmlFor="about-heading" required>
          <TextInput
            id="about-heading"
            value={doc.establishment.heading}
            onChange={(e) =>
              setDoc({
                ...doc,
                establishment: {
                  ...doc.establishment,
                  heading: e.target.value,
                },
              })
            }
            maxLength={300}
          />
        </Field>

        <Field
          label="Matn"
          htmlFor="about-body"
          hint="Qaror nomi va sanasi shu matn ichida aynan hujjatdagidek yozilsin."
          required
        >
          <TextArea
            id="about-body"
            rows={6}
            value={doc.establishment.body}
            onChange={(e) =>
              setDoc({
                ...doc,
                establishment: { ...doc.establishment, body: e.target.value },
              })
            }
            maxLength={5000}
          />
        </Field>
      </section>

      {/* ── Rasmiy nomlanish ────────────────────────────────────────── */}
      <section className="space-y-4">
        <Field label="Boʻlim sarlavhasi" htmlFor="naming-heading" required>
          <TextInput
            id="naming-heading"
            value={doc.officialNaming.heading}
            onChange={(e) =>
              setDoc({
                ...doc,
                officialNaming: {
                  ...doc.officialNaming,
                  heading: e.target.value,
                },
              })
            }
            maxLength={300}
          />
        </Field>

        <Field label="Kirish jumlasi" htmlFor="naming-intro">
          <TextInput
            id="naming-intro"
            value={doc.officialNaming.intro}
            onChange={(e) =>
              setDoc({
                ...doc,
                officialNaming: {
                  ...doc.officialNaming,
                  intro: e.target.value,
                },
              })
            }
            maxLength={1000}
          />
        </Field>

        {/*
          One card per language. The Russian and English entries are NOT
          Uzbek text and must stay in their own language and script — the page
          sets `lang` per row so a screen reader pronounces each correctly, and
          src/content/about.ts records at length why transliterating a foreign
          legal name would be inventing a name no document contains.
        */}
        <p className="text-muted-foreground text-sm text-pretty">
          Rus va ingliz tilidagi nomlar oʻz tilida qoladi — ularni oʻzbekchaga
          oʻgirmang. Sahifa har bir qatorga <code>lang</code> belgisini qoʻyadi,
          shunda ekran oʻqiguvchi ularni toʻgʻri talaffuz qiladi.
        </p>

        <div className="space-y-3">
          {doc.officialNaming.names.map((name, index) => (
            <div
              key={index}
              className="border-border bg-card space-y-3 rounded-lg border p-4"
            >
              <div className="flex items-center gap-2">
                <TextInput
                  value={name.language}
                  onChange={(e) =>
                    patchNames(index, { language: e.target.value })
                  }
                  placeholder="Masalan: Rus tilida"
                  aria-label={`${index + 1}-til nomi`}
                  className="font-semibold"
                  maxLength={120}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={doc.officialNaming.names.length === 1}
                  onClick={() =>
                    setDoc({
                      ...doc,
                      officialNaming: {
                        ...doc.officialNaming,
                        names: doc.officialNaming.names.filter(
                          (_, i) => i !== index,
                        ),
                      },
                    })
                  }
                  aria-label={`${index + 1}-tilni oʻchirish`}
                >
                  <X />
                </Button>
              </div>

              <Field
                label="Toʻliq nomi"
                htmlFor={`name-full-${index}`}
                required
              >
                <TextArea
                  id={`name-full-${index}`}
                  rows={2}
                  value={name.full}
                  onChange={(e) => patchNames(index, { full: e.target.value })}
                  maxLength={1000}
                />
              </Field>

              <Field
                label="Qisqartirilgan nomi"
                htmlFor={`name-short-${index}`}
                required
              >
                <TextInput
                  id={`name-short-${index}`}
                  value={name.short}
                  onChange={(e) => patchNames(index, { short: e.target.value })}
                  maxLength={500}
                />
              </Field>
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setDoc({
              ...doc,
              officialNaming: {
                ...doc.officialNaming,
                names: [
                  ...doc.officialNaming.names,
                  { language: "", full: "", short: "" },
                ],
              },
            })
          }
        >
          <Plus />
          Til qoʻshish
        </Button>
      </section>

      <SaveButton />
    </form>
  );
}
