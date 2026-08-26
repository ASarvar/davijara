import { getTranslations } from "next-intl/server";

import { getPartners } from "@/lib/data/catalog";
import { Icon } from "@/components/icon";
import { Eyebrow } from "@/components/common/eyebrow";
import { Container } from "@/components/layout/section";

/**
 * Partner platforms strip.
 *
 * Real outbound links rather than the legacy inert `<div>`s — these are all
 * live state platforms, so there is no reason for them not to be clickable.
 * Lucide glyphs stand in for logos deliberately: partner marks are
 * third-party property and should not be approximated.
 */
export async function Partners() {
  const t = await getTranslations("partners");
  const partners = await getPartners();

  return (
    <section data-tone="deep" className="bg-background border-border border-t">
      <Container className="py-5">
        {/* sr-only: the row of logos still needs a name, but the eyebrow
            style above it went with the rest of them. (Was a hardcoded Uzbek
            string here once, so it never translated.) */}
        <Eyebrow as="h2" className="sr-only">
          {t("heading")}
        </Eyebrow>

        <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
          {partners.map((partner) => (
            <li key={partner.label} data-reveal="scale">
              <a
                href={partner.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-accent-foreground group flex items-center gap-2.5 text-sm transition-colors duration-200"
              >
                <Icon
                  name={partner.icon}
                  className="size-5 transition-transform duration-200 group-hover:-translate-y-0.5"
                />
                {partner.label}
              </a>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
