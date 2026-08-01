import { getTranslations } from "next-intl/server";

import { getSteps } from "@/lib/data/catalog";
import { ActionLink } from "@/components/common/action-link";
import { IconTile } from "@/components/common/icon-tile";
import { SurfaceCard } from "@/components/common/surface-card";
import { Section, SectionHeader } from "@/components/layout/section";

export async function HowItWorks() {
  const t = await getTranslations("steps");
  const steps = await getSteps();

  return (
    <Section tone="light">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        action={<ActionLink href="/xizmatlar">{t("action")}</ActionLink>}
      />

      <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, i) => (
          <SurfaceCard
            as="li"
            key={step.number}
            interactive
            className="group relative"
            data-reveal="up"
            style={{ "--i": i } as React.CSSProperties}
          >
            <span
              aria-hidden="true"
              className="font-heading text-accent-foreground/25 absolute top-4 right-5 text-3xl font-bold transition-colors duration-200 group-hover:text-accent-foreground/40"
            >
              {step.number}
            </span>
            <IconTile
              name={step.icon}
              className="mb-4 group-hover:scale-105"
            />
            <h3 className="text-base font-semibold">{step.title}</h3>
            <p className="text-muted-foreground mt-2 text-sm">
              {step.description}
            </p>
          </SurfaceCard>
        ))}
      </ol>
    </Section>
  );
}
