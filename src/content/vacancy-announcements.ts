import type { Block } from "@/types/blocks";

/*
  Vakansiya eʼlonlari — the SEEDS for migrations 13 and 16, and nothing else.

  The public page reads the `vacancies` table (lib/data/vacancies.ts); these
  records are what the migration copied into it the first time it ran. They
  are kept here rather than typed inside migrate.ts for the reason the news
  seed is: a seed that quotes its source module is checkable against it.
  Editing this file changes nothing on a running site — /admin/vakansiyalar
  does.

  SOURCE: supplied by the operator in chat on 2026-09-14 in Uzbek Cyrillic,
  and set in the site's Latin script at the operator's instruction the same
  day ("Krilcha yozuv boʻlmasin"). Transliterated by hand against the Latin
  orthography rather than by a letter-for-letter map: Cyrillic "e" -> "ye" at
  the start of a word, the hard sign -> ʼ, "tse" -> "ts", oʻ/gʻ with U+02BB
  like every other string here, and
  the month in the Latin spelling the rest of the site uses ("sentabr", not
  "sentyabr"). Wording and punctuation are the source's, its own slips
  included ("afzalik"). The one letter-level repair: "Microsoft", "Word" and
  "Excel" arrived with Cyrillic letters typed into them, and are plain Latin
  now.

  TWO STRUCTURAL CHOICES, NEITHER CHANGING A WORD:
    · "EʼLON!!!" is dropped — it is the notice-board banner, and the card the
      page renders is itself the announcement.
    · The qualifications table is set as one heading per row, not a table
      block. The block editor's table cells are single-line inputs and the
      "Qoʻshimcha talablar" cell is four lines; the first save from the panel
      would have run them together.

  `title` and `unit` are lifted out of the first paragraph — the position as
  the announcement names it — for the card's collapsed summary. The paragraph
  itself stays whole in `blocks`.

  The second announcement (`vacancySeedsV16`, Surxondaryo) was supplied on
  2026-09-24 as a .docx in Uzbek Cyrillic and set in Latin by the same rules,
  "oktabr" spelled like "sentabr". Its own wording differs from the first in
  the document list and carries a date line, kept as its first paragraph.
  The same Cyrillic letters inside "Microsoft", "Word" and "Excel" were
  repaired.
*/

export type VacancySeed = {
  title: string;
  unit: string;
  /** Last day documents are accepted, YYYY-MM-DD ("21 sentabriga qadar"). */
  deadline: string;
  testDate: string;
  email: string;
  blocks: Block[];
};

export const vacancySeeds: VacancySeed[] = [
  {
    title:
      "Namangan viloyati hududiy boshqarmasi boshligʻi oʻrinbosari – Davlat mulki obyektlarini xatlovdan oʻtkazish va samarali foydalanishni tashkil etish boʻlimi boshligʻi",
    unit: "Namangan viloyati",
    deadline: "2026-09-21",
    testDate: "2026-09-25",
    email: "markaz@davaktiv.uz",
    blocks: [
      {
        type: "paragraph",
        text: "Davlat aktivlarini boshqarish agentligi huzuridagi Davlat mulki obyektlaridan samarali foydalanish markazi (keyingi oʻrinlarda -Markaz) hozirda vakant boʻlib turgan Markazning Namangan viloyati hududiy boshqarmasi boshligʻi oʻrinbosari – Davlat mulki obyektlarini xatlovdan oʻtkazish va samarali foydalanishni tashkil etish boʻlimi boshligʻi lavozimiga tanlov eʼlon qiladi.",
      },
      {
        type: "paragraph",
        text: "Tanlovda qatnashish uchun nomzodlar 2026 yilning 21 sentabriga qadar Markazning internetdagi markaz@davaktiv.uz elektron manziliga quyidagi hujjatlarni yuborishi lozim:",
      },
      {
        type: "list",
        ordered: true,
        items: [
          "Maʼlumoti (malakasi)ni tasdiqlovchi diplom;",
          "Sertifikatlar (mavjud boʻlsa);",
          "Maʼlumotnoma (obyektivka);",
          "Boshqalar (ish tajribaga ega ekanligini koʻrsatuvchi mehnat daftarchasi nusxasi).",
        ],
      },
      {
        type: "paragraph",
        text: "Yuborilgan hujjatlar koʻrib chiqilib, nomzodlar malaka talablariga mos kelganda 2026 yil 25 sentabr kuni Markazga test topshirish uchun va suhbatdan oʻtkazish uchun (testdan oʻtganda) taklif etiladi.",
      },
      {
        type: "paragraph",
        text: "Nomzodlar orasidan eng munosib nomzod suhbat asosida Komissiya tomonidan tanlab olinadi.",
      },
      {
        type: "paragraph",
        text: "Ish haqi Markazning xarajatlar smetasi va belgilangan shtatga muvofiq belgilanadi va beriladi.",
      },
      {
        type: "heading",
        level: 2,
        text: "Nomzodlarga qoʻyiladigan malaka talablari:",
      },
      { type: "heading", level: 3, text: "Maʼlumoti" },
      {
        type: "paragraph",
        text: "Oliy, bakalavr diplomiga ega boʻlishi (magistratura, ilmiy darajaga egalik afzalik beradi).",
      },
      { type: "heading", level: 3, text: "Mutaxassislik" },
      {
        type: "paragraph",
        text: "Qoida tariqasida yuridik va moliya-iqtisodiyot, axborot kommunikatsiya, menejment, kadastr hamda arxitektura yoʻnalishlari boʻyicha.",
      },
      { type: "heading", level: 3, text: "Mehnat staji" },
      {
        type: "paragraph",
        text: "Kamida 3 yil (davlat va xoʻjalik boshqaruvi organlarida ishlaganligi afzallik beradi).",
      },
      { type: "heading", level: 3, text: "Kompyuter savodxonligi" },
      {
        type: "paragraph",
        text: "Microsoft Office dasturi (Word, Excel, Power Point va h.k), zamonaviy axborot texnologiyalarida va internet tarmogʻida mustaqil foydalanuvchi sifatida turli ish dasturlari bilan ishlash boʻyicha yetarli koʻnikmaga ega boʻlishi.",
      },
      { type: "heading", level: 3, text: "Qoʻshimcha talablar" },
      {
        type: "list",
        ordered: false,
        items: [
          "Soha boʻyicha normativ-huquqiy hujjatlarni bilishi;",
          "Mehnat qonunchiligidan toʻliq xabardor boʻlishi;",
          "Tashkilotchilik va xodimlarni boshqarish qobiliyatiga ega boʻlishi;",
          "Davlat tilini bilish (ingliz, rus va boshqa tillarni bilish afzallik hisoblanadi).",
        ],
      },
    ],
  },
];

