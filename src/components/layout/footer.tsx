// `Phone` is not imported: the hotline link below is commented out, and a
// dead import is a lint error. Restore it together with that block.
import { ExternalLink } from "lucide-react";
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
import { Logo } from "./logo";
import { SiteTraffic } from "./site-traffic";

export async function Footer() {
  const t = await getTranslations("footer");
  const tn = await getTranslations("nav");
  const year = new Date().getFullYear();

  return (
    /*
      `floor`, not `deep`. On the dark theme the two are the same thing —
      plain navy — and this tone declares nothing there. It exists for the
      light theme, where `deep` resolves to the near-white page ground and the
      footer came out the same colour as whatever section sat above it; as
      `floor` it takes the darker mist step instead. Which section is above
      depends on the parity of the zebra, which the footer cannot know and
      should not have to. See globals.css.
    */
    <footer
      data-tone="floor"
      className="bg-background text-foreground border-hairline mt-auto border-t"
    >
      <Container className="pt-12 pb-10">
        {/*
          Uneven tracks, not four equal columns. The outer two carry prose that
          has to wrap — the operator sentence, the street address, "Korporativ
          haqida batafsil: …" — while the middle two are single-word nav links
          that left most of their column empty. Equal columns spent the width
          on the blocks that did not need it and made the contact block wrap.

          `minmax(0, …)` rather than a bare `fr` for the same reason as the
          header grid: an `fr` track defaults to `min-width: auto` and will not
          shrink below its content, so one long unbroken string (an email, a
          URL) would push the row wider than the container.

          Positional, so it assumes exactly four children — brand, ONE
          footerNav column, external links, contact. Adding a second entry to
          `footerNav` in content/site.ts puts five blocks into four tracks and
          wraps the contact block onto its own row; widen this list to match.
        */}
        <div className="grid gap-16 md:grid-cols-2 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.85fr)_minmax(0,0.85fr)_minmax(0,1.3fr)]">
          {/* Brand */}
          <div>
            {/*
              Same responsive lockup as the header. Without this the footer
              would pull the 9.9 KB wordmark on phones that only ever show the
              mark up top — so the header's saving would be undone further
              down the page.
            */}
            <Logo variant="footer" />
            <p className="text-muted-foreground mt-6 text-sm">
              {t("operator")}
            </p>
            {/* <a
              href={contacts.hotlineHref}
              className="text-accent-foreground mt-10 inline-flex items-center gap-2 text-2xl font-semibold"
            >
              <Phone aria-hidden="true" className="size-5" />
              {contacts.hotline}
              <span className="sr-only"> — {t("hotline")}</span>
            </a> */}
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
                <address className="not-italic">
                  {contacts.address.full}
                </address>
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
              {/* <li>
                {t("corporate")}:{" "}
                <a
                  href={contacts.corporatePhoneHref}
                  className="hover:text-accent-foreground transition-colors"
                >
                  {contacts.corporatePhone}
                </a>
              </li> */}
            </ul>
          </div>
        </div>
      </Container>

      {/*
        The visitor counter — a full-width navy band. It renders nothing until
        the server has taken some traffic (getTrafficStats() is null during the
        build), so on a freshly deployed page this band is absent and the
        copyright row follows the columns directly.
      */}
      <SiteTraffic />

      <Container>
        <div className="text-muted-foreground flex flex-col gap-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between">
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
