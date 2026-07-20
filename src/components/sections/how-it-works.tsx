import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { getSteps } from "@/lib/data/catalog";
import { Icon } from "@/components/icon";
import { Section, SectionHeader } from "@/components/layout/section";

export async function HowItWorks() {
  const t = await getTranslations("steps");
  const steps = await getSteps();

  return (
    <Section tone="deep">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        action={
          <Link
            href="/xizmatlar"
            className="text-accent-foreground inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
          >
            {t("action")}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        }
      />

      <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step) => (
          <li
            key={step.number}
            className="border-border bg-card relative rounded-xl border p-6"
          >
            <span
              aria-hidden="true"
              className="font-heading text-accent-foreground/25 absolute top-4 right-5 text-3xl font-bold"
            >
              {step.number}
            </span>
            <span className="bg-accent text-accent-foreground mb-4 flex size-11 items-center justify-center rounded-lg">
              <Icon name={step.icon} className="size-5" />
            </span>
            <h3 className="text-base font-semibold">{step.title}</h3>
            <p className="text-muted-foreground mt-2 text-sm">
              {step.description}
            </p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
