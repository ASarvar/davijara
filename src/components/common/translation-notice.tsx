import { Info } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/*
  "The Russian and English here are unofficial translations" — on /ru and
  /en only, never on /uz, whose text is the original.

  THIS REVERSES A DECISION, AT THE OPERATOR'S REQUEST. On 08.11.2026 the
  operator chose to publish the translators' Russian of statutory text with
  no disclaimer at all. On 16.11.2026 ("Предложения по сайту 3", items 7-8)
  they asked for one: a short note on the privileges and legal-documents
  pages, and a full section under "Условия использования". The Russian is
  theirs, word for word; the English is Claude's, pending the translators.

  The strings live in `translationNotice` in ru.json and en.json and NOT in
  uz.json — Uzbek never renders them, and an Uzbek source invented here
  would be a text nobody asked for.
*/
const LEX_UZ = "https://lex.uz";

async function noticeTranslations() {
  const locale = await getLocale();
  if (locale === routing.defaultLocale) return null;
  return getTranslations("translationNotice");
}

const lexLink = (chunks: React.ReactNode) => (
  <a
    href={LEX_UZ}
    target="_blank"
    rel="noopener noreferrer"
    className="text-accent-foreground font-medium underline underline-offset-2"
  >
    {chunks}
  </a>
);

/** One-paragraph note above translated legal content (privileges, documents). */
export async function TranslationNotice({ className }: { className?: string }) {
  const t = await noticeTranslations();
  if (!t) return null;

  return (
    <p
      role="note"
      className={cn(
        "border-hairline bg-card text-muted-foreground flex items-start gap-3 rounded-md border px-4 py-3 text-sm text-pretty",
        className,
      )}
    >
      <Info
        aria-hidden="true"
        className="text-accent-foreground mt-0.5 size-4 shrink-0"
      />
      <span>
        {t.rich("short", {
          b: (chunks) => (
            <strong className="text-foreground font-semibold">{chunks}</strong>
          ),
          lex: lexLink,
        })}
      </span>
    </p>
  );
}

/** The full statement, as its own headed section of the Terms of Use. */
export async function TranslationTerms({ className }: { className?: string }) {
  const t = await noticeTranslations();
  if (!t) return null;

  return (
    <section
      aria-labelledby="translation-terms"
      className={cn("space-y-3 text-pretty", className)}
    >
      <h2
        id="translation-terms"
        className="font-heading text-xl font-semibold sm:text-2xl"
      >
        {t("title")}
      </h2>
      <p>{t("p1")}</p>
      <p>{t.rich("p2", { lex: lexLink })}</p>
      <p>{t("p3")}</p>
    </section>
  );
}
