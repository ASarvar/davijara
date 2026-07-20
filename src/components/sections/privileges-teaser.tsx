import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { getPrivilegeCategoryCards } from "@/lib/data/catalog";
import { getPrivilegeCounts } from "@/lib/data/privileges";
import { Icon } from "@/components/icon";
import { Section, SectionHeader } from "@/components/layout/section";

export async function PrivilegesTeaser() {
  const t = await getTranslations("privileges");
  const [cards, counts] = await Promise.all([
    getPrivilegeCategoryCards(),
    getPrivilegeCounts(),
  ]);

  return (
    <Section
      tone="deep"
      className="bg-[color:var(--color-cobalt)]/6 border-y border-[color:var(--color-gold)]/8"
    >
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        action={
          <Link
            href="/imtiyozlar"
            className="text-accent-foreground inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
          >
            {t("action")}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        }
      />

      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <li key={card.category}>
            <Link
              href={`/imtiyozlar/${card.category}`}
              className="border-border bg-card hover:border-[color:var(--color-gold)]/40 flex h-full flex-col rounded-xl border p-6 transition-colors"
            >
              <span className="bg-accent text-accent-foreground mb-4 flex size-11 items-center justify-center rounded-lg">
                <Icon name={card.icon} className="size-5" />
              </span>
              <h3 className="text-base font-semibold">{card.title}</h3>
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
          </li>
        ))}
      </ul>
    </Section>
  );
}