/** Migration 16 — Surxondaryo, operator's announcement of 24.09.2026. */
export const vacancySeedsV16: VacancySeed[] = [
  {
    title:
      "Surxondaryo viloyati hududiy boshqarmasi boshligʻi oʻrinbosari – Davlat mulki obyektlarini xatlovdan oʻtkazish va samarali foydalanishni tashkil etish boʻlimi boshligʻi",
    unit: "Surxondaryo viloyati",
    deadline: "2026-10-05",
    testDate: "2026-10-09",
    email: "markaz@davaktiv.uz",
    blocks: [
      { type: "paragraph", text: "24.09.2026 yil Toshkent sh." },
      {
        type: "paragraph",
        text: "Davlat aktivlarini boshqarish agentligi huzuridagi Davlat mulki obyektlaridan samarali foydalanish markazi (keyingi oʻrinlarda -Markaz) hozirda vakant boʻlib turgan Markazning Surxondaryo viloyati hududiy boshqarmasi boshligʻi oʻrinbosari – Davlat mulki obyektlarini xatlovdan oʻtkazish va samarali foydalanishni tashkil etish boʻlimi boshligʻi lavozimiga tanlov eʼlon qiladi.",
      },
      {
        type: "paragraph",
        text: "Tanlovda qatnashish uchun nomzodlar 2026 yilning 5 oktabriga qadar Markazning internetdagi markaz@davaktiv.uz elektron manziliga quyidagi hujjatlarni yuborishi lozim:",
      },
      {
        type: "list",
        ordered: true,
        items: [
          "Maʼlumotini tasdiqlovchi hujjat (diplom);",
          "Sertifikatlar (mavjud boʻlsa);",
          "Maʼlumotnoma (obyektivka);",
          "Ish tajribaga ega ekanligini koʻrsatuvchi mehnat daftarchasi nusxasi.",
        ],
      },
      {
        type: "paragraph",
        text: "Yuborilgan hujjatlar koʻrib chiqilib, nomzodlar malaka talablariga mos kelganda 2026 yil 9 oktabr kuni Markazga test topshirish uchun va suhbatdan oʻtkazish uchun (testdan oʻtganda) taklif etiladi.",
      },
      {
        type: "paragraph",
        text: "Nomzodlar orasidan eng munosib nomzod suhbat asosida Komissiya tomonidan tanlab olinadi.",
      },
      {
        type: "paragraph",
        text: "Ish haqi Markazning xarajatlar smetasi va belgilangan shtatga muvofiq belgilanadi va beriladi.",
      },
      {
        type: "heading",
        level: 2,
        text: "Nomzodlarga qoʻyiladigan malaka talablari:",
      },
      { type: "heading", level: 3, text: "Maʼlumoti" },
      {
        type: "paragraph",
        text: "Oliy, bakalavr diplomiga ega boʻlishi (magistratura, ilmiy darajaga egalik afzalik beradi).",
      },
      { type: "heading", level: 3, text: "Mutaxassislik" },
      {
        type: "paragraph",
        text: "Qoida tariqasida yuridik va moliya-iqtisodiyot, axborot kommunikatsiya, menejment, kadastr hamda arxitektura yoʻnalishlari boʻyicha.",
      },
      { type: "heading", level: 3, text: "Mehnat staji" },
      {
        type: "paragraph",
        text: "Kamida 3 yil (davlat va xoʻjalik boshqaruvi organlarida ishlaganligi afzallik beradi).",
      },
      { type: "heading", level: 3, text: "Kompyuter savodxonligi" },
      {
        type: "paragraph",
        text: "Microsoft Office dasturi (Word, Excel, Power Point va h.k), zamonaviy axborot texnologiyalarida va internet tarmogʻida mustaqil foydalanuvchi sifatida turli ish dasturlari bilan ishlash boʻyicha yetarli koʻnikmaga ega boʻlishi.",
      },
      { type: "heading", level: 3, text: "Qoʻshimcha talablar" },
      {
        type: "list",
        ordered: false,
        items: [
          "Soha boʻyicha normativ-huquqiy hujjatlarni bilishi;",
          "Mehnat qonunchiligidan toʻliq xabardor boʻlishi;",
          "Tashkilotchilik va xodimlarni boshqarish qobiliyatiga ega boʻlishi;",
          "Davlat tilini bilish (ingliz, rus va boshqa tillarni bilish afzallik hisoblanadi).",
        ],
      },
    ],
  },
];
