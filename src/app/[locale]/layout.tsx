import type { Metadata } from "next";
import { ViewTransition } from "react";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";

import { fontVariables } from "../fonts";
import { routing, type Locale } from "@/i18n/routing";
import { site } from "@/content/site";
import { OrganizationJsonLd } from "@/components/json-ld";
import { AccessibilityScript } from "@/components/layout/accessibility-script";
import { SkipLink } from "@/components/layout/skip-link";
import { Topbar } from "@/components/layout/topbar";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { BottomNav } from "@/components/layout/bottom-nav";
import { ScrollToTop } from "@/components/layout/scroll-to-top";
import "../globals.css";

/**
 * Prerender all three locales at build time. Without this the pages would be
 * rendered on demand, since `[locale]` is a dynamic segment.
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });

  return {
    metadataBase: new URL(site.url),
    title: {
      default: t("title"),
      template: `%s — ${site.name}`,
    },
    description: t("description"),
    alternates: {
      canonical: `/${locale}`,
      // hreflang alternates — absent from the legacy site entirely.
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `/${l}`]),
      ) as Record<string, string>,
    },
    openGraph: {
      type: "website",
      siteName: site.name,
      locale,
      url: `/${locale}`,
      title: t("title"),
      description: t("description"),
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
    },
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        /*
          The short mark, not the wordmark. A 4.5:1 lockup letterboxes down to
          a few unreadable pixels in a browser tab; the mark is near-square and
          stays legible at 16px.
        */
        { url: "/logo-short-light.svg", type: "image/svg+xml" },
      ],
      apple: "/logo-short-light.svg",
    },
    robots: { index: true, follow: true },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // Next.js 16: route params are async and must be awaited.
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Opts this request into static rendering; required when using
  // generateStaticParams together with next-intl.
  setRequestLocale(locale as Locale);

  /*
    Send only the namespaces that CLIENT components actually read.

    Left to itself, NextIntlClientProvider serialises the entire message
    catalog into the HTML of every page — but almost everything here is a
    Server Component that resolves its strings during render and ships plain
    text. Only three client components need messages at runtime:

      nav-links     -> nav
      mobile-nav    -> nav, common
      lang-switcher -> topbar

    Everything else (hero, listings, privileges, footer …) is server-rendered.
    Scoping this keeps the payload flat as the catalog grows — which matters
    here, because ru.json and en.json are still mostly untranslated and will
    triple in size.
  */
  const messages = await getMessages();
  const clientMessages = {
    nav: messages.nav,
    common: messages.common,
    topbar: messages.topbar,
  };

  return (
    /*
      No height class on <html>. Capping the root element at viewport height
      while the body overflows it is a common source of scroll-container
      confusion — including for scroll-driven animations, which resolve
      `view()` against the nearest scrollport. `min-h-dvh` on the body gives
      the same "footer sits at the bottom on short pages" result without
      constraining the root.
    */
    <html lang={locale} className={fontVariables}>
      <head>
        {/* Must run before paint — see the component for why. */}
        <AccessibilityScript />
      </head>
      <body className="flex min-h-dvh flex-col">
        <OrganizationJsonLd />
        <NextIntlClientProvider messages={clientMessages}>
          <SkipLink />
          <Topbar />
          <Navbar />
          {/*
            Skip-link target. Wrapped in <ViewTransition> so route navigations
            cross-fade instead of snapping; the chrome around it stays put,
            which is what makes the transition read as "same site, new page".
          */}
          <div id="main" className="flex flex-1 flex-col">
            <ViewTransition default="cross-fade">{children}</ViewTransition>
          </div>
          <Footer />
          <ScrollToTop />
          <BottomNav />
          {/* Clears the fixed bottom nav so it never covers footer content. */}
          <div aria-hidden="true" className="h-16 lg:hidden" />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
