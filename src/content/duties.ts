/**
 * Vazifa va funksiyalar — the Centre's duties and functions.
 *
 * VERBATIM, TRANSLITERATED FROM THE OPERATOR'S CYRILLIC SUPPLY — same rule
 * and same reasoning as src/content/about.ts: this is a script change to
 * match the rest of the site's Latin Uzbek, not a rewording. See that file's
 * header for the fuller account.
 *
 * SOURCE: "Oʻzbekiston Respublikasi Davlat aktivlarini boshqarish agentligi
 * huzuridagi Davlat mulki obyektlaridan samarali foydalanish markazi
 * toʻgʻrisida"gi nizom, Vazirlar Mahkamasining 2024-yil 11-yanvardagi 23-son
 * qarori bilan tasdiqlangan.
 *
 * THE LETTERING IS THE SOURCE'S OWN. Functions are grouped a), b), v), g),
 * d), e), j) — the Latin renderings of the Cyrillic а, б, в, г, д, е, ж the
 * statute itself uses, in that order. It is not a Latin a-b-c-d-e-f-g
 * sequence (there is no c or f group) and must not be renumbered into one;
 * that would be reorganising a legal document, not transcribing it.
 *
 * Corrections come from the source statute, not from editing prose here.
 */

import type { FunctionGroup } from "@/types/content";

/** Approved by — cited so the two lists below it can be checked against it. */
export const dutiesOrder = {
  reference: "Vazirlar Mahkamasining 23-son qarori",
  /** ISO form of the resolution date, for <time>. */
  date: "2024-01-11",
  /** The statute's own title, quoted. */
  statuteTitle:
    "“Oʻzbekiston Respublikasi Davlat aktivlarini boshqarish agentligi huzuridagi Davlat mulki obyektlaridan samarali foydalanish markazi toʻgʻrisida”gi nizom",
};

export const dutiesHeading = "Markazning vazifalari";

export const dutiesIntro =
  "Vazirlar Mahkamasining 2024-yil 11-yanvardagi 23-son qarori bilan tasdiqlangan “Oʻzbekiston Respublikasi Davlat aktivlarini boshqarish agentligi huzuridagi Davlat mulki obyektlaridan samarali foydalanish markazi toʻgʻrisida”gi nizomga koʻra, quyidagilar Markazning asosiy vazifalari hisoblanadi:";

export const duties: string[] = [
  "davlat mulki boʻlgan boʻsh turgan noturar bino va inshootlarni, foydalanilmayotgan ishlab chiqarish maydonlarini (keyingi oʻrinlarda — boʻsh turgan davlat mulki obyektlari) aniqlash va ularning hisobini yuritish;",
  "davlat mulki obyektlaridan samarali foydalanish, shu jumladan, boʻsh turgan davlat mulki obyektlarini saqlash va ijaraga berishni tashkil etish;",
  "ijaraga berilgan davlat mulki obyektlarining hisobini yuritish;",
  "ijaraga berilgan davlat mulkidan foydalanganlik uchun toʻlovlar toʻliq amalga oshirilishini va kelib tushgan ijara mablagʻlari qonunchilikda belgilangan tartibda taqsimlanishining hisobini yuritish;",
  "davlat tashkilotlariga biriktirilgan davlat mulki obyektlaridan samarali va maqsadli foydalanilishini belgilangan tartibda tekshirish;",
  "davlat tashkilotlariga operativ boshqaruv huquqi bilan berilgan davlat mulki obyektlarining ortiqcha qismini, shuningdek, foydalanilmayotgan yoki maqsadsiz foydalanilayotgan davlat mulki obyektlarini olib qoʻyish;",
  "Qurilish va uy-joy kommunal xoʻjaligi sohasida nazorat qilish inspeksiyasining xulosasiga asosan yaroqsiz deb topilgan davlat mulki obyektlarini buzish toʻgʻrisida qaror qabul qilish.",
];

export const functionsHeading = "Markazning funksiyalari";

export const functionsIntro =
  "Markaz oʻziga yuklangan vazifalarga muvofiq quyidagi funksiyalarni amalga oshiradi:";

