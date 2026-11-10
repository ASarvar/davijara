import "server-only";

import {
  closingStatement,
  directorAppeal,
  sections,
} from "@/content/anticorruption";
import { localizeContent, translateText } from "@/lib/i18n/content";

/*
  /markaz/korrupsiyaga-qarshi, in the reader's language. The content is
  still code (see the module note in content/anticorruption.ts); this read
  exists so the page does not import it directly, and so /ru can show the
  translators' Russian. The director's appeal was added after the workbook
  was built (22.10.2026); its Russian is Claude's interim translation
  (ru.interim.json) until the translators review it.

  The appeal's title is translated as ONE unit, its lines joined with "\n".
  Russian re-cuts the four source lines over three («Обращение» moves to the
  front), so no single line has a translation of its own, and putting
  fragments like "…markazi direktori" → "Обращение директора…" in the
  dictionary would rewrite that phrase wherever else it stands alone on /ru.
*/
export async function getAnticorruption(locale?: string) {
  const localized = localizeContent(
    { sections, directorAppeal, closingStatement },
    locale,
  );
  return {
    ...localized,
    directorAppeal: {
      ...localized.directorAppeal,
      titleLines: translateText(
        directorAppeal.titleLines.join("\n"),
        locale,
      ).split("\n"),
    },
  };
}

export type ReportingChannel = {
  /** The line exactly as the document has it, e.g. "elektron pochta: markaz@davaktiv.uz;". */
  text: string;
  /** Before the colon: "elektron pochta". */
  label: string;
  /** After it, without the list's closing ";": "markaz@davaktiv.uz". */
  value: string;
  kind: "phone" | "email" | "web" | "telegram";
  href: string;
};

/*
  The "report corruption" section, for /aloqa (operator, 10.11.2026). The
  SAME text the anticorruption page shows, read from the same place, so the
  two cannot drift apart: change a channel in content/anticorruption.ts and
  both pages follow.

  Each line is split at its colon into what the channel is and its address,
  only so the address can be a link. No word is changed; the closing ";"
  of a list item is dropped from the address because it is punctuation of
  the list, not part of the number. A line that does not split cleanly
  comes back as null and the page prints it whole, unlinked.

  The link is DERIVED from the address's own shape rather than typed in
  alongside it, so a changed number cannot leave a stale link behind (the
  failure contacts.phoneHref had for ten weeks):

    @name           Telegram bot  → https://t.me/name
    a@b.c           email         → mailto:
    71-259-21-14    Tashkent landline, 9 digits → tel:+998…
    domain.tld      website       → https://
*/
export async function getReportingChannels(locale?: string) {
  const section = sections.find((s) => s.id === "reporting-channels");
  if (!section) return null;
  const localized = localizeContent(section, locale);
  return {
    heading: localized.heading,
    paragraphs: localized.paragraphs,
    channels: (localized.items ?? []).map((text) => ({
      text,
      channel: parseChannel(text),
    })),
  };
}

function parseChannel(text: string): ReportingChannel | null {
  const match = /^(.+?):\s*(.+?)[;.]?\s*$/.exec(text);
  if (!match) return null;
  const [, label, value] = match as unknown as [string, string, string];

  if (/^@[A-Za-z0-9_]{5,}$/.test(value)) {
    return {
      text,
      label,
      value,
      kind: "telegram",
      href: `https://t.me/${value.slice(1)}`,
    };
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return { text, label, value, kind: "email", href: `mailto:${value}` };
  }
  const digits = value.replace(/\D/g, "");
  if (/^[\d\s()+-]+$/.test(value) && digits.length === 9) {
    return { text, label, value, kind: "phone", href: `tel:+998${digits}` };
  }
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(value)) {
    return { text, label, value, kind: "web", href: `https://${value}` };
  }
  return null;
}
