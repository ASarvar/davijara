import type { OrgBranch, OrgUnit } from "@/types/content";

/*
  Markaziy apparat TUZILMASI — the central apparatus org chart.

  ┌──────────────────────────────────────────────────────────────────────────┐
  │ VERBATIM FROM THE ORDER. Same rule as src/content/privileges.ts.         │
  │                                                                          │
  │ Every unit name and every staff figure below is transcribed from         │
  │ "Markaz direktorining 2026-yil «14»-iyuldagi 27-I/ch-son buyrug'iga      │
  │ 1-ilova". Do not reword, shorten, re-order or translate them. A          │
  │ department's name in a state body's structure is the name in the order   │
  │ that created it; "tidying" one here would put a name on this portal that │
  │ exists nowhere in law.                                                   │
  │                                                                          │
  │ Corrections come from a NEW order, not from editing prose here.          │
  └──────────────────────────────────────────────────────────────────────────┘

  HOW THE HIERARCHY WAS READ. The source is a PDF whose boxes carry no
  parent/child data — the reporting lines are drawn as vector paths. They were
  extracted from the content stream rather than guessed from where the boxes
  happen to sit:

    * a distribution bar at y≈404 runs from the director's box out to x≈646;
    * it drops into the first deputy (x≈157) and the deputy (x≈353);
    * at x≈646 it turns down into a vertical bus that runs to y≈162, and NINE
      short horizontal connectors leave that bus — four to the left column,
      five to the right.

  So those nine report to the DIRECTOR, not to either deputy, even though
  four of them are drawn level with the deputies. Each deputy has exactly one
  unit under them.

  The last of the nine — the territorial administrations — is drawn with a
  DASHED box and a dashed connector, which is the chart saying it is outside
  the central apparatus this document describes. That is `external: true`.
*/

/** The citation that heads the source document. Verbatim; never localise. */
export const orgOrder = {
  reference:
    "Markaz direktorining 2026-yil «14»-iyuldagi 27-I/ch-son buyrugʻiga 1-ilova",
  /** ISO form of the order date, for <time>. */
  date: "2026-07-14",
  /**
   * The organisation named in the document's own title.
   *
   * NOTE — this is NOT the string in `site.operator`, which reads "Davlat
   * mulki obyektlaridan foydalanish markazi". The order says "... obyektlaridan
   * SAMARALI foydalanish markazi". Kept as the order writes it and flagged
   * rather than silently reconciled: which spelling is current is a question
   * for the operator, not something to settle by editing one of them.
   */
  organisation:
    "Oʻzbekiston Respublikasi Davlat aktivlarini boshqarish agentligi huzuridagi Davlat mulki obyektlaridan samarali foydalanish markazining markaziy apparati tuzilmasi",
} as const;

export const orgHead = "Markaz direktori";

/** The two deputies, left to right as the chart draws them. */
export const orgBranches: OrgBranch[] = [
  {
    id: "first-deputy",
    title: "Direktorning birinchi oʻrinbosari",
    icon: "IdCard",
    units: [
      {
        id: "xatlov",
        icon: "ClipboardList",
        name: "Davlat mulki obyektlarini xatlovdan oʻtkazish va samarali foydalanishni tashkil etish boʻlimi",
        staff: 4,
      },
    ],
  },
  {
    id: "deputy",
    title: "Direktor oʻrinbosari",
    icon: "IdCard",
    units: [
      {
        id: "it",
        icon: "Cpu",
        name: "Axborot texnologiyalari va kiberxavfsizlikni taʼminlash boʻlimi",
        staff: 2,
      },
    ],
  },
];

/**
 * The nine boxes wired straight to the director's bar, in the chart's own
 * reading order: down the middle column first, then down the right one.
 */
export const orgDirectUnits: OrgUnit[] = [
  {
    id: "shartnoma",
    icon: "Handshake",
    name: "Shartnoma munosabatlarini muvofiqlashtirish va ijara obyektlari hisobini yuritish hamda ijara toʻlovlari taʼminlanishini va taqsimlanishini nazorat qilish boʻlimi",
    staff: 5,
  },
  {
    id: "metodologiya",
    icon: "PieChart",
    name: "Metodologiya va axborot-tahlil boʻlimi",
    staff: 2,
  },
  { id: "buxgalteriya", icon: "Calculator", name: "Buxgalteriya", staff: 1 },
  {
    id: "inson-resurslari",
    icon: "Users",
    name: "Inson resurslari va xodimlar salohiyatini rivojlantirish boʻlimi",
    staff: 2,
  },
  {
    id: "korrupsiya",
    icon: "ShieldCheck",
    name: "Korrupsiyaga qarshi kurashish boʻlimi",
    staff: 1,
    href: "/markaz/korrupsiyaga-qarshi",
  },
  { id: "yuriskonsult", icon: "Scale", name: "Bosh yuriskonsult", staff: 1 },
  { id: "ichki-audit", icon: "FileSearch", name: "Ichki audit", staff: 1 },
  {
    id: "devonxona",
    icon: "Inbox",
    name: "Ijro intizomini nazorati va murojaatlar bilan ishlash boʻlimi (devonxona)",
    staff: 1,
  },
  {
    id: "hududiy",
    icon: "MapPin",
    name: "Davlat mulki obyektlaridan samarali foydalanish markazining hududiy boshqarmalari",
    external: true,
    href: "/markaz/hududiy-boshqarmalar",
  },
];
