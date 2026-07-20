import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { site } from "@/content/site";
import { Button } from "@/components/ui/button";
import { Container } from "./section";
import { NavLinks } from "./nav-links";
import { MobileNav } from "./mobile-nav";

export async function Navbar() {
  const t = await getTranslations("nav");

  return (
    <header
      data-tone="deep"
      className="border-b border-[color:var(--color-gold)]/12 bg-background sticky top-0 z-40"
    >
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center" aria-label={site.name}>
          <Image
            src="/logo-dm-light.svg"
            alt={`${site.name} — ${site.tagline}`}
            width={313}
            height={69}
            // Above the fold on every page: load eagerly, never lazily.
            priority
            className="h-8 w-auto"
          />
        </Link>

        <nav aria-label="Asosiy menyu" className="flex-1">
          <NavLinks />
        </nav>

        <div className="flex items-center gap-1">
          <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
            <Link href="/kirish">{t("login")}</Link>
          </Button>
          <MobileNav />
        </div>
      </Container>
    </header>
  );
}
