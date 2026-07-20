import { contacts, relatedPlatforms, site } from "@/content/site";

/**
 * GovernmentOrganization structured data.
 *
 * Lets search engines render the operator, hotline and address as a knowledge
 * panel rather than inferring them from page text. The address here is the
 * reconciled one from content/site.ts — the two legacy pages disagreed, and
 * publishing a wrong address in machine-readable form would propagate it.
 */
export function OrganizationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "GovernmentOrganization",
    name: site.operator,
    alternateName: site.name,
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
    sameAs: relatedPlatforms,
  };

  return (
    <script
      type="application/ld+json"
      // Content is a static object we construct, not user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
