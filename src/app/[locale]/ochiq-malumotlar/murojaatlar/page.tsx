import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { Section } from "@/components/layout/section";
import { getAppealSources } from "@/lib/data/appeals-stats";

/*
  Murojaatlar — per-channel appeal/complaint counts (see
  lib/data/appeals-stats.ts for the source and why the table carries no
  period). First real content on this route — it was a bare PlaceholderPage
  until the operator supplied the table (2026-08-28).
*/

const NAV_KEY = "appeals";

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

export default async function AppealsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const [tNav, tCommon, sources] = await Promise.all([
    getTranslations("nav"),
    getTranslations("common"),
    getAppealSources(),
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
          <li className="text-foreground">{tNav(NAV_KEY)}</li>
        </ol>
      </nav>

      <div className="mx-auto max-w-4xl mb-20">
        <h1
          data-split
          className="font-heading text-center text-2xl font-semibold text-balance sm:text-3xl lg:text-4xl"
        >
          {tNav(NAV_KEY)}
        </h1>

        {sources.length === 0 ? (
          <p className="border-hairline text-muted-foreground mt-8 rounded-lg border border-dashed px-4 py-6 text-center text-sm text-pretty">
            Murojaatlar statistikasi hozircha kiritilmagan.
          </p>
        ) : (
          <div className="border-hairline mt-10 overflow-x-auto rounded-sm border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-secondary">
                  <th
                    scope="col"
                    className="border-hairline border-b px-8 py-2 text-left font-semibold"
                  >
                    T/r
                  </th>
                  <th
                    scope="col"
                    className="border-hairline border-b px-3 py-2 text-left font-semibold"
                  >
                    Murojaat manbasi
                  </th>
                  <th
                    scope="col"
                    className="border-hairline border-b px-3 py-2 text-center font-semibold"
                  >
                    Barchasi
                  </th>
                  <th
                    scope="col"
                    className="border-hairline border-b px-3 py-2 text-center font-semibold"
                  >
                    Jarayonda
                  </th>
                  <th
                    scope="col"
                    className="border-hairline border-b px-3 py-2 text-center font-semibold"
                  >
                    Yopilgan murojaatlar
                  </th>
                </tr>
              </thead>
              <tbody>
                {sources.map((row, i) => (
                  <tr key={row.source} className="border-hairline border-b last:border-0">
                    <td className="text-muted-foreground px-8 py-2">{i + 1}</td>
                    <td className="px-3 py-2 text-pretty">{row.source}</td>
                    <td className="px-3 py-2 text-center tabular-nums">
                      {row.total}
                    </td>
                    <td className="px-3 py-2 text-center tabular-nums">
                      {row.inProgress}
                    </td>
                    <td className="px-3 py-2 text-center tabular-nums">
                      {row.closed}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Section>
  );
}
