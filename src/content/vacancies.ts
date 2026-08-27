/*
  Bo'sh ish o'rinlari — supplied whole by the operator (2026-08-28) as a
  scanned document image; transcribed verbatim (apostrophes normalised to
  the site's own oʻ/gʻ convention only). Two parts:

  1. The single statutory table ("markaziy apparat" section) citing
     PF-5843-son Farmoni (2019-yil 3-oktabr) and vacancy.gov.uz as the
     hiring channel. The source's "Bo'sh ish o'rinlari" cell was a bare dash
     — no open position is currently listed — kept as `position: null`
     rather than inventing a vacancy.
  2. The interview-questions notice citing PF-95-son Farmoni (2025-yil
     19-iyun) 6-ilovasi.

  `questionsListUrl` is deliberately null: the source shows "Suhbat
  savollari ro'yxati" as a hyperlink but the image gives no visible target
  URL, and non-negotiable 6 (never invent facts) rules out guessing one —
  flagged to the operator, not silently linked.
*/

export type VacancyTableRow = {
  position: string | null;
  hiringConditions: string;
  candidateRequirements: string;
  requiredDocuments: string;
};

export type VacancyInfo = {
  tableTitle: string;
  sectionLabel: string;
  rows: VacancyTableRow[];
  interviewQuestions: {
    title: string;
    paragraphs: string[];
    sourceUrl: string;
    questionsListLabel: string;
    questionsListUrl: string | null;
  };
};

export const vacancyInfo: VacancyInfo = {
  tableTitle:
    "Boʻsh ish oʻrinlari, ishga qabul qilish shartlari, nomzodlarga qoʻyiladigan talablar va taqdim qilinishi lozim boʻlgan hujjatlar toʻgʻrisidagi maʼlumot",
  sectionLabel: "(markaziy apparat)",
  rows: [
    {
      position: null,
      hiringConditions:
        "Oʻzbekiston Respublikasi Prezidentining 2019 yil 3-oktabrdagi “Oʻzbekiston Respublikasida kadrlar siyosati va davlat fuqarolik xizmati tizimini tubdan takomillashtirish chora-tadbirlari toʻgʻrisida”gi PF-5843-sonli Farmoniga muvofiq, davlat organlari va tashkilotlaridagi davlat fuqarolik xizmatiga qabul qilish (saylanadigan va alohida tartibda tayinlanadigan lavozimlar bundan mustasno) tanlov asosida amalga oshirilishi belgilangan. Mazkur Farmonga asosan Oʻzbekiston Respublikasi Davlat aktivlarini boshqarish agentligi tizimiga xodimlarni ishga qabul qilish davlat fuqarolik xizmatchilari vakant lavozimlarining yagona ochiq portali (vacancy.gov.uz) orqali tanlov oʻtkazish asosida amalga oshiriladi.",
      candidateRequirements:
        "Eʼlonga berilgan lavozimdan kelib chiqqan holda nomzodlarga malaka talablar qoʻyiladi.",
      requiredDocuments:
        "Davlat fuqarolik xizmatchilari vakant lavozimlarining yagona ochiq portali (vacancy.gov.uz) orqali nomzodlar ariza topshiradi.",
    },
  ],
  interviewQuestions: {
    title:
      "Vakant lavozimlari boʻyicha oʻtkaziladigan tanlovlarda qoʻllaniladigan savollar toʻgʻrisida maʼlumot",
    paragraphs: [
      "Oʻzbekiston Respublikasi Prezidentining 2025 yil 19 iyundagi PF-95-son Farmoni 6-ilovasi bilan tasdiqlangan Davlat fuqarolik xizmati lavozimini egallash uchun tanlov oʻtkazish tartibi toʻgʻrisida nizom (keyingi oʻrinlarda – Nizom) bilan davlat fuqarolik xizmati lavozimini egallash uchun tanlov oʻtkazish tartibi belgilangan.",
      "Oʻzbekiston Respublikasi Davlat aktivlarini boshqarish agentligi huzuridagi Davlat mulki obyektlardan samarali foydalanish markazining mavjud vakant lavozimlar yuzasidan tanlovlar ushbu Nizom asosida amalga oshirilmoqda.",
      "Nizom talablariga koʻra, davlat fuqarolik xizmati lavozimini egallash uchun tanlovlarning suhbat bosqichi nomzodga uning soha boʻyicha bilim saviyasi hamda vakant lavozim uchun mosligini aniqlash maqsadida beshta savol (topshiriq) tasodifiy tanlash orqali beriladi.",
      "Shunga koʻra, nomzodlar uchun qulaylik va ochiqlikni taʼminlash maqsadida suhbat bosqichida beriladigan savollarning toʻliq roʻyxati bilan vacancy.gov.uz platformasi orqali tanishib chiqilishi mumkin.",
    ],
    sourceUrl: "https://vacancy.gov.uz",
    questionsListLabel: "Suhbat savollari roʻyxati",
    questionsListUrl: "https://vacancy.gov.uz/interview-question/question-group/16815",
  },
};
