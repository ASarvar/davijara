import type { Block } from "@/types/blocks";

/*
  Maxfiylik siyosati and Foydalanish shartlari — the SEED for migration 17,
  which writes them to the panel as DRAFTS. Nothing here is on the site until
  an editor opens /admin/sahifalar, reviews the text and presses Eʼlon qilish.

  WHY DRAFTS, NOT PUBLISHED. These are the operator's legal statements, and
  a state portal's privacy policy and terms bind the Markaz. They were
  written on 2026-09-26 at the operator's request as a starting point, not
  approved text, so saving them and making them public stay two separate
  acts — the rule every page and news item in the panel already follows.

  EVERY FACTUAL CLAIM IN THE PRIVACY POLICY IS WHAT THE CODE DOES, checked
  the same day:
    · no public form collects personal data; filters travel in the URL;
    · the visitor counter sets no cookie and stores only
      sha256(ip + ua + daily salt), truncated — app/api/hit/route.ts;
      per-visit rows pruned after three days, daily totals kept
      (VISIT_KEEP_MS, migration notes on traffic_visit / traffic_day);
    · Yandex.Metrika counter 112173374 is live with clickmap, trackLinks and
      accurateTrackBounce, webvisor OFF — components/layout/yandex-metrica.tsx;
    · the only first-party cookie is NEXT_LOCALE (seen in the live response
      headers); theme, contrast, text size and read-aloud settings live in
      localStorage;
    · read-aloud text goes to Azure FROM THE SERVER, and only text that is on
      the page — app/api/tts/route.ts;
    · map tiles come from tile.openstreetmap.org, requested by the browser —
      lib/map-tiles.ts; lot photos are proxied through /api/lot-image, so
      the browser does not contact e-auksion for them;
    · winners' and bidders' personal data never reach a page (davijara-data).
  Change what the site does and this text must change with it.

  WHAT IS DELIBERATELY NOT WRITTEN, because it is the operator's to decide
  and would otherwise be invented: a retention period for the web server's
  logs, a licence for reusing the portal's materials, and a law number (the
  Law "On personal data" is cited by its name only).

  Uzbek only: an editor adds ru/en in the panel, and until then the reader
  gets Uzbek — the same fallback every panel page has.
*/

export type LegalDraft = {
  path: string;
  navKey: string;
  /** Meta description — search results and link previews, not on the page. */
  description: string;
  blocks: Block[];
};

const CONTACT: Block = {
  type: "paragraph",
  text: "Savollaringizni info@davijara.uz elektron manziliga yoki (71) 259-22-70 telefon raqamiga yoʻllashingiz mumkin.",
};

const CHANGES = (what: string): Block => ({
  type: "paragraph",
  text: `Markaz ${what} oʻzgartirish kiritishi mumkin. Amaldagi tahriri doimo shu sahifada eʼlon qilinadi.`,
});

