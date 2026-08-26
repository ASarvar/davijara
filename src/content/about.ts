/**
 * Markaz haqida — establishment and official naming.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ VERBATIM. Same rule as src/content/privileges.ts and structure.ts.       │
 * │                                                                          │
 * │ The operator supplied this text directly, in Cyrillic — the script the   │
 * │ source order and statute themselves use. Every field below is a          │
 * │ TRANSLITERATION, not a translation: same words, same order, same legal   │
 * │ meaning, only the alphabet changed, to match the Latin script every      │
 * │ other Uzbek string on this site is written in (`Oʻzbekiston`, not        │
 * │ `Ўзбекистон`). Uzbek has used both scripts officially since 1993; this   │
 * │ is the same choice `messages/uz.json` already makes for every other      │
 * │ string, not a rewording of this one.                                    │
 * │                                                                          │
 * │ THE RUSSIAN AND ENGLISH OFFICIAL NAMES ARE NOT TRANSLITERATED — they are │
 * │ left exactly as supplied, in Russian and English. Converting a foreign-  │
 * │ language legal name into a phonetic Latin-Uzbek rendering would be       │
 * │ inventing a name that appears in no document; these two are quoted, not  │
 * │ rendered.                                                                │
 * │                                                                          │
 * │ Corrections come from the source order/statute, not from editing prose   │
 * │ here.                                                                    │
 * └──────────────────────────────────────────────────────────────────────────┘
 */

import type { OfficialName } from "@/types/content";

/** Established by — cited so the paragraph below it can be checked against it. */
export const establishmentOrder = {
  reference: "PQ-4771-son qaror",
  /** ISO form of the decree date, for <time>. */
  date: "2020-07-01",
};

export const establishment = {
  heading: "Markazning tashkil etilishi",
  body: "Oʻzbekiston Respublikasi Davlat aktivlarini boshqarish agentligi huzuridagi Davlat mulki obyektlaridan samarali foydalanish markazi (avvalgi nomi — Boʻsh turgan obyektlardan samarali foydalanishni tashkil etish markazi) Oʻzbekiston Respublikasi Prezidentining “Boʻsh turgan obyektlardan samarali foydalanishni tashkil etish va axborot-kommunikatsiya texnologiyalarini keng joriy etish chora-tadbirlari toʻgʻrisida”gi 2020-yil 1-iyuldagi PQ-4771-son qaroriga asosan tashkil etilgan.",
};

export const officialNaming = {
  heading: "Markazning nomi va joylashgan joyi",
  intro: "Markazning rasmiy nomlanishi:",
  names: [
    {
      language: "Davlat tilida",
      full: "Oʻzbekiston Respublikasi Davlat aktivlarini boshqarish agentligi huzuridagi Davlat mulki obyektlaridan samarali foydalanish markazi",
      short: "Davlat obyektlaridan foydalanish markazi",
    },
    {
      // Left in Russian — see the file header.
      language: "Rus tilida",
      full: "Центр по эффективному использованию объектов государственной собственности при Агентстве по управлению государственными активами Республики Узбекистан",
      short: "Центр по использованию гособъектов",
    },
    {
      // Left in English — see the file header.
      language: "Ingliz tilida",
      full: "Center for the efficient use of state facilities under the State Assets Management Agency of the Republic of Uzbekistan",
      short: "Center for the use of state facilities",
    },
  ] satisfies OfficialName[],
};
