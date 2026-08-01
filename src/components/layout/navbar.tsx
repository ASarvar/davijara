import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { site } from "@/content/site";
import { Container } from "./section";
import { Logo } from "./logo";
import { NavLinks } from "./nav-links";
import { MobileNav } from "./mobile-nav";
import { LogIn } from "lucide-react";

export async function Navbar() {
  const t = await getTranslations("nav");

  return (
    <header
      data-tone="deep"
      className="border-b border-[color:var(--color-gold)]/12 bg-background sticky top-0 z-40"
    >
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          className="flex shrink-0 items-center"
          aria-label={site.name}
        >
          {/*
            The full nav appears at lg, so the wordmark only has room from lg
            up — below that the header carries the mark alone.
          */}
          <Logo from="lg" priority />
        </Link>

        <nav aria-label="Asosiy menyu" >
          <NavLinks />
        </nav>

        <div className="flex items-center gap-1">
          {/* Sign-in sits beside the language switcher, not in the navbar. */}
          <Link
            href="/kirish"
            className="border-[color:var(--color-gold)]/40 text-accent-foreground hover:bg-accent focus-visible:ring-ring items-center gap-1.5 rounded border px-2.5 py-0.5 leading-5 font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none hidden lg:inline-flex"
          >
            <LogIn aria-hidden="true" className="size-3.5" />
            {t("login")}
          </Link>
          <MobileNav />
        </div>
      </Container>
    </header>
  );
}
