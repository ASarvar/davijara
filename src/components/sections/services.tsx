import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { getServices } from "@/lib/data/catalog";
import { Icon } from "@/components/icon";
import { Section, SectionHeader } from "@/components/layout/section";

export async function Services() {
  const t = await getTranslations("services");
  const services = await getServices();

  return (
    /*
      Light tone. Note that nothing inside this component knows or cares —
      `data-tone="light"` on the section re-binds the colour tokens, and the
      cards below use the same `bg-card` / `text-muted-foreground` classes the
      deep-tone sections use. The legacy version achieved this with inline
      `style="color: #07102b"` attributes sprinkled through the markup.
    */
    <Section tone="light">
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

      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {services.map((service) => (
          <li key={service.slug}>
            <Link
              href={service.href}
              className="border-border bg-card hover:border-[color:var(--color-gold-ink)]/40 flex h-full flex-col rounded-xl border p-6 transition-colors hover:shadow-sm"
            >
              <span className="bg-accent text-accent-foreground mb-4 flex size-11 items-center justify-center rounded-lg">
                <Icon name={service.icon} className="size-5" />
              </span>
              <h3 className="text-base font-semibold">{service.title}</h3>
              <p className="text-muted-foreground mt-2 text-sm">
                {service.description}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
