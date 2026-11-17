import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import type { Locale } from "@/i18n/routing";
import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { TranslationTerms } from "@/components/common/translation-notice";
import { placeholderMetadata } from "@/lib/placeholder-metadata";

/*
  The page's name lives in `messages/*.json` under `nav`, exactly once, and
  both the browser-tab title and the on-page heading read it from there — see
  the note on `navKey` in placeholder-page.tsx.
*/
const NAV_KEY = "terms";

/*
  Cached, not static-forever: this route serves whatever an editor has written
  for it in the panel (see components/layout/placeholder-page.tsx), so it has
  to be able to change without a deploy. `revalidatePath` in the panel's
  publish action clears it at once; this window is the backstop.
*/
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  // Out of search while the editor has written nothing — see the helper.
  return placeholderMetadata(locale, NAV_KEY);
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  /*
    The section on translations is the operator's own text (16.11.2026) and
    renders on /ru and /en only — see components/common/translation-notice.
  */
  return (
    <PlaceholderPage navKey={NAV_KEY} descriptionKey="terms">
      <TranslationTerms />
    </PlaceholderPage>
  );
}
