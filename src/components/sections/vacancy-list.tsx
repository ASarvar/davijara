import {
  Briefcase,
  CalendarClock,
  ChevronDown,
  ClipboardCheck,
  Mail,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

import { BlockContent } from "@/components/common/block-content";
import { IconTile } from "@/components/common/icon-tile";
import { surfaceCard } from "@/components/common/surface-card";
import type { Vacancy } from "@/lib/data/vacancies";
import { formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The Markaz's open job announcements, one expandable card each.
 *
 * NATIVE <details>, NOT AN ACCORDION COMPONENT. The collapsed card is the
 * summary — position, dates, status — and the full announcement opens beneath
 * it, which is exactly what <details>/<summary> is: keyboard operation, the
 * expanded state announced to screen readers, find-in-page reaching the
 * closed text, and no JavaScript. So this stays a Server Component and the
 * page ships nothing for it. (privilege-list uses Radix Accordion because it
 * needs one-open-at-a-time across 24 items; nothing here does.)
 *
 * Only phrasing content inside <summary> — spans, not divs or lists — plus
 * the one heading the element allows. A <ul> in there is invalid HTML and
 * some screen readers drop the heading when it is wrapped in block markup.
 *
 * The announcement is Uzbek on every locale — it is published in one
 * language, see migration 13 — so its text carries lang="uz", and a screen
 * reader on /ru does not read Uzbek with Russian phonetics. The chrome around it (dates,
 * status, the e-mail label) is in the page's own language.
 */
export async function VacancyList({ vacancies }: { vacancies: Vacancy[] }) {
  const t = await getTranslations("vacancies");

  return (
    <section aria-labelledby="vacancies-heading" className="mt-14">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2
          id="vacancies-heading"
          data-split
          className="font-heading text-xl font-semibold text-balance sm:text-2xl"
        >
          {t("openTitle")}
        </h2>
        {vacancies.length > 0 ? (
          <p className="text-muted-foreground text-sm">
            {t("count", {
              count: vacancies.length,
              n: formatNumber(vacancies.length),
            })}
          </p>
        ) : null}
      </div>

      {vacancies.length === 0 ? (
        <p className="border-hairline text-muted-foreground mt-6 rounded-lg border border-dashed px-4 py-6 text-center text-sm text-pretty">
          {t("empty")}
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {vacancies.map((vacancy) => (
            <li key={vacancy.id} data-reveal="up">
              <details
                className={cn(
                  surfaceCard({ radius: "lg", padding: "none" }),
                  /*
                    A border step plus a shadow step, and no lift: a card that
                    rises under the cursor and then grows downward when clicked
                    reads as two motions fighting each other.
                  */
                  "group hover:border-outline open:border-outline hover:[box-shadow:var(--shadow-2)]",
                )}
              >
                <summary className="focus-visible:ring-ring flex cursor-pointer list-none items-start gap-4 rounded-lg p-5 outline-none focus-visible:ring-2 sm:p-6 [&::-webkit-details-marker]:hidden">
                  <IconTile
                    aria-hidden="true"
                    className="hidden sm:inline-flex"
                  >
                    <Briefcase className="size-5" />
                  </IconTile>

                  <span className="block min-w-0 flex-1">
                    <span lang="uz" className="block">
                      {vacancy.unit ? (
                        <span className="text-muted-foreground block text-xs font-semibold tracking-wide uppercase">
                          {vacancy.unit}
                        </span>
                      ) : null}
                      <h3 className="mt-1 font-semibold text-pretty sm:text-lg">
                        {vacancy.title}
                      </h3>
                    </span>

                    {vacancy.deadline || vacancy.testDate ? (
                      <span className="text-muted-foreground mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
                        {vacancy.deadline ? (
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarClock
                              aria-hidden="true"
                              className="size-4 shrink-0"
                            />
                            {t("deadline", {
                              date: formatDate(vacancy.deadline),
                            })}
                          </span>
                        ) : null}
                        {vacancy.testDate ? (
                          <span className="inline-flex items-center gap-1.5">
                            <ClipboardCheck
                              aria-hidden="true"
                              className="size-4 shrink-0"
                            />
                            {t("testDate", {
                              date: formatDate(vacancy.testDate),
                            })}
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                  </span>

                  <span className="flex shrink-0 flex-col items-end gap-3">
                    {/* A fill plus a word — never hue alone. */}
                    <span
                      className={
                        vacancy.expired
                          ? "border-hairline text-muted-foreground rounded-full border px-2.5 py-0.5 text-xs"
                          : "bg-accent text-accent-foreground rounded-full px-2.5 py-0.5 text-xs font-semibold"
                      }
                    >
                      {vacancy.expired ? t("statusExpired") : t("statusOpen")}
                    </span>
                    <span className="text-accent-foreground inline-flex items-center gap-1 text-sm font-medium">
                      <span className="hidden sm:inline">{t("toggle")}</span>
                      <ChevronDown
                        aria-hidden="true"
                        className="size-4 transition-transform duration-300 group-open:rotate-180"
                      />
                    </span>
                  </span>
                </summary>

                <div className="border-hairline border-t px-5 pt-1 pb-6 sm:px-6">
                  {/*
                    headingOffset 2: the card title is an h3, so the body's
                    authored h2/h3 render as h4/h5 — same look, correct outline.
                  */}
                  <div lang="uz" className="max-w-3xl">
                    <BlockContent blocks={vacancy.blocks} headingOffset={2} />
                  </div>

                  {vacancy.email ? (
                    <p className="border-hairline mt-6 flex flex-wrap items-center gap-2 border-t pt-4 text-sm">
                      <Mail
                        aria-hidden="true"
                        className="text-accent-foreground size-4 shrink-0"
                      />
                      <span className="text-muted-foreground">
                        {t("apply")}:
                      </span>
                      <a
                        href={`mailto:${vacancy.email}`}
                        className="text-accent-foreground font-medium underline underline-offset-2"
                      >
                        {vacancy.email}
                      </a>
                    </p>
                  ) : null}
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