export const legalDrafts: LegalDraft[] = [
  {
    path: "maxfiylik",
    navKey: "privacy",
    description:
      "Davijara.uz portali tashrif davomida qanday maʼlumotlarni qayta ishlashi, cookie fayllari va statistika xizmatlari haqida.",
    blocks: [
      {
        type: "paragraph",
        text: "Ushbu siyosat Davlat mulki obyektlaridan samarali foydalanish markazi (keyingi oʻrinlarda – Markaz) tomonidan yuritiladigan Davijara.uz portali (keyingi oʻrinlarda – Portal) sizning tashrifingiz davomida qanday maʼlumotlarni qayta ishlashini tushuntiradi.",
      },
      { type: "heading", level: 2, text: "Shaxsga doir maʼlumotlar" },
      {
        type: "paragraph",
        text: "Portaldan foydalanish uchun roʻyxatdan oʻtish talab etilmaydi. Portalning ochiq qismida ism, telefon raqami, pasport maʼlumotlari yoki boshqa shaxsga doir maʼlumotlarni kiritish shakllari mavjud emas.",
      },
      {
        type: "paragraph",
        text: "Qidiruv va saralash shakllari faqat siz tanlagan shartlarni (hudud, tuman, maydon, narx, savdo kuni) sahifa manzilida uzatadi va ular alohida saqlanmaydi.",
      },
      {
        type: "paragraph",
        text: "Portalda eʼlon qilinadigan savdo natijalarida gʻoliblar va savdo ishtirokchilarining shaxsga doir maʼlumotlari koʻrsatilmaydi.",
      },
      { type: "heading", level: 2, text: "Tashriflar statistikasi" },
      {
        type: "paragraph",
        text: "Portal tashriflar sonini oʻz hisoblagichi orqali yuritadi va buning uchun cookie fayllarini oʻrnatmaydi. IP manzil va brauzer turi saqlanmaydi: ulardan har kuni almashadigan tasodifiy kalit bilan bir tomonlama xesh hisoblanadi va faqat shu xeshning qisqa qismi saqlanadi. Undan IP manzilni tiklab boʻlmaydi, turli kunlardagi tashriflarni esa bir-biriga bogʻlab boʻlmaydi. Alohida tashriflar yozuvlari uch kundan soʻng oʻchiriladi, faqat kunlik umumiy sonlar saqlanadi.",
      },
      {
        type: "paragraph",
        text: "Portalda Yandex.Metrika xizmati ham qoʻllaniladi. U koʻrilgan sahifalar, bosishlar xaritasi va tashqi havolalarga oʻtishlar haqida umumlashtirilgan statistika yigʻadi va brauzeringizga oʻz cookie fayllarini oʻrnatadi. Sessiyalarni yozib olish (Vebvizor) funksiyasi yoqilmagan. Bu maʼlumotlar Yandex kompaniyasining maxfiylik siyosatiga muvofiq qayta ishlanadi.",
      },
      {
        type: "heading",
        level: 2,
        text: "Cookie fayllari va brauzer xotirasi",
      },
      {
        type: "list",
        ordered: false,
        items: [
          "NEXT_LOCALE – tanlangan tilni (oʻzbek, rus yoki ingliz) eslab qolish uchun;",
          "Yandex.Metrika cookie fayllari – yuqorida koʻrsatilgan statistika uchun;",
          "rang sxemasi, yuqori kontrast, matn oʻlchami va ovozli oʻqish sozlamalari brauzeringizning mahalliy xotirasida (localStorage) saqlanadi va serverga yuborilmaydi.",
        ],
      },
      {
        type: "paragraph",
        text: "Cookie fayllarini brauzer sozlamalari orqali oʻchirishingiz yoki taqiqlashingiz mumkin. Portalning asosiy imkoniyatlari ularsiz ham ishlaydi.",
      },
      { type: "heading", level: 2, text: "Matnni ovoz bilan oʻqish" },
      {
        type: "paragraph",
        text: "“Matnni ovoz bilan oʻqish” funksiyasi yoqilganda siz belgilagan matn nutqqa aylantirish uchun Microsoft Azure xizmatiga yuboriladi. Faqat Portal sahifasidagi matn yuboriladi. Soʻrov Portal serveri orqali amalga oshiriladi, shuning uchun IP manzilingiz ushbu xizmatga uzatilmaydi.",
      },
      { type: "heading", level: 2, text: "Uchinchi tomon xizmatlari" },
      {
        type: "paragraph",
        text: "Xaritalar OpenStreetMap xizmatidan yuklanadi: xarita koʻrsatilganda brauzeringiz uning serverlariga bevosita murojaat qiladi va ular IP manzilingizni OpenStreetMap Foundation siyosatiga muvofiq qayta ishlaydi.",
      },
      {
        type: "paragraph",
        text: "Portaldagi e-auksion.uz, online-ijara.uz, lex.uz va boshqa saytlarga havolalar oʻsha saytlarga olib boradi. Ularda maʼlumotlarni qayta ishlash tartibi oʻsha saytlarning oʻz qoidalari bilan belgilanadi.",
      },
      { type: "heading", level: 2, text: "Server jurnallari" },
      {
        type: "paragraph",
        text: "Xavfsizlikni taʼminlash va nosozliklarni aniqlash maqsadida veb-server soʻrovlarning texnik jurnallarini (IP manzil, soʻrov vaqti, soʻralgan sahifa, brauzer turi) yuritadi.",
      },
      { type: "heading", level: 2, text: "Huquqiy asos" },
      {
        type: "paragraph",
        text: "Shaxsga doir maʼlumotlar Oʻzbekiston Respublikasining “Shaxsga doir maʼlumotlar toʻgʻrisida”gi Qonuniga muvofiq qayta ishlanadi.",
      },
      { type: "heading", level: 2, text: "Bogʻlanish" },
      CONTACT,
      CHANGES("ushbu siyosatga"),
    ],
  },
  {
    path: "shartlar",
    navKey: "terms",
    description:
      "Davijara.uz portalidan foydalanish shartlari: portal nimani taqdim etadi, maʼlumotlarning dolzarbligi va foydalanuvchi majburiyatlari.",
    blocks: [
      {
        type: "paragraph",
        text: "Davijara.uz (keyingi oʻrinlarda – Portal) – Davlat mulki obyektlaridan samarali foydalanish markazining (keyingi oʻrinlarda – Markaz) davlat mulkini ijaraga berish masalalari boʻyicha axborot portali. Portaldan foydalanish bepul va roʻyxatdan oʻtishni talab etmaydi. Portaldan foydalanish orqali siz ushbu shartlarga rozilik bildirasiz.",
      },
      { type: "heading", level: 2, text: "Portal nimani taqdim etadi" },
      {
        type: "list",
        ordered: false,
        items: [
          "Ijaraga berilayotgan va ijaraga berilgan davlat mulki obyektlari, ijara shartnomalari, imtiyozlar va normativ hujjatlar haqida maʼlumot beradi;",
          "Portalda savdolar oʻtkazilmaydi: ariza berish va savdoda ishtirok etish e-auksion.uz elektron savdo platformasida amalga oshiriladi;",
          "ijara shartnomalari online-ijara.uz axborot tizimi orqali rasmiylashtiriladi.",
        ],
      },
      { type: "heading", level: 2, text: "Maʼlumotlarning dolzarbligi" },
      {
        type: "paragraph",
        text: "Obyektlar, savdolar va statistika Markaz axborot tizimlari hamda e-auksion.uz maʼlumotlari asosida avtomatik yangilanadi va bir necha daqiqagacha kechikishi mumkin. Lot holati, boshlangʻich narxi va savdo vaqti boʻyicha yakuniy maʼlumot – e-auksion.uz platformasidagi tegishli lot sahifasi.",
      },
      {
        type: "paragraph",
        text: "Ijara kalkulyatori natijasi taxminiy boʻlib, rasmiy hisob-kitob hisoblanmaydi. Yakuniy ijara haqi auksion natijasida belgilanadi.",
      },
      {
        type: "paragraph",
        text: "Normativ-huquqiy hujjatlarning rasmiy matni Qonunchilik maʼlumotlari milliy bazasida (lex.uz) eʼlon qilinadi.",
      },
      { type: "heading", level: 2, text: "Foydalanuvchining majburiyatlari" },
      {
        type: "list",
        ordered: false,
        items: [
          "Portal ishiga xalaqit bermaslik: avtomatlashtirilgan ommaviy soʻrovlar yubormaslik va himoya choralarini chetlab oʻtishga urinmaslik;",
          "Portalning boshqaruv paneliga ruxsatsiz kirishga urinmaslik.",
        ],
      },
      { type: "heading", level: 2, text: "Javobgarlik" },
      {
        type: "paragraph",
        text: "Markaz Portaldagi maʼlumotlarning toʻgʻri va dolzarb boʻlishi uchun choralar koʻradi. Tashqi axborot tizimlaridan olinadigan maʼlumotlardagi uzilish yoki kechikishlar natijasida yuzaga kelgan oqibatlar uchun Markaz javobgar emas. Tashqi saytlarning mazmuni va ishlashi uchun ularning egalari javob beradi.",
      },
      { type: "heading", level: 2, text: "Bogʻlanish" },
      CONTACT,
      CHANGES("ushbu shartlarga"),
    ],
  },
];
