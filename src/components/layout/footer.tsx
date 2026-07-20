import Image from "next/image";
import { ExternalLink, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import {
  contacts,
  externalLinks,
  footerNav,
  legalNav,
  site,
} from "@/content/site";
import { Container } from "./section";

export async function Footer() {
  const t = await getTranslations("footer");
  const tn = await getTranslations("nav");
  const year = new Date().getFullYear();

  return (
    <footer
      data-tone="deep"
      className="bg-background text-foreground mt-auto border-t border-[color:var(--color-gold)]/12"
    >
      <Container className="py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <Image
              src="/logo-dm-light.svg"
              alt={site.name}
              width={313}
              height={69}
              className="h-9 w-auto"
            />
            <p className="text-muted-foreground mt-4 text-sm">{t("operator")}</p>
            <a
              href={contacts.hotlineHref}
              className="text-accent-foreground mt-5 inline-flex items-center gap-2 text-2xl font-semibold"
            >
              <Phone aria-hidden="true" className="size-5" />
              {contacts.hotline}
              <span className="sr-only"> — {t("hotline")}</span>
            </a>
          </div>

          {/* Portal links */}
          {footerNav.map((col) => (
            <div key={col.heading}>
              <h2 className="mb-4 text-sm font-semibold">{col.heading}</h2>
              <ul className="space-y-2.5">
                {col.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-muted-foreground hover:text-accent-foreground text-sm transition-colors"
                    >
                      {tn(item.key)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* External state platforms */}
          <div>
            <h2 className="mb-4 text-sm font-semibold">
              {externalLinks.heading}
            </h2>
            <ul className="space-y-2.5">
              {externalLinks.items.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-accent-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
                  >
                    {item.label}
                    <ExternalLink aria-hidden="true" className="size-3" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h2 className="mb-4 text-sm font-semibold">{t("contact")}</h2>
            <ul className="text-muted-foreground space-y-2.5 text-sm">
              <li>
                {/*
                  index.html and imtiyozlar.html gave different street
                  addresses. Reconciled to a single value in content/site.ts.
                */}
                <address className="not-italic">{contacts.address.full}</address>
              </li>
              <li>
                <a
                  href={contacts.phoneHref}
                  className="hover:text-accent-foreground transition-colors"
                >
                  {contacts.phone}
                </a>
              </li>
              <li>
                <a
                  href={contacts.emailHref}
                  className="hover:text-accent-foreground transition-colors"
                >
                  {contacts.email}
                </a>
              </li>
              <li>
                {t("corporate")}:{" "}
                <a
                  href={contacts.corporatePhoneHref}
                  className="hover:text-accent-foreground transition-colors"
                >
                  {contacts.corporatePhone}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-border text-muted-foreground mt-12 flex flex-col gap-4 border-t pt-6 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {site.name} — {t("rights")}
          </p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {legalNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="hover:text-accent-foreground transition-colors"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </footer>
  );
}
