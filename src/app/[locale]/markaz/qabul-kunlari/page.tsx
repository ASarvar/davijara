import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Mail, Phone, Clock3, UserRound } from "lucide-react";

import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { Section } from "@/components/layout/section";
import { SurfaceCard } from "@/components/common/surface-card";
import { getLeadership, LEADERSHIP_EMAIL } from "@/lib/data/leadership";
import { mediaSrc } from "@/lib/media/src";

/*
  Rahbariyat — the Director and the two deputies, filled in from the panel
  (see /admin/rahbariyat and lib/data/leadership.ts).

  PLAIN TEXT PAGE FAMILY, same as markaz/page.tsx and
  markaz/vazifalar/page.tsx: centred title, no citation line under it — this
  page has no single decree it was "established by".

  No biography button, no website, no address — the operator asked
  specifically for those three to be left out; only name, an optional photo,
  optional phone, optional reception hours, and one reception mailbox shared
  by all three roles.
*/

const NAV_KEY = "reception";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const tNav = await getTranslations({ locale, namespace: "nav" });
  return { title: tNav(NAV_KEY) };
}

export default async function LeadershipPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const [tNav, tCommon, members] = await Promise.all([
    getTranslations("nav"),
    getTranslations("common"),
    getLeadership(),
  ]);

  return (
    <Section tone="deep">
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
          <li>
            <Link
              href="/"
              className="hover:text-accent-foreground transition-colors"
            >
              {tCommon("breadcrumbHome")}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href="/markaz"
              className="hover:text-accent-foreground transition-colors"
            >
              {tNav("centre")}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground">{tNav(NAV_KEY)}</li>
        </ol>
      </nav>

      <div className="mx-auto mb-20">
        <h1
          data-split
          className="font-heading text-center text-2xl font-semibold text-balance sm:text-3xl lg:text-4xl"
        >
          {tNav(NAV_KEY)}
        </h1>

        {members.length === 0 ? (
          <p className="border-hairline text-muted-foreground mt-8 rounded-lg border border-dashed px-4 py-6 text-center text-sm text-pretty">
            Rahbariyat maʼlumotlari hozircha kiritilmagan.
          </p>
        ) : (
          <div className="mt-8 space-y-4">
            {members.map((member) => (
              <SurfaceCard
                key={member.roleId}
                padding="lg"
                data-reveal="up"
                className="flex flex-col gap-5 sm:flex-row sm:items-center"
              >
                {member.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- uploaded photo, served by /api/media/[id]; see src.ts.
                  <img
                    src={mediaSrc(member.photo)}
                    alt=""
                    width={150}
                    height={150}
                    className="size-[150px] shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="bg-secondary text-muted-foreground flex size-[150px] shrink-0 items-center justify-center rounded-full"
                  >
                    <UserRound className="size-10" />
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <p className="font-heading text-lg font-semibold text-balance">
                    {member.fullName}
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm text-pretty">
                    {member.title}
                  </p>
                </div>

                <dl className="border-hairline flex shrink-0 flex-col gap-2 border-t pt-4 text-sm sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6">
                  {member.phone ? (
                    <div className="flex items-center gap-2">
                      <Phone
                        aria-hidden="true"
                        className="text-accent-foreground size-4 shrink-0"
                      />
                      <dd>
                        <a
                          href={`tel:${member.phone.replace(/[^\d+]/g, "")}`}
                          className="hover:text-accent-foreground transition-colors"
                        >
                          {member.phone}
                        </a>
                      </dd>
                    </div>
                  ) : null}

                  <div className="flex items-center gap-2">
                    <Mail
                      aria-hidden="true"
                      className="text-accent-foreground size-4 shrink-0"
                    />
                    <dd>
                      <a
                        href={`mailto:${LEADERSHIP_EMAIL}`}
                        className="hover:text-accent-foreground transition-colors"
                      >
                        {LEADERSHIP_EMAIL}
                      </a>
                    </dd>
                  </div>

                  {member.receptionHours ? (
                    <div className="flex items-center gap-2">
                      <Clock3
                        aria-hidden="true"
                        className="text-accent-foreground size-4 shrink-0"
                      />
                      <dd>{member.receptionHours}</dd>
                    </div>
                  ) : null}
                </dl>
              </SurfaceCard>
            ))}
          </div>
        )}
      </div>
    </Section>
  );
}
