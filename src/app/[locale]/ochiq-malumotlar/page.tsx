import type { Locale } from "@/i18n/routing";
import { redirect } from "@/i18n/navigation";

/*
  There is no page at /ochiq-malumotlar — the open-data page itself lives at
  /malumotlar/ochiq-malumotlar, which is the URL the menu publishes and the
  one to keep.

  This route exists only because four real pages sit UNDER it
  (`murojaatlar` and the three legal-basis documents), so a reader who trims
  the last segment off one of their URLs lands here. It used to render
  `SectionIndexPage navKey="openData"`, but `openData` is a menu CHILD, not a
  section — `menu_sections` holds only centre/activity/documentsSection/Data/
  news — so the lookup never resolved and the page served a heading over an
  empty grid. Sending that reader to the real page beats both an empty page
  and a 404.

  Redirecting the bare path only; the four children are untouched.
*/
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/malumotlar/ochiq-malumotlar", locale: locale as Locale });
}
