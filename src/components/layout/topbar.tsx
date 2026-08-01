import { Mail, Phone } from "lucide-react";

import { contacts } from "@/content/site";
import { Container } from "./section";
import { LangSwitcher } from "./lang-switcher";
import { AccessibilityDialog } from "./accessibility-dialog";

// Sign-in lives in the navbar (desktop) and the mobile menu, so the topbar
// carries only contacts, accessibility and language.
export function Topbar() {
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

        <div className="flex items-center gap-3 sm:gap-4">
          {/*
            "Maxsus imkoniyatlar" was a dead href="#" in the legacy site. It
            opens the accessibility settings as a dialog so the user keeps their
            place on the page instead of being sent to a separate route.
          */}
          <AccessibilityDialog />

          <LangSwitcher />

          
        </div>
      </Container>
    </div>
  );
}
