import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { getServices } from "@/lib/data/catalog";
import { ActionLink } from "@/components/common/action-link";
import { IconTile } from "@/components/common/icon-tile";
import { SurfaceCard } from "@/components/common/surface-card";
import { Section, SectionHeader } from "@/components/layout/section";

export async function Services() {
  const t = await getTranslations("services");
  const services = await getServices();

  return (
    /*
      Light tone. Note that nothing inside this component knows or cares —
      `data-tone="light"` on the section re-binds the colour tokens, and the
      cards below use the same semantic classes the deep-tone sections use.
      The legacy version achieved this with inline `style="color: #07102b"`
      attributes sprinkled through the markup.
    */
    <Section tone="light">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        action={<ActionLink href="/xizmatlar">{t("action")}</ActionLink>}
      />

      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {services.map((service, i) => (
          <SurfaceCard
            as="li"
            key={service.slug}
            padding="none"
            interactive
            data-reveal="up"
            style={{ "--i": i } as React.CSSProperties}
          >
            <Link
              href={service.href}
              className="group flex h-full flex-col p-6"
            >
              <IconTile
                name={service.icon}
                className="mb-4 group-hover:scale-105"
              />
              <h3 className="group-hover:text-accent-foreground text-base font-semibold transition-colors duration-200">
                {service.title}
              </h3>
              <p className="text-muted-foreground mt-2 text-sm">
                {service.description}
              </p>
            </Link>
          </SurfaceCard>
        ))}
      </ul>
    </Section>
  );
}
