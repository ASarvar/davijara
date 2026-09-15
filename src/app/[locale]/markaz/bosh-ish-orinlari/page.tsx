import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Breadcrumbs } from "@/components/common/breadcrumbs";
import type { Locale } from "@/i18n/routing";
import { Section } from "@/components/layout/section";
import { VacancyList } from "@/components/sections/vacancy-list";
import { getOpenVacancies, getVacancyInfo } from "@/lib/data/vacancies";

/*
  Bo'sh ish o'rinlari — the statutory hiring-conditions table plus the
  interview-questions notice, both supplied whole by the operator
  (2026-08-28); see content/vacancies.ts for sourcing and the flagged
  "Suhbat savollari ro'yxati" link target.

  Below them, the Markaz's own announcements, edited from /admin/vakansiyalar
  (2026-09-14). Only OPEN ones reach this page — closing one in the panel is
  how it comes down. The panel's actions revalidate this route directly; the
  window below is only the fallback.
*/

const NAV_KEY = "vacancies";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "nav" });
  return { title: t(NAV_KEY) };
}

export default async function VacanciesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const [tNav, info, vacancies] = await Promise.all([
    getTranslations("nav"),
    getVacancyInfo(),
    getOpenVacancies(),
  ]);

  return (
    <Section tone="deep">
      <Breadcrumbs items={[{ label: tNav(NAV_KEY) }]} />

      <div className="mx-auto">
        <h1
          data-split
          className="font-heading text-center text-2xl font-semibold text-balance sm:text-3xl lg:text-4xl"
        >
          {tNav(NAV_KEY)}
        </h1>

        <div className="border-hairline bg-card mt-8 rounded-lg border p-5 sm:p-6">
          <h2 className="font-heading text-center text-lg font-semibold text-balance sm:text-xl">
            {info.interviewQuestions.title}
          </h2>
          <div className="mt-4 space-y-3 text-sm text-pretty">
            {info.interviewQuestions.paragraphs.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
          {/*
            No verified URL for this link — see content/vacancies.ts. Shown
            as a plain label, not an <a>, so nothing points at a guessed
            address.
          */}
          <p className="border-hairline mt-4 border-t pt-4 text-sm font-medium">
            {info.interviewQuestions.questionsListUrl ? (
              <a
                href={info.interviewQuestions.questionsListUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-foreground underline underline-offset-2"
              >
                {info.interviewQuestions.questionsListLabel}
              </a>
            ) : (
              <span className="text-muted-foreground">
                {info.interviewQuestions.questionsListLabel}
              </span>
            )}
          </p>
        </div>

        {/*
          null means the store could not be read: render nothing rather than
          the "no open vacancies" line, which would be a claim we cannot back.
        */}
        {vacancies ? <VacancyList vacancies={vacancies} /> : null}
      </div>
    </Section>
  );
}