export const functionGroups: FunctionGroup[] = [
  {
    letter: "a",
    heading:
      "davlat mulki obyektlarini aniqlash va ularning hisobini yuritish sohasida",
    items: [
      "davlat mulki obyektlarini xatlovdan oʻtkazgan holda, hududlarda boʻsh turgan davlat mulki obyektlarini aniqlaydi va xatlov ishlarini muvofiqlashtiradi;",
      "davlat mulki obyektlari boʻyicha elektron maʼlumotlar bazasi yaratilishi hamda uning doimiy yangilab borilishini taʼminlaydi;",
      "boʻsh turgan davlat mulki obyektlarining elektron maʼlumotlar bazasi orqali yagona hisobini yuritadi;",
      "boʻsh turgan davlat mulki obyektlari toʻgʻrisidagi maʼlumotlarni toʻliq va sifatli yuritish boʻyicha Oʻzbekiston Respublikasi Iqtisodiyot va moliya vazirligi huzuridagi Kadastr agentligi bilan elektron maʼlumotlar almashish tizimi yoʻlga qoʻyilishini taʼminlaydi;",
      "elektron maʼlumotlar bazasiga kiritilgan boʻsh turgan davlat mulki obyektlarini tahlil qiladi;",
      "boʻsh turgan davlat mulki obyektlaridan samarali foydalanishni tashkil etishni takomillashtirish boʻyicha takliflar ishlab chiqadi va Davaktiv agentligiga kiritadi;",
      "davlat mulki obyektlari, shu jumladan boʻsh turgan davlat mulki obyektlaridan samarali foydalanish boʻyicha amalga oshirilgan ishlar yuzasidan tahliliy maʼlumotlarni tayyorlaydi va Davaktiv agentligiga kiritadi;",
      "boʻsh turgan davlat mulki obyektlarining yagona hisobini yuritish boʻyicha maʼlumotlar bazasining samarali ishlashini qoʻllab-quvvatlashni taʼminlab borish choralarini koʻradi;",
      "boʻsh turgan davlat mulki obyektlari toʻgʻrisidagi maʼlumotlar (obyekt toʻgʻrisidagi qisqa maʼlumot, geolokatsiya joylashuvi va boshqalar)ni oʻzining rasmiy veb-saytida joylashtiradi va har oyda yangilab boradi;",
    ],
  },
  {
    letter: "b",
    heading:
      "boʻsh turgan davlat mulki obyektlarini saqlash va ulardan samarali foydalanish, shu jumladan, ularni ijaraga berishni tashkil etish sohasida",
    items: [
      "Markaz va uning hududiy boshqarmalari tasarrufiga olingan boʻsh turgan davlat mulki obyektlaridan samarali foydalanishni tashkil etadi;",
      "boʻsh turgan davlat mulki obyektlaridan samarali foydalanishni tashkil etishga qadar ularning but saqlanishini taʼminlaydi;",
      "davlat mulkini ijaraga berish ishlarini belgilangan tartibda tashkil etadi;",
      "davlat mulkini ijaraga berish jarayoni ochiqligi va shaffofligini taʼminlaydi;",
      "hududi 2 000 kvadrat metrgacha boʻlgan boʻsh turgan davlat mulki obyektlarini hokim yordamchilarining va jismoniy shaxslarning elektron buyurtnomalariga asosan Davaktiv agentligi tomonidan tasdiqlangan tartib asosida ijaraga berish uchun toʻgʻridan-toʻgʻri onlayn-auksion savdolariga chiqaradi;",
      "yuridik shaxs va tadbirkorlik subyektlariga davlat mulki obyektlarini ijaraga olishlarida zarur maʼlumotlarni berish barobarida targʻibot-tushuntirish ishlarini amalga oshirish orqali amaliy-huquqiy yordam koʻrsatadi;",
    ],
  },
  {
    letter: "v",
    heading:
      "ijaraga berilgan davlat mulki obyektlarining hisobini yuritish sohasida",
    items: [
      "ijaraga berilgan davlat mulkidan foydalanganlik uchun toʻlovlar toʻliq amalga oshirilishining va kelib tushgan ijara mablagʻlari qonunchilikda belgilangan tartibda taqsimlanishining hisobini yuritadi;",
      "ijaraga va tekin foydalanishga berilgan davlat mulklarining «online-ijara.uz» axborot tizimi orqali hisobini yuritadi;",
      "ijaraga berilgan davlat mulki obyektlari toʻgʻrisidagi maʼlumotlarni Soliq qoʻmitasi bilan elektron maʼlumotlar almashish tizimi yoʻlga qoʻyilishini taʼminlaydi;",
      "ijaraga berilgan davlat mulki obyektlari boʻyicha amalga oshirilgan ishlar yuzasidan tahliliy maʼlumotlarni tayyorlaydi va Davaktiv agentligiga kiritadi;",
      "ijara shartnomasi shartlarining bajarilishi monitoringini yuritadi;",
    ],
  },
  {
    letter: "g",
    heading:
      "ijaraga berilgan davlat mulkidan foydalanganlik uchun toʻlovlar toʻliq amalga oshirilishining va kelib tushgan ijara mablagʻlar qonunchilikda belgilangan tartibda taqsimlanishining hisobini yuritish sohasida",
    items: [
      "ijaraga berilgan davlat mulki boʻyicha har oyda undirilgan ijara toʻlovlari va ularning taqsimlanishi toʻgʻrisidagi hisobotlarni yuritadi;",
      "ijaraga berilgan va beriladigan davlat mulki, undirilgan ijara toʻlovlari va ularning taqsimlanishi toʻgʻrisidagi maʼlumotlarni umumlashtiradi;",
      "ijaraga berilgan va beriladigan davlat mulki, undirilgan ijara toʻlovlari va ularning taqsimlanishi toʻgʻrisida umumlashtirilgan maʼlumotlarni Davaktiv agentligiga har oylik maʼlumotlarni hisobot oyidan keyingi oyning 15-sanasiga qadar taqdim etadi;",
    ],
  },
  {
    letter: "d",
    heading:
      "davlat tashkilotlariga biriktirilgan davlat mulki obyektlaridan samarali va maqsadli foydalanilishi hamda ularning saqlanishini belgilangan tartibda tekshirish sohasida",
    items: [
      "davlat mulki obyektlaridan samarali yoki maqsadsiz foydalanilayotganligini tekshirish boʻyicha belgilangan tartibda joylarga chiqilishini tashkil etadi;",
      "davlat mulki obyektlarini xatlovdan oʻtkazish, ularning joriy holati hamda samarali foydalanilishini oʻrganish yuzasidan hududiy boshqarmalar faoliyatini tashkil etishni belgilovchi meʼyoriy hujjatlarni qabul qiladi va ularning ijrosini taʼminlaydi;",
      "respublika va mahalliy ijro etuvchi hokimiyat organlarining maʼmuriy binolarida xodimlarni joylashtirish meʼyorlariga asosan maʼmuriy binolarni oʻrganadi, tahlil qiladi va ulardan samarali foydalanish choralarini koʻradi;",
      "boʻsh turgan va maqsadsiz foydalanilayotgan davlat mulki obyektlaridan samarali foydalanish boʻyicha takliflarni ishlab chiqadi va Davaktiv agentligiga taqdim etadi;",
    ],
  },
  {
    letter: "e",
    heading:
      "davlat tashkilotlariga operativ boshqaruv huquqi bilan berilgan davlat mulki obyektlarining ortiqcha qismini, shuningdek, foydalanilmayotgan yoki maqsadsiz foydalanilayotgan davlat mulki obyektlarini olib qoʻyish sohasida",
    items: [
      "boʻsh turgan, maqsadsiz va samarasiz foydalanilayotgan davlat mulki obyektlari boʻyicha maʼlumotlarni umumlashtirib, manfaatdor tomonlar bilan oʻrganib chiqadi;",
      "oʻrganish natijalariga koʻra boʻsh turgan, maqsadsiz va samarasiz foydalanilayotgan davlat mulki obyektlari (ularning bir qismi)ni Markaz yoki hududiy boshqarmalar balansiga olish boʻyicha qaror qabul qiladi;",
      "hududiy boshqarmalar tomonidan boʻsh turgan davlat mulki obyektlarini balansga olish boʻyicha qarorlar qabul qilinishi va ularning ijrosi taʼminlanishini nazorat qiladi;",
      "boʻsh turgan davlat mulki obyektlarini, Oʻzbekiston Respublikasi Investitsiya dasturiga kiritilgan obyektlar bundan mustasno, saqlash va ulardan kelgusida samarali foydalanish (xususiylashtirish, ijaraga berish va boshqa) maqsadida Markaz va hududiy boshqarmalar balansiga oladi;",
    ],
  },
  {
    letter: "j",
    heading:
      "Qurilish va uy-joy kommunal xoʻjaligi sohasida nazorat qilish inspeksiyasi xulosasiga asosan yaroqsiz deb topilgan davlat mulki obyektlarini buzish toʻgʻrisida qaror qabul qilish sohasida",
    items: [
      "hududiy boshqarmalar tomonidan boʻsh turgan davlat mulki obyektlarini buzish boʻyicha qarorlar Qurilish va uy-joy kommunal xoʻjaligi sohasida nazorat qilish inspeksiyasining xulosasi asosida qabul qilinishini nazoratga oladi;",
      "hududiy boshqarmalar tomonidan davlat mulki obyektlarini buzish boʻyicha qabul qilingan qarorlar ijrosi taʼminlanishi va buzishdan boʻshagan yer maydonlari mahalliy ijro etuvchi hokimiyat zaxirasiga olinishi boʻyicha maʼlumotlarni umumlashtiradi va monitoringini yuritadi.",
    ],
  },
];
