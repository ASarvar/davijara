import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { getPrivilegeCategoryCards } from "@/lib/data/catalog";
import { getPrivilegeCounts } from "@/lib/data/privileges";
import { ActionLink } from "@/components/common/action-link";
import { IconTile } from "@/components/common/icon-tile";
import { SurfaceCard } from "@/components/common/surface-card";
import { Section, SectionHeader } from "@/components/layout/section";

export async function PrivilegesTeaser() {
  const t = await getTranslations("privileges");
  const [cards, counts] = await Promise.all([
    getPrivilegeCategoryCards(),
    getPrivilegeCounts(),
  ]);

  return (
    <Section tone="light">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        action={<ActionLink href="/imtiyozlar">{t("action")}</ActionLink>}
      />

      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <SurfaceCard
            as="li"
            key={card.category}
            padding="none"
            interactive
            data-reveal="up"
          >
            <Link
              href={`/imtiyozlar/${card.category}`}
              className="group flex h-full flex-col p-6"
            >
              <IconTile
                name={card.icon}
                className="mb-4 group-hover:scale-105"
              />
              <h3 className="group-hover:text-accent-foreground text-base font-semibold transition-colors duration-200">
                {card.title}
              </h3>
              <p className="text-muted-foreground mt-2 flex-1 text-sm">
                {card.description}
              </p>
              {/*
                Count is derived from the data, not typed into the markup as
                the legacy page did — so it cannot drift from reality.
              */}
              <span className="text-accent-foreground mt-4 text-sm font-semibold">
                {t("count", { count: counts[card.category] })}
              </span>
            </Link>
          </SurfaceCard>
        ))}
      </ul>
    </Section>
  );
}
