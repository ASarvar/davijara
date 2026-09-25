/*
  Normativ huquqiy hujjatlar loyihalari — documents published under
  /hujjatlar/loyihalar, newest first.

  Each entry is a file the operator supplied whole; the PDF itself is under
  public/hujjatlar/loyihalar/ and nothing in it is retyped here. `title` and
  `subject` are the document's own heading and its "1. Normativ-huquqiy
  hujjat turi, nomi va rekvizitlari" line, set in the site's Latin script by
  the same hand-transliteration rules as content/vacancy-announcements.ts.
  The PDF stays in the Cyrillic it was issued in.

  One LANGUAGE: these are document titles, and ru/en would need the official
  wording, not a rendering invented here — the page shows the Uzbek on every
  locale, as /eng-kam-stavkalar does for its decision title.
*/

export type DocumentDraft = {
  /** Stable key; also the React key. */
  id: string;
  title: string;
  /** The act the document concerns, as the document names it. */
  subject: string;
  /** Who prepared it, as the document names it. */
  issuer: string;
  /** The document's own date, YYYY-MM-DD. */
  date: string;
  /** Path under public/. */
  file: string;
};

export const documentDrafts: DocumentDraft[] = [
  {
    /*
      Supplied 2026-09-25 as "_ТСТБ_ҳисоботи_Ижара тўғрисида.pdf", 11 pages.
      "427-XII": the source types the X as a Cyrillic Х; set as Latin here.
    */
    id: "ttb-ijara-togrisida-2026-09-25",
    title:
      "Normativ-huquqiy hujjatning tartibga solish taʼsirini baholash boʻyicha hisobot",
    subject:
      "Oʻzbekiston Respublikasi 1991 yil 19 noyabrdagi “Ijara toʻgʻrisida”gi 427-XII-son Qonuni",
    issuer: "Oʻzbekiston Respublikasi Davlat aktivlarini boshqarish agentligi",
    date: "2026-09-25",
    file: "/hujjatlar/loyihalar/ttb-hisoboti-ijara-togrisida-2026-09-25.pdf",
  },
];
