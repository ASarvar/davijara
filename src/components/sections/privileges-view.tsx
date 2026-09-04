import { getTranslations } from "next-intl/server";

import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { getPrivilegesByCategory } from "@/lib/data/privileges";
import type { PrivilegeCategory } from "@/types/content";
import { Section } from "@/components/layout/section";
import { PrivilegeFilter } from "./privilege-filter";
import { PrivilegeList } from "./privilege-list";

/**
 * Shared body for the privileges pages.
 *
 * Category is a route SEGMENT (/imtiyozlar/it), not a query string. Reading it
 * from `searchParams` would opt the whole route into dynamic rendering, so
 * every visit to a page of fixed statutory text would be server-rendered on
 * demand. As a segment, all five variants prerender statically per locale —
 * fifteen static documents, each independently crawlable, which matters for a
 * page whose purpose is legal reference.
 */
export async function PrivilegesView({
  active,
}: {
  active: PrivilegeCategory | "barchasi";
}) {
  const t = await getTranslations("privileges");
  const items = await getPrivilegesByCategory(active);

  return (
    <>
      <Section tone="deep" className="pb-5">
        <Breadcrumbs items={[{ label: t("title") }]} />

        <h1
          data-enter
          className="font-heading max-w-3xl text-xl font-semibold text-balance sm:text-2xl lg:text-3xl"
        >
          {t("pageTitle")}
        </h1>
        <p
          data-enter
          style={{ "--enter-delay": 1 } as React.CSSProperties}
          className="text-muted-foreground mt-4 max-w-2xl text-pretty"
        >
          {t("pageDescription")}
        </p>
      </Section>

      <Section tone="deep" className="pt-0">
        <div className="mb-8">
          <PrivilegeFilter active={active} />
        </div>
        <PrivilegeList items={items} />
      </Section>
    </>
  );
}
