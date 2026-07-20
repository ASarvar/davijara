import { Mail, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { contacts } from "@/content/site";
import { Container } from "./section";
import { LangSwitcher } from "./lang-switcher";

export async function Topbar() {
  const t = await getTranslations("topbar");

  return (
    <div
      data-tone="deep"
      className="border-b border-[color:var(--color-gold)]/12 bg-[color-mix(in_srgb,var(--color-navy)_90%,transparent)] text-[12.5px] backdrop-blur-md"
    >
      <Container className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1.5 py-2">
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-1">
          <a
            href={contacts.phoneHref}
            className="hover:text-accent-foreground flex items-center gap-1.5 transition-colors"
          >
            <Phone aria-hidden="true" className="size-3.5" />
            {contacts.phone}
          </a>
          <a
            href={contacts.emailHref}
            className="hover:text-accent-foreground flex items-center gap-1.5 transition-colors"
          >
            <Mail aria-hidden="true" className="size-3.5" />
            {contacts.email}
          </a>
        </div>

        <div className="flex items-center gap-4">
          {/*
            "Maxsus imkoniyatlar" is a dead `href="#"` in the legacy site. On
            Uzbek government portals this conventionally opens a
            visually-impaired mode. Wired to a real route here; the
            high-contrast theme itself is implemented in the optimisation pass.
          */}
          <Link
            href="/maxsus-imkoniyatlar"
            className="text-muted-foreground hover:text-accent-foreground transition-colors"
          >
            {t("accessibility")}
          </Link>
          <LangSwitcher />
        </div>
      </Container>
    </div>
  );
}
