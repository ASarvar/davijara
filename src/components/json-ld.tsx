import {
  contacts,
  parentOrganization,
  site,
  socialLinks,
} from "@/content/site";
import { getAbout } from "@/lib/data/about";

/**
 * Structured data: the organisation, and the website it publishes.
 *
 * Lets search engines render the operator, hotline and address as a knowledge
 * panel rather than inferring them from page text. The address here is the
 * reconciled one from content/site.ts — the two legacy pages disagreed, and
 * publishing a wrong address in machine-readable form would propagate it.
 *
 * WHAT CHANGED ON 27.10.2026, and why each matters to search:
 *
 *   `sameAs` listed my.gov.uz, davaktiv.uz, e-auksion.uz, lex.uz and
 *   online-ijara.uz. `sameAs` means "this organisation IS also that" — so the
 *   Centre was declared to be five other bodies' websites, while its own
 *   Telegram and Instagram, the profiles that really are it, were absent. It
 *   now lists those profiles only.
 *
 *   `legalName` and `alternateName` carry the statute's own official names —
 *   Uzbek, Russian and English, full and short (about.ts, read through the
 *   data layer) — so a search in any of the three finds the same entity.
 *
 *   `parentOrganization` names the Agency, which nothing stated before.
 *
 *   A `WebSite` node ties the domain to the organisation as its publisher.
 */
export async function OrganizationJsonLd() {
  const { officialNaming } = await getAbout();
  const [state, ...others] = officialNaming.names;
  const orgId = `${site.url}/#organization`;

  const organization = {
    "@context": "https://schema.org",
    "@type": "GovernmentOrganization",
    "@id": orgId,
    name: site.operator,
    legalName: state?.full,
    alternateName: [
      site.name,
      state?.short,
      ...others.flatMap((n) => [n.full, n.short]),
    ].filter(Boolean),
    url: site.url,
    logo: `${site.url}/logo-dm-light.svg`,
    description: site.description,
    email: contacts.email,
    telephone: contacts.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: contacts.address.street,
      addressLocality: contacts.address.city,
      postalCode: contacts.address.postalCode,
      addressCountry: "UZ",
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: contacts.hotline,
        contactType: "customer support",
        areaServed: "UZ",
        availableLanguage: ["uz", "ru", "en"],
      },
    ],
    parentOrganization: {
      "@type": "GovernmentOrganization",
      name: parentOrganization.name,
      url: parentOrganization.url,
    },
    sameAs: socialLinks.map((s) => s.href),
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${site.url}/#website`,
    name: site.name,
    alternateName: site.tagline,
    url: site.url,
    inLanguage: "uz",
    publisher: { "@id": orgId },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: scriptSafeJson(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: scriptSafeJson(website) }}
      />
    </>
  );
}

/**
 * JSON that cannot end the <script> element it is written into.
 *
 * NOT optional: the official names come from the "Markaz haqida" document,
 * which is editable in the panel, and JSON.stringify leaves `<` alone — so a
 * name containing `</script><script>…` would close this element and run on
 * every public page, past a CSP that allows inline scripts. That would turn
 * a content edit into script on every citizen's browser, breaking the
 * panel's plain-text rule (davijara-admin, rule 7). `<` is the same
 * character to a JSON parser and is never markup to the HTML one.
 */
function scriptSafeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
