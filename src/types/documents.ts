import { z } from "zod";

/*
  The two statutory documents that are neither a list of records nor free
  prose: /markaz (Markaz haqida) and /markaz/vazifalar (Vazifa va funksiyalar).

  ┌──────────────────────────────────────────────────────────────────────────┐
  │ WHY THESE ARE NOT BLOCKS.                                                │
  │                                                                          │
  │ The block editor would have made both editable in an afternoon — and     │
  │ would have destroyed what makes them readable. The official name appears │
  │ in three languages with a full and a short form each, laid out as three  │
  │ parallel cards; as blocks it becomes nine paragraphs in a row. The       │
  │ functions are grouped a), b), v), g), d), e), j) — the source statute's  │
  │ OWN Cyrillic lettering, which the operator specifically asked to keep    │
  │ rather than renumber into a Latin sequence; as blocks the letters become │
  │ typed-in text that nothing enforces and the next editor silently         │
  │ "corrects" to a, b, c, d.                                                │
  │                                                                          │
  │ So the shape is modelled, and the editor is built to it. The letters are │
  │ a field, the three languages are three rows, and neither can drift into  │
  │ something the page was not designed to render.                           │
  └──────────────────────────────────────────────────────────────────────────┘

  STORED AS JSON in one TEXT column per document, for the same reason blocks
  are (see types/blocks.ts): the shape is read and written whole and never
  queried into, so a JSON document is the honest representation rather than
  six join tables that only ever get SELECT *'d together.

  VALIDATED ON EVERY READ. `parseDocument` re-checks against these schemas
  rather than trusting the column — a hand-edited row or a half-finished
  restore must not reach a public page as `undefined.map(...)`.
*/

const line = (max: number) => z.string().trim().max(max);

/* ── Markaz haqida ────────────────────────────────────────────────────── */

export const aboutSchema = z.object({
  establishmentOrder: z.object({
    /** e.g. "PQ-4771-son qaror" — as the decree names itself. */
    reference: line(300).min(1),
    /** ISO date of the decree, for <time>. */
    date: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Sana YYYY-MM-DD koʻrinishida boʻlsin."),
  }),
  establishment: z.object({
    heading: line(300).min(1),
    body: line(5000).min(1),
  }),
  officialNaming: z.object({
    heading: line(300).min(1),
    intro: line(1000),
    /*
      Three, in practice — the state language, Russian and English. Not
      capped at three: the count is the source document's to decide, not this
      schema's. But at least one, because the section is nothing without it.

      THE RUSSIAN AND ENGLISH ENTRIES ARE NOT UZBEK TEXT and are stored in
      their own language and script. `src/content/about.ts` records why at
      length: converting a foreign-language legal name into a phonetic Latin
      Uzbek rendering invents a name that appears in no document. The page
      sets `lang` per row so a screen reader pronounces each correctly.
    */
    names: z
      .array(
        z.object({
          /** e.g. "Davlat tilida" / "Rus tilida" / "Ingliz tilida". */
          language: line(120).min(1),
          full: line(1000).min(1),
          short: line(500).min(1),
        }),
      )
      .min(1)
      .max(10),
  }),
});

export type AboutDocument = z.infer<typeof aboutSchema>;

/* ── Vazifa va funksiyalar ────────────────────────────────────────────── */

export const dutiesSchema = z.object({
  order: z.object({
    reference: line(300).min(1),
    date: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Sana YYYY-MM-DD koʻrinishida boʻlsin."),
    /** The statute's own title, quoted. */
    statuteTitle: line(1000).min(1),
  }),
  duties: z.object({
    heading: line(300).min(1),
    intro: line(2000),
    items: z.array(line(2000).min(1)).min(1).max(60),
  }),
  functions: z.object({
    heading: line(300).min(1),
    intro: line(2000),
    groups: z
      .array(
        z.object({
          /*
            The SOURCE'S OWN LETTER — a, b, v, g, d, e, j, being the Latin
            renderings of а, б, в, г, д, е, ж. It is NOT a position in a Latin
            alphabet: there is no c and no f group, and renumbering into
            a-b-c-d-e-f-g would be reorganising a legal document rather than
            transcribing it. Free text, one or two characters, so a statute
            that uses different letters is not fought with.
          */
          letter: line(4).min(1),
          heading: line(500).min(1),
          items: z.array(line(2000).min(1)).min(1).max(60),
        }),
      )
      .min(1)
      .max(30),
  }),
});

export type DutiesDocument = z.infer<typeof dutiesSchema>;

/* ── Shared ───────────────────────────────────────────────────────────── */

export const DOCUMENT_KEYS = ["about", "duties"] as const;
export type DocumentKey = (typeof DOCUMENT_KEYS)[number];

export const DOCUMENT_SCHEMAS = {
  about: aboutSchema,
  duties: dutiesSchema,
} as const;

export const DOCUMENT_LABELS: Record<DocumentKey, string> = {
  about: "Markaz haqida",
  duties: "Vazifa va funksiyalar",
};

/** Where each document is published, for the panel's "view on site" links. */
export const DOCUMENT_PATHS: Record<DocumentKey, string> = {
  about: "markaz",
  duties: "markaz/vazifalar",
};
