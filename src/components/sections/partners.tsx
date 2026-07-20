import { getPartners } from "@/lib/data/catalog";
import { Icon } from "@/components/icon";
import { Container } from "@/components/layout/section";

/**
 * Partner platforms strip.
 *
 * Real outbound links rather than the legacy inert `<div>`s — these are all
 * live state platforms, so there is no reason for them not to be clickable.
 */
export async function Partners() {
  const partners = await getPartners();

  return (
    <div data-tone="deep" className="bg-background border-border border-t">
      <Container className="py-10">
        <p className="text-muted-foreground mb-6 text-center text-xs font-semibold tracking-[0.18em] uppercase">
          Hamkor tashkilotlar va platformalar
        </p>
        <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
          {partners.map((partner) => (
            <li key={partner.label}>
              <a
                href={partner.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-accent-foreground flex items-center gap-2.5 text-sm transition-colors"
              >
                <Icon name={partner.icon} className="size-5" />
                {partner.label}
              </a>
            </li>
          ))}
        </ul>
      </Container>
    </div>
  );
}
